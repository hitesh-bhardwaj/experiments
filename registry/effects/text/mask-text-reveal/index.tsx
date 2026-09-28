// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { useEffect, useRef, type ReactNode } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

const DEFAULT_TEXT = <p className="text-2xl">Pull the words from the noise.</p>;

interface MaskTextRevealProps {
  children?: ReactNode;
  animateOnScroll?: boolean;
  stagger?: number;
  duration?: number;
  delay?: number;
  className?: string;
  scrub?: boolean;
}

export default function MaskTextReveal({
    children = DEFAULT_TEXT,
    animateOnScroll = true,
    stagger = 0.2,
    duration = 5.5,
    delay = 0,
    className = "",
    scrub = false,
}: MaskTextRevealProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const splitRefs = useRef<any[]>([]);
    const linesRef = useRef<HTMLElement[]>([]);
    const triggersRef = useRef<any[]>([]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const prefersReduced =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        splitRefs.current = [];
        linesRef.current = [];
        triggersRef.current = [];

        const elements = Array.from(el.children) as HTMLElement[];

        const waitForFonts = async () => {
            if (document.fonts && document.fonts.ready) {
                try {
                    await document.fonts.ready;
                } catch { }
            }
        };

        const forceAriaVisible = (root?: Element) => {
            if (!root) return;
            const hidden = root.querySelectorAll('[aria-hidden="true"]');
            hidden.forEach((node) => node.setAttribute("aria-hidden", "false"));
        };

        const applyMaskStyles = (line?: HTMLElement) => {
            if (!line) return;

            line.style.maskSize = "500% 100%";
            line.style.maskImage = "linear-gradient(150deg, #e8e8e8 33.3%, rgba(255, 255, 255, 0) 66.6%)";
        };

        let unmounted = false;

        (async () => {
            await waitForFonts();
            if (unmounted) return;

            elements.forEach((element) => {
                const split = SplitText.create(element, {
                    type: "lines",
                    linesClass: "Headingline++",
                    lineThreshold: 0.1,
                });

                splitRefs.current.push(split);

                const textIndent = getComputedStyle(element).textIndent;
                if (textIndent && textIndent !== "0px" && split.lines.length > 0) {
                    (split.lines[0] as HTMLElement).style.paddingLeft = textIndent;
                    element.style.textIndent = "0";
                }

                (split.lines as HTMLElement[]).forEach(applyMaskStyles);

                forceAriaVisible(element);
                linesRef.current.push(...(split.lines as HTMLElement[]));
            });

            if (!linesRef.current.length) return;

            // The mask-position wipe is a clip reveal, not a translate/scale/
            // parallax motion - subtle enough to keep for reduced motion too.
            gsap.set(el, { opacity: 1 });

            gsap.set(linesRef.current, {
                maskPosition: "100% 100%",
            });

            const animationProps = {
                maskPosition: "0% 100%",
                stagger: stagger,
                duration: duration,
                ease: "power3.out",
                delay,
            };

            if (animateOnScroll) {
                // Reduced motion: always play once and never scrub - scrub
                // ties the reveal continuously to scroll position, which is
                // the kind of motion reduced-motion should still avoid, even
                // though the mask wipe itself is subtle enough to keep.
                const effectiveScrub = prefersReduced ? false : scrub;

                const tween = gsap.to(linesRef.current, {
                    ...animationProps,
                    scrollTrigger: {
                        trigger: el,
                        start: "top 80%",
                        once: effectiveScrub ? false : true,
                        scrub: effectiveScrub,
                        onEnter: () => elements.forEach(forceAriaVisible),
                    },
                });

                if (tween?.scrollTrigger) {
                    triggersRef.current.push(tween.scrollTrigger);
                }
            } else {
                gsap.to(linesRef.current, animationProps);
            }
        })();

        return () => {
            unmounted = true;

            triggersRef.current.forEach((trigger) => trigger?.kill());
            triggersRef.current = [];

            splitRefs.current.forEach((split) => split?.revert());
            splitRefs.current = [];

            linesRef.current = [];
        };
    }, [animateOnScroll, delay, duration, scrub, stagger]);

    return (
        <div
            ref={containerRef}
            data-copy-wrapper="true"
            className={`opacity-0 ${className}`.trim()}
        >
            {children}
        </div>
    );
}
