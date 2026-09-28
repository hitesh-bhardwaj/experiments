"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import PixelateSvgFilter from "./PixelatedSvgFilter";
import { usePrefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SRC =
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg";
const DEFAULT_ALT = "Image";

interface SVGPixelRevealProps {
    src?: string;
    alt?: string;
    className?: string;
    imageClassName?: string;
    initialPixelSize?: number;
    finalPixelSize?: number;
    start?: string;
    end?: string;
    crossLayers?: boolean;
    priority?: boolean;
    intensity?: number;
}

export default function SVGPixelReveal({
    src = DEFAULT_SRC,
    alt = DEFAULT_ALT,
    className = "h-[50vh] w-[50vw]",
    imageClassName = "",
    intensity = 22,
    crossLayers = true,
    priority = false,
}: SVGPixelRevealProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const filterId = useId().replace(/:/g, "");
    const initialPixelSize = Math.max(2, intensity);
    const finalPixelSize = 1;
    const start = "top 50%";
    const end = "bottom 35%";
    const [pixelSize, setPixelSize] = useState(initialPixelSize);
    const [prevInitialPixelSize, setPrevInitialPixelSize] = useState(initialPixelSize);
    const reducedMotion = usePrefersReducedMotion();
    const shouldApplyFilter = pixelSize > finalPixelSize + 0.01;

    // Reset the displayed pixelSize whenever the initialPixelSize prop
    // changes, without clobbering the value the GSAP tween below drives via
    // onUpdate. Pure derived state (no browser API), so it's adjusted
    // directly during render instead of via an effect.
    if (initialPixelSize !== prevInitialPixelSize) {
        setPrevInitialPixelSize(initialPixelSize);
        setPixelSize(initialPixelSize);
    }

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return undefined;
        }

        const animatedState = { size: initialPixelSize };

        const tween = gsap.to(animatedState, {
            size: finalPixelSize,
            duration: 1.0,
            ease: "none",
            paused: true,
            onUpdate: () => {
                setPixelSize(animatedState.size);
            },
        });

        const trigger = ScrollTrigger.create({
            trigger: container,
            start,
            end,
            animation: tween,
            invalidateOnRefresh: true,
        });

        return () => {
            trigger.kill();
            tween.kill();
        };
    }, [end, finalPixelSize, initialPixelSize, start]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <PixelateSvgFilter
                id={filterId}
                size={pixelSize}
                crossLayers={crossLayers}
            />

            <div
                className="relative h-full w-full overflow-hidden"
                style={{ filter: shouldApplyFilter ? `url(#${filterId})` : undefined }}
            >
                <Image
                    src={src}
                    alt={alt}
                    fill
                    priority={priority}
                    className={`object-cover ${imageClassName}`.trim()}
                />
            </div>

            {reducedMotion && (
                <div
                    aria-live="polite"
                    className="fixed bottom-6 right-6 z-60 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-[#F8F8F3] p-6 text-center shadow-sm"
                >
                    <h2 className="text-[1.15vw] max-md:text-[3.5vw] max-[1025px]:text-[2vw] leading-none text-[#111111]">
                        This effect can&apos;t be reduced.
                    </h2>
                    <p className="mx-auto mt-4 text-sm leading-6 text-black/65">
                        Reduced motion is enabled, but this effect relies on a
                        continuous scroll-driven transition from pixelated to
                        sharp, and can&apos;t be simplified to a fade without
                        losing the effect entirely.
                    </p>
                </div>
            )}
        </div>
    );
}
