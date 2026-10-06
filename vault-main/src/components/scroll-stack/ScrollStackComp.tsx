"use client";

import React, { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface ScrollStackCard {
    id: number;
    title: string;
    description: string;
    bgColor: string;
    textColor: string;
    className?: string;
}

interface ScrollStackCompProps {
    cards?: ScrollStackCard[];
    sectionBgColor?: string;
    cardRadius?: number;
}

const ScrollStackComp = ({ cards = [], sectionBgColor = "#ffffff", cardRadius = 45 }: ScrollStackCompProps) => {
    const uid = useId().replace(/:/g, "");
    const sectionId = `state-${uid}`;
    const sectionRef = useRef<HTMLElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        rowRefs.current = rowRefs.current.slice(0, cards.length);
        cardRefs.current = cardRefs.current.slice(0, cards.length);

        if (globalThis.innerWidth <= 639) {
            cardRefs.current.filter(Boolean).forEach((card) => {
                gsap.set(card, {
                    autoAlpha: 1,
                    scale: 1,
                });
            });

            return undefined;
        }

        const ctx = gsap.context(() => {
            const reduceMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            const currentCards = cardRefs.current.filter(Boolean) as HTMLDivElement[];
            const currentRows = rowRefs.current.filter(Boolean) as HTMLDivElement[];

            currentCards.forEach((card, index) => {
                gsap.set(card, {
                    autoAlpha: 1,
                    // Reduced motion: skip the oversized starting scale, so
                    // there's no scale-down-while-stacking effect to animate.
                    scale: reduceMotion || index === 0 ? 1 : 1.1,
                    transformOrigin: "center center",
                });
            });

            currentCards.slice(0, -1).forEach((card, index) => {
                const nextRow = currentRows[index + 1];
                const nextCard = currentCards[index + 1];

                if (!nextRow || !nextCard) return;

                const handoff = gsap.timeline({
                    scrollTrigger: {
                        trigger: nextRow,
                        start: "top bottom+=20%",
                        end: "top top-=28%",
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                });

                if (!reduceMotion) {
                    handoff.to(
                        nextCard,
                        {
                            scale: 1,
                            ease: "none",
                        },
                        0
                    );
                }

                gsap.to(card, {
                    autoAlpha: 0,
                    ease: "none",
                    scrollTrigger: {
                        trigger: nextRow,
                        start: "top top+=14%",
                        end: "top top+=2%",
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                });
            });

            ScrollTrigger.refresh();
        }, sectionRef);

        return () => {
            ctx.revert();
        };
    }, [cards]);

    return (
        <section
            id={sectionId}
            ref={sectionRef}
            className={`main py-[7%] max-md:py-[15%] max-sm:py-[15%]`}
            style={{ backgroundColor: sectionBgColor }}
        >

            <h1 className="text-center text-[4vw] max-[1025px]:text-[5vw] max-md:text-[6.5vw] text-black">
                Scroll Stack
            </h1>
            <div className="wrap flex w-full flex-col items-center px-[5%] py-[10vw] tablet:gap-[5vw] max-md:gap-[6vw]">
                {cards.map((item, index) => (
                    <div
                        key={item.id}
                        ref={(el) => {
                            rowRefs.current[index] = el;
                        }}
                        className={`relative w-full min-h-[180vh] ${index === 0 ? "" : "mt-[-70vh]"
                            } max-md:mt-0 max-md:min-h-0`}
                    >
                        <div
                            className="sticky top-[15vh] max-md:static max-md:space-y-6!"
                            style={{ zIndex: index + 1 }}
                        >
                            <Card
                                cardRef={(el) => {
                                    cardRefs.current[index] = el;
                                }}
                                title={item.title}
                                description={item.description}
                                bgColor={item.bgColor}
                                textColor={item.textColor}
                                cardRadius={cardRadius}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ScrollStackComp;

interface CardProps {
    title: string;
    description: string;
    bgColor: string;
    textColor: string;
    cardRef: (el: HTMLDivElement | null) => void;
    cardRadius: number;
}

const Card = ({ title, description, bgColor, textColor, cardRef, cardRadius }: CardProps) => {
    return (
        <div
            ref={cardRef}
            className="fadeUp mx-auto flex h-[32vw] max-md:h-[38vh] max-sm:h-[50vh] w-[80%] max-sm:w-full items-center justify-between gap-[4vw] rounded-[var(--card-radius)] px-[4vw] py-[3vw] tablet:h-[65vh] tablet:flex-col tablet:justify-center tablet:gap-[4vw] tablet:rounded-[4vw] tablet:py-[5vw] max-md:py-[8vw] max-sm:py-[15vw] max-sm:px-[8vw] max-sm:min-h-[50vw] max-md:flex-col max-sm:rounded-[9vw] "
            style={{ backgroundColor: bgColor, "--card-radius": `${cardRadius}px` } as React.CSSProperties}
        >
            <div className="w-[48%] tablet:w-full max-md:w-full max-[1025px]:w-[80%] max-[1025px]:mx-auto">
                <h2
                    className="para-animation max-[1025px]:text-center w-full text-[5.1vw] font-medium leading-[1.1] tablet:text-[5vw] max-md:text-[10vw]"
                    style={{ color: textColor }}
                >
                    {title}
                </h2>
            </div>

            <div className="flex w-[48%] flex-col items-left justify-center gap-[2vw] font-light tablet:w-full max-md:w-full max-[1025px]:w-[90%] max-[1025px]:mx-auto max-md:gap-[7vw]">
                <p
                    className="w-full text-justify text-[1.3vw] leading-normal max-[1025px]:leading-[1.2] tablet:text-[2.2vw] max-md:w-full max-[1025px]:text-center max-md:text-[4.5vw] max-[1025px]:text-[3vw]"
                    style={{ color: textColor }}
                >
                    {description}
                </p>
            </div>
        </div>
    );
};
