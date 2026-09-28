// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import Link from "next/link";

const MOBILE_BREAKPOINT = 640;
const MOBILE_HOLD_MS = 1000;
const DEFAULT_HREF = "#";
const STAGGER_STEP = 0.01;
// Preserve the dot's optical alignment with the template typeface.
const DOT_OPTICAL_OFFSET = "0.08em";
// Account for the extra descender space below the visible letters.
const TEXT_OPTICAL_OFFSET = "0.08em";

export type DotFillBtnProps = {
 btnText?: string;
 className?: string;
 textClassName?: string;
 staggerStep?: number;
 bgColor?: string;
 textColor?: string;
 fillColor?: string;
 hoverTextColor?: string;
 dotColor?: string;
} & ComponentPropsWithoutRef<typeof Link>;

const DotFillBtn = ({
 btnText ="",
 href = DEFAULT_HREF,
 className ="",
 textClassName ="",
 bgColor ="#ff6b00",
 textColor ="#ffffff",
 hoverTextColor ="#ff6b00",
 dotColor ="#ffffff",
 ...props
}: DotFillBtnProps) => {
 const textRef = useRef<HTMLSpanElement | null>(null);
 const [hovered, setHovered] = useState(false);
 const [isMobile, setIsMobile] = useState(false);
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
 const releaseTimeoutRef = useRef<number | null>(null);

 useEffect(() => {
 const el = textRef.current;
 if (!el) return;

 const sourceText = btnText ||"";
 el.innerHTML ="";

 [...sourceText].forEach((char, index) => {
 const span = document.createElement("span");
 span.textContent = char;
 span.style.transitionDelay = prefersReducedMotion ? "0s" : `${index * STAGGER_STEP}s`;

 if (char ===" ") {
 span.style.whiteSpace ="pre";
 }

 el.appendChild(span);
 });
 }, [btnText, prefersReducedMotion]);

    useEffect(() => {
        const el = textRef.current;
        if (!el) return;

        const spans = Array.from(el.children || []);
        spans.forEach((span) => {
            const spanEl = span as HTMLElement;
            spanEl.style.display = "inline-block";
            spanEl.style.position = "relative";
            spanEl.style.textShadow = "0px 1.3em currentColor";
            spanEl.style.transform = "translateY(0em) rotate(0.001deg)";
            spanEl.style.transition = prefersReducedMotion
                ? "none"
                : "transform 0.6s cubic-bezier(0.625, 0.05, 0, 1), color 0.6s cubic-bezier(0.625, 0.05, 0, 1)";
            spanEl.style.willChange = "transform";
        });
    }, [btnText, prefersReducedMotion]);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

        const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
            const matches = "matches" in event ? event.matches : ((event as any).currentTarget as MediaQueryList).matches;
            setPrefersReducedMotion(matches);
        };

        if (mediaQuery) {
            syncReducedMotion(mediaQuery);
            mediaQuery.addEventListener("change", syncReducedMotion);
        }

        return () => mediaQuery?.removeEventListener("change", syncReducedMotion);
    }, []);

    useEffect(() => {
        const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

        const syncIsMobile = (event: MediaQueryList | MediaQueryListEvent) => {
            const matches = "matches" in event ? event.matches : ((event as any).currentTarget as MediaQueryList).matches;
            setIsMobile(matches);
        };

        syncIsMobile(mediaQuery);
        mediaQuery.addEventListener("change", syncIsMobile);

        return () => mediaQuery.removeEventListener("change", syncIsMobile);
    }, []);

    useEffect(() => {
        return () => {
            if (releaseTimeoutRef.current) {
                window.clearTimeout(releaseTimeoutRef.current);
            }
        };
    }, []);

    const activate = () => {
        const el = textRef.current;
        if (el) {
            Array.from(el.children).forEach((span) => {
                (span as HTMLElement).style.transform = "translateY(-1.3em) rotate(0.001deg)";
            });
        }
        setHovered(true);
    };

    const deactivate = () => {
        const el = textRef.current;
        if (el) {
            Array.from(el.children).forEach((span) => {
                (span as HTMLElement).style.transform = "translateY(0em) rotate(0.001deg)";
            });
        }
        setHovered(false);
    };

    const handleMouseEnter = () => {
        if (isMobile) return;
        activate();
    };

    const handleMouseLeave = () => {
        if (isMobile) return;
        deactivate();
    };

    const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
        props.onPointerDown?.(event);

        if (!isMobile || event.pointerType === "mouse") {
            return;
        }

        if (releaseTimeoutRef.current) {
            window.clearTimeout(releaseTimeoutRef.current);
        }

        activate();

        releaseTimeoutRef.current = window.setTimeout(() => {
            deactivate();
            releaseTimeoutRef.current = null;
        }, MOBILE_HOLD_MS);
    };

    return (
        <Link
            href={href}
            {...props}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onPointerDown={handlePointerDown}
            className={`group relative flex w-fit items-center justify-center gap-[0.9vw] h-[3.5vw] px-[2vw] rounded-full overflow-hidden whitespace-nowrap no-underline font-medium text-[1.5vw] transition-colors border-white/20! duration-500 motion-reduce:transition-none max-[1025px]:gap-[1.6vw] max-[1025px]:h-[8vw] max-[1025px]:px-[3.5vw] max-[1025px]:text-[3vw] max-[1025px]:font-normal max-[1025px]:motion-reduce:transition-none max-md:gap-[2.4vw] max-md:h-[12vw] max-md:px-[5vw] max-md:text-[4.2vw] max-md:motion-reduce:transition-none ${className}`}
            style={{
                background: bgColor,
                color: hovered ? hoverTextColor : textColor,
            }}
        >
            {/* Keep the dot and intrinsic button sizing in normal flow. */}
            <span
                aria-hidden
                className="relative z-10 flex shrink-0 items-center justify-center w-[0.5vw] h-[0.5vw] max-[1025px]:w-[1.5vw] max-[1025px]:h-[1.5vw] max-md:w-[2.3vw] max-md:h-[2.3vw]"
                style={{ marginTop: DOT_OPTICAL_OFFSET }}
            >
                <span
                    className="absolute inset-0 rounded-full transition-transform duration-400 ease-in-out motion-reduce:transition-none max-[1025px]:motion-reduce:transition-none max-md:motion-reduce:transition-none"
                    style={{
                        background: dotColor,
                        transform: hovered ? "scale(120)" : "scale(1)",
                        transitionTimingFunction: "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
                    }}
                />
            </span>

            <span aria-hidden="true" className={`invisible block h-[1.3em] leading-[1.3] ${textClassName}`}>
                {btnText}
            </span>
            {/* Centre the animation mask on the button itself. Its height
                matches the 1.3em character animation distance. */}
            <span
                className={`absolute left-1/2 top-1/2 z-20 block h-[1.3em] -translate-x-1/2 -translate-y-1/2 overflow-hidden ${textClassName}`}
                style={{ marginTop: TEXT_OPTICAL_OFFSET }}
            >
                <span ref={textRef} className="block leading-[1.3]" aria-hidden={false}>
                    {btnText}
                </span>
            </span>
            <span
                aria-hidden="true"
                className="block shrink-0 w-[0.5vw] max-[1025px]:w-[1.5vw] max-md:w-[2.3vw]"
            />
        </Link>
    );
};

export default DotFillBtn;
