// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useEffect, useId, useRef, useState } from "react";


export function PixelateSvgFilter({
 id ="pixelate-filter",
 size: propSize = 16,
}) {
 const size = Math.max(2, propSize);
 return (
 <svg
 aria-hidden="true"
 className="pointer-events-none absolute h-0 w-0 overflow-hidden"
 >
 <defs>
 <filter id={id} x="0" y="0" width="1" height="1">
 <feConvolveMatrix
 kernelMatrix="1 1 1
 1 1 1
 1 1 1"
 result="AVG"
 />

 <feFlood x="1" y="1" width="1" height="1" />

 <feComposite
 operator="arithmetic"
 k1="0"
 k2="1"
 k3="0"
 k4="0"
 width={size}
 height={size}
 />

 <feTile result="TILE" />

 <feComposite
 in="AVG"
 in2="TILE"
 operator="in"
 />

 <feMorphology
 operator="dilate"
 radius={size / 2}
 result="NORMAL"
 />

 </filter>
 </defs>
 </svg>
 );
}

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_SRC =
    "https://picsum.photos/seed/v01/1600/1200";
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
    priority?: boolean;
    intensity?: number;
    scrub?: boolean;
    duration?: number;
}

export default function SVGPixelReveal({
    src = DEFAULT_SRC,
    alt = DEFAULT_ALT,
    className = "h-[50vh] w-[50vw]",
    imageClassName = "",
    intensity = 22,
    priority = false,
    scrub = true,
    duration = 1.5,
}: SVGPixelRevealProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const filterId = useId().replace(/:/g, "");
    const initialPixelSize = Math.max(2, intensity);
    const finalPixelSize = 1;
    const start = scrub ? "top 85%" : "top 70%";
    const end = "bottom 40%";
    const [pixelSize, setPixelSize] = useState(initialPixelSize);
    const [prevInitialPixelSize, setPrevInitialPixelSize] = useState(initialPixelSize);
    const shouldApplyFilter = pixelSize > finalPixelSize + 0.01;

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

        setPixelSize(initialPixelSize);

        const tween = gsap.to(animatedState, {
            size: finalPixelSize,
            duration: scrub ? 1 : Math.max(0.1, duration),
            ease: scrub ? "none" : "power2.out",
            paused: true,
            onUpdate: () => {
                setPixelSize(animatedState.size);
            },
        });

        const trigger = scrub
            ? ScrollTrigger.create({
                  trigger: container,
                  start,
                  end,
                  scrub: true,
                  animation: tween,
                  invalidateOnRefresh: true,
              })
            : ScrollTrigger.create({
                  trigger: container,
                  start,
                  once: true,
                  onEnter: () => tween.play(),
              });

        return () => {
            trigger.kill();
            tween.kill();
        };
    }, [end, finalPixelSize, initialPixelSize, start, scrub, duration]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <PixelateSvgFilter
                id={filterId}
                size={pixelSize}
            />

            <div
                className="relative h-full w-full overflow-hidden"
                style={{ filter: shouldApplyFilter ? `url(#${filterId})` : undefined }}
            >
                <img
                    src={src}
                    alt={alt}
                    className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`.trim()}
                />
            </div>

        </div>
    );
}
