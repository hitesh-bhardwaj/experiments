// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const REDUCED_MOTION_FACTOR = 0.25;
const PARALLAX_SCALE_MARGIN = 1.1;

const PAD_X = "5vw";

interface ParallaxSliderProps {
    images?: string[];
    parallaxAmount?: number;
    slideGap?: number;
    scrub?: number | boolean;
}

const DEFAULT_IMAGES = [
    "https://picsum.photos/seed/h01/1600/1200",
    "https://picsum.photos/seed/h02/1600/1200",
    "https://picsum.photos/seed/h03/1600/1200",
    "https://picsum.photos/seed/h07/1600/1200",
    "https://picsum.photos/seed/h05/1600/1200",
    "https://picsum.photos/seed/h06/1600/1200",
];

function ParallaxSlider({
    images = DEFAULT_IMAGES,
    parallaxAmount = 25,
    slideGap = 1.6,
    scrub = 1,
}: ParallaxSliderProps) {
    const outerRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const outer = outerRef.current;
        const track = trackRef.current;
        if (!outer || !track) return;

        const update = () => {
            const travel = track.scrollWidth - window.innerWidth;
            outer.style.height = `${travel + window.innerHeight}px`;
        };

        update();

        const ro = new ResizeObserver(update);
        ro.observe(track);
        window.addEventListener("resize", update);

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", update);
        };
    }, [slideGap]);

    useEffect(() => {
        const outer = outerRef.current;
        const track = trackRef.current;
        if (!outer || !track) return;

        const reducedMotion = prefersReducedMotion();

        const ctx = gsap.context(() => {
            const horizontalTween = gsap.to(track, {
                x: () => -(track.scrollWidth - window.innerWidth),
                ease: "none",
                scrollTrigger: {
                    trigger: outer,
                    start: "top top",
                    end: () => `+=${track.scrollWidth - window.innerWidth}`,
                    scrub,
                    invalidateOnRefresh: true,
                },
            });

            const slideWrappers = gsap.utils.toArray(".slide-wrapper") as HTMLElement[];

            gsap.fromTo(
                slideWrappers,
                { clipPath: "inset(0 100% 0 0)" },
                {
                    clipPath: "inset(0 0% 0 0)",
                    ease: reducedMotion ? "none" : "power3.inOut",
                    duration: 0.6,
                    scrollTrigger: {
                        trigger: outer,
                        start: "5% bottom",
                        toggleActions: "play none none none",
                    },
                }
            );

            const slides = gsap.utils.toArray(".parallax-img") as HTMLElement[];
            const parallaxRange = reducedMotion ? parallaxAmount * REDUCED_MOTION_FACTOR : parallaxAmount;
            const parallaxScaleValue = 1 + (parallaxRange / 100) * 2 * PARALLAX_SCALE_MARGIN;

            slides.forEach((el) => {
                gsap.fromTo(
                    el,
                    { x: `-${parallaxRange}%`, scale: parallaxScaleValue },
                    {
                        x: `${parallaxRange}%`,
                        scale: parallaxScaleValue,
                        ease: "none",
                        scrollTrigger: {
                            trigger: el,
                            containerAnimation: horizontalTween,
                            start: "left right",
                            end: "right left",
                            scrub: true,
                        },
                    }
                );
            });
        }, outer);

        return () => ctx.revert();
    }, [parallaxAmount, scrub]);

    return (
        <div
            ref={outerRef}
            className="relative"
            style={{ height: "400vh", backgroundColor: "#111111" }}
        >
            <div className="sticky top-0 h-screen overflow-hidden flex items-center">
                <div
                    ref={trackRef}
                    className="flex items-center will-change-transform"
                    style={{
                        gap: `${slideGap}vw`,
                        paddingLeft: PAD_X,
                        paddingRight: PAD_X,
                    }}
                >
                    {images.map((src, i) => {
                        const isWide = i % 2 === 0;
                        const slideClass = isWide
                            ? "max-md:w-[80vw] max-md:h-[50vh] w-[65vw] h-[43vw]"
                            : "max-md:w-[45vw] max-md:h-[50vh] w-[33vw] h-[43vw]";

                        return (
                            <div
                                key={src}
                                className={`slide-wrapper relative shrink-0 overflow-hidden ${slideClass}`}
                                style={{
                                    borderRadius: 0,
                                    clipPath: "inset(0 100% 0 0)",
                                }}
                            >
                                <img
                                    src={src}
                                    alt={`Slide ${i + 1}`}
                                    className="absolute inset-0 h-full w-full object-cover parallax-img"
                                    draggable={false}
                                />

                                <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default ParallaxSlider;
