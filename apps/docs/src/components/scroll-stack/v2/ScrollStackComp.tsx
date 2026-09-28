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

// How much each card shrinks by the time its row's trigger range ends -
// "just a bit", not a dramatic shrink. Tune this and the start/end values
// on the ScrollTrigger below together with markers:true showing exactly
// where each row's own trigger currently sits.
const STACK_SCALE_TARGET = 0.92;

const ScrollStackComp = ({ cards = [], sectionBgColor = "#ffffff", cardRadius = 45 }: ScrollStackCompProps) => {
    const uid = useId().replace(/:/g, "");
    const sectionId = `state-${uid}`;
    const sectionRef = useRef<HTMLElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        // Each card scales down against its OWN row's sticky range - trigger
        // is the row (the sticky positioning container), not the card
        // itself, so this tracks exactly how long that specific card stays
        // pinned before the next one scrolls over it. markers:true on every
        // one of these gives a labeled start/end line per card in the
        // browser so the exact scroll thresholds can be eyeballed and
        // tuned, rather than guessed at analytically from the nested
        // sticky offsets above (top-[20%] on the row, top-[15vh] on the
        // inner wrapper - two different reference frames, not simple to
        // reason about precisely from the numbers alone).
        const tweens = cardRefs.current.map((card, index) => {
            const row = rowRefs.current[index];
            if (!card || !row) return null;

            return gsap.to(card, {
                scale: STACK_SCALE_TARGET,
                ease: "none",
                scrollTrigger: {
                    trigger: row,
                    start: "top 30%",
                    end: "bottom top",
                    scrub: true,
                    // markers: true,
                    id: `stack-card-${index}`,
                },
            });
        });

        return () => {
            tweens.forEach((tween) => {
                tween?.scrollTrigger?.kill();
                tween?.kill();
            });
        };
    }, [cards.length]);

    return (
        <section
            id={sectionId}
            ref={sectionRef}
            className={`main py-[7%] h-fit max-md:py-[15%]`}
            style={{ backgroundColor: sectionBgColor }}
        >


            <h1 className="text-center text-[4vw] max-[1025px]:text-[5vw] max-md:text-[6.5vw] text-black">
                Scroll Stack
            </h1>
            <div className="wrap  flex w-full flex-col gap-[20vw] items-center px-[5%] py-[10vw] max-[1025px]:gap-[70vw]">
                {cards.map((item, index) => (
                    <div
                        key={item.id}
                        ref={(el) => {
                            rowRefs.current[index] = el;
                        }}
                        className={`w-full h-fit sticky top-[20%]`}
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
            className="fadeUp mx-auto flex h-[32vw] max-md:h-[50vh] w-[80%] max-md:w-full items-center justify-between gap-[4vw] rounded-[var(--card-radius)] px-[4vw] py-[3vw] max-[1025px]:h-[50vh] max-[1025px]:flex-col max-[1025px]:justify-center max-[1025px]:gap-[4vw] max-[1025px]:rounded-[4vw] max-[1025px]:py-[5vw] max-md:py-[15vw] max-md:px-[8vw] max-md:min-h-[50vw] max-md:flex-col "
            style={{ backgroundColor: bgColor, "--card-radius": `${cardRadius}px` } as React.CSSProperties}
        >
            <div className="w-[48%]  max-md:w-full max-[1025px]:w-[80%] max-[1025px]:mx-auto">
                <h2
                    className="para-animation max-[1025px]:text-center w-full text-[5.1vw] font-medium leading-[1.1] max-[1025px]:text-[5vw] max-md:text-[10vw]"
                    style={{ color: textColor }}
                >
                    {title}
                </h2>
            </div>

            <div className="flex w-[48%] flex-col items-left justify-center gap-[2vw] font-light max-md:w-full max-[1025px]:w-[90%] max-[1025px]:mx-auto max-md:gap-[7vw]">
                <p
                    className="w-full text-justify text-[1.3vw] leading-normal max-[1025px]:leading-[1.2]  max-md:w-full max-[1025px]:text-center max-md:text-[4.5vw] max-[1025px]:text-[3vw]"
                    style={{ color: textColor }}
                >
                    {description}
                </p>
            </div>
        </div>
    );
};
