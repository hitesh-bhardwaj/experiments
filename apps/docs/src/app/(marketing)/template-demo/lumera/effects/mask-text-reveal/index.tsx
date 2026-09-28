// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { useEffect, useRef, type ReactNode } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { prefersReducedMotion } from "../../reducedMotion";

gsap.registerPlugin(SplitText, ScrollTrigger);

// `document.fonts.ready` waits on every face on the page, holding copy at
// opacity 0 the whole time. Faces are `font-display: swap`, so text is already
// painting in the fallback by the time this cap fires.
const FONT_WAIT_CAP = 300;

const DEFAULT_TEXT = <p className="text-2xl">Pull the words from the noise.</p>;

interface MaskTextRevealProps {
  children?: ReactNode;
  animateOnScroll?: boolean;
  stagger?: number;
  duration?: number;
  delay?: number;
  className?: string;
  scrub?: boolean;
  /**
   * Paint the copy in the server HTML instead of hiding it until JS reveals it.
   * Set on above-the-fold text so it can be the LCP element: the mask still
   * animates, it just animates from a visible state.
   */
  eager?: boolean;
}

export default function MaskTextReveal({
    children = DEFAULT_TEXT,
    animateOnScroll = true,
    stagger = 0.2,
    duration = 5.5,
    delay = 0,
    className = "",
    scrub = false,
    eager = false,
}: MaskTextRevealProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const splitRefs = useRef<any[]>([]);
    const linesRef = useRef<HTMLElement[]>([]);
    const triggersRef = useRef<any[]>([]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        splitRefs.current = [];
        linesRef.current = [];
        triggersRef.current = [];

        const elements = Array.from(el.children) as HTMLElement[];

        let unmounted = false;
        let fontTimer: number | undefined;
        let deferredObserver: IntersectionObserver | null = null;

        // Wait only on the faces this element actually renders in, capped so a
        // slow font can never block the reveal.
        const waitForFonts = () =>
            new Promise<void>((resolve) => {
                const fonts = document.fonts;
                if (!fonts) {
                    resolve();
                    return;
                }

                let done = false;
                const runOnce = () => {
                    if (done) return;
                    done = true;
                    window.clearTimeout(fontTimer);
                    resolve();
                };

                const { fontFamily, fontWeight, fontSize } = getComputedStyle(el);
                try {
                    fonts.load(`${fontWeight} ${fontSize} ${fontFamily}`).then(runOnce, runOnce);
                } catch {
                    // Malformed shorthand: fall back to the whole-page promise
                    fonts.ready.then(runOnce, runOnce);
                }

                fontTimer = window.setTimeout(runOnce, FONT_WAIT_CAP);
            });

        // SplitText forces a synchronous layout read per element, so splitting
        // every instance on mount is the main Style & Layout cost. Copy far
        // from the viewport waits, with enough margin that the reveal is still
        // set up well before it scrolls into view.
        const waitForViewport = () =>
            new Promise<void>((resolve) => {
                const box = el.getBoundingClientRect();
                const nearViewport =
                    box.top < window.innerHeight * 1.5 && box.bottom > -window.innerHeight;

                if (nearViewport) {
                    resolve();
                    return;
                }

                deferredObserver = new IntersectionObserver(
                    ([entry], obs) => {
                        if (!entry.isIntersecting) return;
                        obs.disconnect();
                        deferredObserver = null;
                        resolve();
                    },
                    { rootMargin: "200% 0px" },
                );
                deferredObserver.observe(el);
            });

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

        (async () => {
            await waitForViewport();
            if (unmounted) return;

            if (!eager) {
                await waitForFonts();
                if (unmounted) return;
            }

            forceAriaVisible(el);

            if (prefersReducedMotion()) {
                // Eager copy is already painted; fading it in from 0 would
                // undo that and hand LCP back to the animation.
                if (eager) return;
                gsap.set(el, { opacity: 0 });

                const tween = gsap.to(el, {
                    opacity: 1,
                    duration: Math.min(duration, 0.4),
                    delay,
                    ease: "power1.out",
                    scrollTrigger: animateOnScroll
                        ? {
                            trigger: el,
                            start: "top 80%",
                            once: true,
                        }
                        : undefined,
                });

                if (tween?.scrollTrigger) {
                    triggersRef.current.push(tween.scrollTrigger);
                }
                return;
            }

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
                const tween = gsap.to(linesRef.current, {
                    ...animationProps,
                    scrollTrigger: {
                        trigger: el,
                        start: "top 80%",
                        once: scrub ? false : true,
                        scrub: scrub,
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
            window.clearTimeout(fontTimer);
            deferredObserver?.disconnect();

            triggersRef.current.forEach((trigger) => trigger?.kill());
            triggersRef.current = [];

            splitRefs.current.forEach((split) => split?.revert());
            splitRefs.current = [];

            linesRef.current = [];
        };
    }, [animateOnScroll, delay, duration, scrub, stagger, eager]);

    return (
        <div
            ref={containerRef}
            data-copy-wrapper="true"
            className={`${eager ? "" : "opacity-0"} ${className}`.trim()}
        >
            {children}
        </div>
    );
}
