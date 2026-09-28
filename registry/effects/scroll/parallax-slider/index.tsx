// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// True when the user has asked the OS to minimise animation. Safe to call
// during render - returns false on the server.
function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

// Reduced motion: the main horizontal track scroll stays untouched (it's the
// functional mechanism for navigating slides, not decorative). The per-image
// parallax (x shift + scale) is reduced, not removed, and the one-time
// clip-path reveal loses its eased curve in favor of a linear one.
const REDUCED_MOTION_FACTOR = 0.25;
const PARALLAX_SCALE = 1.25;

const PAD_X = "5vw";

interface ParallaxSliderProps {
    images?: string[];
    bgColor?: string;
    parallaxAmount?: number;
    slideGap?: number;
    scrub?: number | boolean;
}

const DEFAULT_IMAGES = [
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
];

function ParallaxSlider({
    images = DEFAULT_IMAGES,
    bgColor = "#111111",
    parallaxAmount = 25,
    slideGap = 1.6,
    scrub = 1,
}: ParallaxSliderProps) {
    const outerRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);

    /** Dynamic height */
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

    /** GSAP logic */
    useEffect(() => {
        const outer = outerRef.current;
        const track = trackRef.current;
        if (!outer || !track) return;

        const reducedMotion = prefersReducedMotion();

        const ctx = gsap.context(() => {
            /** Main horizontal animation - functional navigation, untouched by
             * reduced motion. */
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

            /** Clip-path reveal */
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
                        // markers: true,
                    },
                }
            );

            /** Individual parallax per image - reduced, not removed, for
             * reduced motion. */
            const slides = gsap.utils.toArray(".parallax-img") as HTMLElement[];
            const parallaxRange = reducedMotion ? parallaxAmount * REDUCED_MOTION_FACTOR : parallaxAmount;
            const parallaxScaleValue = reducedMotion
                ? 1 + (PARALLAX_SCALE - 1) * REDUCED_MOTION_FACTOR
                : PARALLAX_SCALE;

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
            style={{ height: "400vh", backgroundColor: bgColor }}
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
                                <img src={src} alt={`Slide ${i + 1}`} className="absolute inset-0 object-cover parallax-img w-full h-full " draggable={false} />

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
