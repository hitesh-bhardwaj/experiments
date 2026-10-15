// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { useEffect, useRef, useSyncExternalStore } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SRC =
    "https://picsum.photos/seed/v05/1600/1200";

function toPercent(value: string | number) {
    const numeric = typeof value === "number" ? value : parseFloat(value);
    return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

interface ParallaxImageAnimationProps {
    src?: string;
    alt?: string;
    wrapperClassName?: string;
    imageClassName?: string;
    width?: number;
    height?: number;
    translateY?: string | number;
    start?: string;
    end?: string;
    enableScale?: boolean;
    scaleFrom?: number;
    scaleTo?: number;
}

const ParallaxImageAnimation = ({
    src = DEFAULT_SRC,
    alt = "parallax-img",
    wrapperClassName = "h-[50vh] w-[50vw]",
    imageClassName = "",
    width = 700,
    height = 1000,
    translateY = 30,
    start = "top bottom",
    end = "bottom top",
    enableScale = false,
    scaleFrom = 1.6,
    scaleTo = 1.2,
}: ParallaxImageAnimationProps) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const travel = toPercent(translateY);

    useEffect(() => {
        const image = imageRef.current;
        if (!wrapperRef.current || !image) return;

        if (prefersReducedMotion()) {
            gsap.set(image, { yPercent: 0, scale: 1 });
            return () => gsap.set(image, { clearProps: "transform" });
        }

        const coverScale = 1 + (2 * travel) / 100;

        const ctx = gsap.context(() => {
            gsap.fromTo(
                image,
                {
                    yPercent: -travel,
                    scale: enableScale ? scaleFrom : coverScale,
                },
                {
                    yPercent: travel,
                    scale: enableScale ? scaleTo : coverScale,
                    ease: "none",
                    scrollTrigger: {
                        trigger: wrapperRef.current,
                        start,
                        end,
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                }
            );
        }, wrapperRef);

        return () => ctx.revert();
    }, [travel, start, end, enableScale, scaleFrom, scaleTo]);

    return (
        <div ref={wrapperRef} className={`overflow-hidden ${wrapperClassName}`}>
            <img
                ref={imageRef}
                width={width}
                height={height}
                src={src}
                alt={alt}
                className={`w-full h-full object-cover ${imageClassName}`}
            />
        </div>
    );
};

export default ParallaxImageAnimation;