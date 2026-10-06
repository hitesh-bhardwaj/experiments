// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { prefersReducedMotion } from "../../Animations/reducedMotion";

gsap.registerPlugin(ScrollTrigger);

// Reduced motion: weaker, not removed
const REDUCED_MOTION_FACTOR = 0.25;
const DEFAULT_SRC =
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg";

function reduceOffset(value: string | number, factor: number) {
    if (typeof value !== "string") return value;
    const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
    if (!match) return value;
    const [, numeric, unit] = match;
    return `${(parseFloat(numeric) * factor).toFixed(2)}${unit}`;
}

function reduceScale(value: number, factor: number) {
    if (typeof value !== "number") return value;
    return 1 + (value - 1) * factor;
}

interface ParallaxImageAnimationProps {
    src?: string;
    alt?: string;
    wrapperClassName?: string;
    imageClassName?: string;
    width?: number;
    height?: number;
    quality?: number;
    sizes?: string;
    translateY?: string | number;
    start?: string;
    end?: string;
    scrub?: boolean | number;
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
    quality = 90,
    sizes = "100vw",
    translateY = "30%",
    start = "top bottom",
    end = "bottom top",
    scrub = true,
    enableScale = false,
    scaleFrom = 1.6,
    scaleTo = 1.2,
}: ParallaxImageAnimationProps) => {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const reducedMotion = prefersReducedMotion();
    const effectiveTranslateY = reducedMotion
        ? reduceOffset(translateY, REDUCED_MOTION_FACTOR)
        : translateY;
    const effectiveScaleFrom = reducedMotion
        ? reduceScale(scaleFrom, REDUCED_MOTION_FACTOR)
        : scaleFrom;
    const effectiveScaleTo = reducedMotion
        ? reduceScale(scaleTo, REDUCED_MOTION_FACTOR)
        : scaleTo;

    useEffect(() => {
        if (!wrapperRef.current || !imageRef.current) return;

        const ctx = gsap.context(() => {
            gsap.set(imageRef.current, {
                scale: enableScale ? effectiveScaleFrom : undefined,
            });

            gsap.to(imageRef.current, {
                translateY: effectiveTranslateY,
                scale: enableScale ? effectiveScaleTo : undefined,
                ease: "none",
                scrollTrigger: {
                    trigger: wrapperRef.current,
                    start,
                    end,
                    scrub,
               
                },
            });
        }, wrapperRef);

        return () => ctx.revert();
    }, [effectiveTranslateY, start, end, scrub, enableScale, effectiveScaleFrom, effectiveScaleTo]);

    return (
        <div ref={wrapperRef} className={`overflow-hidden ${wrapperClassName}`}>
            <Image
                ref={imageRef}
                width={width}
                height={height}
                src={src}
                alt={alt}
                quality={quality}
                sizes={sizes}
                className={`w-full h-full translate-y-[-5%] object-cover scale-110 ${imageClassName}`}
            />
        </div>
    );
};

export default ParallaxImageAnimation;
