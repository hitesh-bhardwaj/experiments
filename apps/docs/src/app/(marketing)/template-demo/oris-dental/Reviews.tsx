"use client";

import gsap from "gsap";
import Image from "next/image";
import React, { useEffect, useId, useRef } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SplitText from "gsap/dist/SplitText";
import TextFill from "./effects/text-fill/TextFill";
import review1 from "./assets/reviews/1.webp";
import review2 from "./assets/reviews/2.webp";
import review3 from "./assets/reviews/3.webp";
import review4 from "./assets/reviews/4.webp";
import review5 from "./assets/reviews/5.webp";
import review6 from "./assets/reviews/6.webp";
import review7 from "./assets/reviews/7.webp";
import review8 from "./assets/reviews/8.webp";
import review9 from "./assets/reviews/9.webp";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText);
}

const REVIEW_IMAGES = [
    review1,
    review2,
    review3,
    review4,
    review5,
    review6,
    review7,
    review8,
    review9,
];

const PATIENT_NAMES = [
    "Sarah Jenkins",
    "Michael Chang",
    "Emma Watson",
    "Rachel Patel",
    "Aria Lin",
    "Thomas Brooks",
    "Marcus Wright",
    "Arthur Chen",
    "Ananya Gupta",
];

type RibbonReviewCard = HTMLElement & {
    _onEnter?: () => void;
    _onLeave?: () => void;
};

function buildCards(count: number, startIndex = 0) {
    return Array.from({ length: count }, (_, i) => {
        const idx = (startIndex + i) % REVIEW_IMAGES.length;
        const name = PATIENT_NAMES[(startIndex + i) % PATIENT_NAMES.length];
        return { src: REVIEW_IMAGES[idx], title: name, href: "#" };
    });
}

const sectionBreakText = `From modern treatment rooms to advanced sterilization systems, every space is designed around patient comfort, clinical excellence, and lasting trust.`;

export default function Reviews({
    driftSpeed = 1,
    ribbonColor = "#3365e2",
    showNames = true,
}: {
    driftSpeed?: number;
    ribbonColor?: string;
    showNames?: boolean;
}) {
    const uid = useId().replace(/:/g, "");
    const sectionId = `oris-reviews-${uid}`;
    const titleRefs = useRef<(HTMLParagraphElement | null)[]>([]);
    const hoverSplitsRef = useRef<any[]>([]);

    useEffect(() => {
        const speedScale = 1 / Math.max(0.05, driftSpeed);

        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia();

            mm.add("(min-width: 1025px)", () => {
                const allTitles = titleRefs.current.filter(Boolean);
                const cards =
                    gsap.utils.toArray<RibbonReviewCard>(".project-card");

                hoverSplitsRef.current = allTitles.map((el) => {
                    const split = new SplitText(el, {
                        type: "chars",
                        charsClass: "project-char",
                    });

                    gsap.set(allTitles, { opacity: 1 });
                    gsap.set(split.chars, {
                        yPercent: 120,
                        opacity: 0,
                        force3D: true,
                    });

                    return split;
                });

                gsap.set(".mid-strip", { yPercent: -80, scale: 0.5 });
                gsap.set(".left-strip", { yPercent: 3, scale: 0.5 });
                gsap.set(".right-strip", { yPercent: 3, scale: 0.5 });
                gsap.set(".section-break-wrapper", { scale: 0.82, opacity: 0 });
                gsap.set(".reviews-bg-heading", { scale: 0.9, autoAlpha: 0.2 });

                cards.forEach((card, index) => {
                    const image = card.querySelector(".project-image");
                    if (!image) return;

                    gsap.set(image, {
                        force3D: true,
                        scale: 1,
                        opacity: 1,
                    });

                    const split = hoverSplitsRef.current[index];
                    if (!split) return;

                    const onEnter = () => {
                        gsap.killTweensOf(image);
                        gsap.killTweensOf(split.chars);
                        gsap.to(split.chars, {
                            yPercent: 0,
                            opacity: 1,
                            stagger: 0.02,
                            duration: 0.45 * speedScale,
                            ease: "power3.out",
                            overwrite: true,
                        });
                    };

                    const onLeave = () => {
                        gsap.killTweensOf(image);
                        gsap.killTweensOf(split.chars);
                        gsap.to(split.chars, {
                            yPercent: 120,
                            opacity: 0,
                            stagger: 0.015,
                            duration: 0.35 * speedScale,
                            ease: "power3.in",
                            overwrite: true,
                        });
                    };

                    card.addEventListener("mouseenter", onEnter);
                    card.addEventListener("mouseleave", onLeave);

                    card._onEnter = onEnter;
                    card._onLeave = onLeave;
                });

                // Unified single timeline across the 500vh scroll with proper proportional phases
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: `#${sectionId}`,
                        start: "-8% top",
                        end: "bottom bottom",
                        scrub: true,
                        // markers:true
                    },
                });

                // Total timeline duration = 12 units:
                // Phase 1 (0 -> 4.5): Ribbon Strips Drift & Scale up + Background heading scale
                tl.to(".reviews-bg-heading", { scale: 1, ease: "none", duration: 3.5 }, 0);
                tl.to(".left-strip", { yPercent: -77, scale: 1, ease: "none", duration: 4.5 }, 0);
                tl.to(".mid-strip", { yPercent: -4.5, scale: 1, ease: "none", duration: 4.5 }, 0);
                tl.to(".right-strip", { yPercent: -77, scale: 1, ease: "none", duration: 4.5 }, 0);

                // Background heading fades out smoothly before paragraph comes in
                tl.to(
                    ".reviews-bg-heading",
                    {
                        autoAlpha: 0,
                        duration: 1.5 * speedScale,
                        ease: "power2.inOut",
                    },
                    3.2
                );

                // Phase 2 (3.8 -> 6.8): Strips part outwards and center cards split up/down with smooth, gradual easing
                tl.to(
                    ".left-strip",
                    {
                        xPercent: -180,
                        duration: 2.8 * speedScale,
                        ease: "power2.inOut",
                    },
                    3.8
                );
                tl.to(
                    ".right-strip",
                    {
                        xPercent: 180,
                        duration: 2.8 * speedScale,
                        ease: "power2.inOut",
                    },
                    3.8
                );
                tl.to(
                    ".card-1",
                    {
                        yPercent: -130,
                        duration: 2.8 * speedScale,
                        ease: "power2.inOut",
                    },
                    3.8
                );
                tl.to(
                    ".card-2",
                    {
                        yPercent: 130,
                        duration: 2.8 * speedScale,
                        ease: "power2.inOut",
                    },
                    3.8
                );

                // Phase 3 (5.2 -> 6.6): Section break statement wrapper scales & reveals smoothly
                tl.to(
                    ".section-break-wrapper",
                    {
                        scale: 1,
                        opacity: 1,
                        duration: 1.4 * speedScale,
                        ease: "power2.out",
                    },
                    5
                );

                // Phase 4 & 5 (6.8 -> 12.0): Generous pinned hold time for TextFill to complete and comfortable reading
                tl.to({}, { duration: 3 }, 3);

                return () => {
                    cards.forEach((card) => {
                        if (card._onEnter) {
                            card.removeEventListener("mouseenter", card._onEnter);
                        }
                        if (card._onLeave) {
                            card.removeEventListener("mouseleave", card._onLeave);
                        }
                    });

                    hoverSplitsRef.current.forEach((split) => split?.revert());
                };
            });

            return () => {
                mm.revert();
            };
        });

        return () => ctx.revert();
    }, [sectionId, driftSpeed, showNames]);

    let titleIndex = 0;

    const allCards = buildCards(22, 0);
    const leftCards = allCards.slice(0, 8);
    const midCards = allCards.slice(8, 14);
    const rightCards = allCards.slice(14, 22);
    const compactCards = allCards.slice(0, 9);

    return (
        <>
            <div
                className="w-full h-[500vh] bg-white text-oris-secondary max-[1025px]:hidden relative z-10 overflow-clip"
                id={sectionId}
            >
                {/* Background Big Heading Layer */}
                <div className="w-full h-screen sticky top-0 flex justify-center items-center pointer-events-none z-1 overflow-hidden">
                    <h2
                        style={{ opacity: 0.2 }}
                        className="reviews-bg-heading text-[13vw] font-medium tracking-tight text-oris-secondary leading-[1]! opacity-20 uppercase select-none text-center"
                    >
                     HAPPY
                     <br />
                      CLIENTS
                    </h2>
                </div>

                {/* Ribbon Strips Layer */}
                <div className="w-full h-screen sticky top-0 -mt-[100vh] flex justify-between px-[7vw] portfolio-card-container z-2 overflow-hidden">
                    {/* Left Strip */}
                    <div className="w-[23vw] h-fit flex flex-col gap-[4vw] items-center left-strip">
                        {leftCards.map((item, index) => {
                            const currentIndex = titleIndex++;

                            return (
                                <a
                                    href={item.href}
                                    key={`left-${index}`}
                                    className="project-card w-[90%] h-[27vw] portfolio-card overflow-hidden relative"
                                >
                                    <Image
                                        fill
                                        sizes="20vw"
                                        src={item.src}
                                        alt={item.title}
                                        className="project-image opacity-0 object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.15] ease-in-out"
                                    />

                                    {showNames && (
                                        <div className="absolute bottom-[8%] left-[8%] overflow-hidden pointer-events-none">
                                            <p
                                                ref={(el) => {
                                                    titleRefs.current[currentIndex] = el;
                                                }}
                                                className="text-white text-[1.8vw] project-name font-medium leading-none opacity-0"
                                            >
                                                {item.title}
                                            </p>
                                        </div>
                                    )}
                                </a>
                            );
                        })}
                    </div>

                    {/* Mid Strip */}
                    <div className="w-[28%] h-fit flex flex-col gap-[7vw] items-center mid-strip">
                        {midCards.map((item, index) => {
                            const currentIndex = titleIndex++;

                            return (
                                <a
                                    href={item.href}
                                    key={`mid-${index}`}
                                    className={`project-card w-[90%] h-[34vw] portfolio-card overflow-hidden relative ${index === 0 ? "card-1" : ""
                                        } ${index === 1 ? "card-2" : ""}`}
                                >
                                    <Image
                                        fill
                                        sizes="25vw"
                                        src={item.src}
                                        alt={item.title}
                                        className="project-image opacity-0 object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.15] ease-in-out"
                                    />

                                    {showNames && (
                                        <div className="absolute bottom-[8%] left-[8%] overflow-hidden pointer-events-none">
                                            <p
                                                ref={(el) => {
                                                    titleRefs.current[currentIndex] = el;
                                                }}
                                                className="text-white text-[2vw] project-name font-medium leading-none opacity-0"
                                            >
                                                {item.title}
                                            </p>
                                        </div>
                                    )}
                                </a>
                            );
                        })}
                    </div>

                    {/* Right Strip */}
                    <div className="w-[23vw] h-fit flex flex-col gap-[4vw] items-center right-strip">
                        {rightCards.map((item, index) => {
                            const currentIndex = titleIndex++;

                            return (
                                <a
                                    href={item.href}
                                    key={`right-${index}`}
                                    className="project-card w-[90%] h-[27vw] portfolio-card overflow-hidden relative"
                                >
                                    <Image
                                        fill
                                        sizes="20vw"
                                        src={item.src}
                                        alt={item.title}
                                        className="project-image opacity-0 object-cover hover:brightness-75 transition duration-500 cursor-pointer hover:scale-[1.15] ease-in-out"
                                    />

                                    {showNames && (
                                        <div className="absolute bottom-[8%] left-[8%] overflow-hidden pointer-events-none">
                                            <p
                                                ref={(el) => {
                                                    titleRefs.current[currentIndex] = el;
                                                }}
                                                className="text-white text-[1.8vw] project-name font-medium leading-none opacity-0"
                                            >
                                                {item.title}
                                            </p>
                                        </div>
                                    )}
                                </a>
                            );
                        })}
                    </div>
                </div>

                {/* Section Break Fill Reveal Layer */}
                <div className="w-full h-screen sticky top-0 section-break text-[3.5vw] leading-[1.2] flex justify-center items-center overflow-hidden pointer-events-none">
                    <div className="w-[75%] text-center relative section-break-wrapper">
                        <TextFill
                            as="p"
                            text={sectionBreakText}
                            className="section-break-content font-normal text-[3.5vw] leading-[1.2]"
                            primaryColor={ribbonColor}
                            textColor="#13314a"
                            dimColor="rgba(0, 0, 0, 0.2)"
                            trigger={`#${sectionId}`}
                            start="60% top"
                            end="80% top"
                        />
                    </div>
                </div>
            </div>

            {/* Responsive Layout for Tablet & Mobile */}
            <div className="hidden w-full bg-white text-oris-secondary max-[1025px]:block px-6 py-20 max-md:py-14">
                <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 max-md:gap-8">
                    {/* Header on Tablet / Mobile */}
                    <div className="flex flex-col items-center text-center">
                        <h2 className="max-[1025px]:text-[6vw] max-md:text-[7.5vw] font-normal leading-tight">
                            Reviews
                        </h2>
                        <p className="oris-text22 text-oris-secondary/80 mt-2 max-w-xl">
                            Real experiences and radiant smiles from patients who trust Oris Dental.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 max-md:grid-cols-2">
                        {compactCards.map((item, index) => (
                            <div
                                key={`compact-${index}`}
                                className="overflow-hidden rounded-xl relative aspect-[3/4]"
                            >
                                <Image
                                    fill
                                    sizes="(max-width: 768px) 50vw, 33vw"
                                    src={item.src}
                                    alt={item.title}
                                    className="object-cover"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl px-4 py-8 text-center bg-[#3365e2] mt-4">
                        <p className="oris-text22 max-md:w-full max-[1025px]:w-[90%] max-[1025px]:mx-auto max-md:text-base font-normal leading-[1.4] text-white">
                            {sectionBreakText}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
