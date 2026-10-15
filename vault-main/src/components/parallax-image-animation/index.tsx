"use client";

import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SRC =
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg";

/** Accepts 30, "30" or "30%" and returns the percentage as a number. */
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
    /**
     * Parallax travel as a percentage of the image height. The image starts
     * at -translateY% and ends at +translateY%.
     */
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

        // Reduced motion: the image sits still - no parallax, no scale.
        if (prefersReducedMotion()) {
            gsap.set(image, { yPercent: 0, scale: 1 });
            return () => gsap.set(image, { clearProps: "transform" });
        }

        // Without the scale animation, zoom the image just enough that the
        // +/- travel never reveals the wrapper's edges.
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
            <Image
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