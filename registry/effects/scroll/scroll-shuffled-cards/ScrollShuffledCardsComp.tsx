"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import Card from "./card";

gsap.registerPlugin(ScrollTrigger);

// True when the user has asked the OS to minimise animation. Safe to call
// during render - returns false on the server.
function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const getRandomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

interface ShuffledCard {
  id?: string | number;
  bgOuter?: string;
  bgInner?: string;
  text?: string;
  eyebrow?: string;
  description?: string;
  title?: string;
}

interface ScrollShuffledCardsCompProps {
  cards?: ShuffledCard[];
  heading?: string;
  sectionHeight?: number;
  cardWidth?: string;
  cardHeight?: string;
  cardPadding?: string;
  cardRadius?: string;
  cardsGap?: string;
  background?: string;
  initialContainerXPercent?: number;
  finalContainerXPercent?: number;
  startXRange?: [number, number];
  startYRange?: [number, number];
  startRotateRange?: [number, number];
  endXRange?: [number, number];
  endYRange?: [number, number];
  endRotateRange?: [number, number];
  className?: string;
}

const ScrollShuffledCardsComp = ({
  cards = [],
  heading = "Scroll Shuffled Cards",
  sectionHeight = 400,
  cardWidth = "25vw",
  cardHeight = "30vw",
  cardPadding = "0.25vw",
  cardRadius = "0vw",
  cardsGap = "6vw",
  background = "#FFFBEB",
  initialContainerXPercent = 100,
  finalContainerXPercent = -100,
  startXRange = [-4, 4],
  startYRange = [-4, 4],
  startRotateRange = [-6, 6],
  endXRange = [-20, 30],
  endYRange = [-10, 10],
  endRotateRange = [-10, 10],
  className = "",
}: ScrollShuffledCardsCompProps) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const randomizedCards = useMemo(() => {
    return cards.map((card, index) => ({
      ...card,
      startX: getRandomInRange(startXRange[0], startXRange[1]),
      startY: getRandomInRange(startYRange[0], startYRange[1]),
      startRotate: getRandomInRange(startRotateRange[0], startRotateRange[1]),
      endX: getRandomInRange(endXRange[0], endXRange[1]),
      endY: getRandomInRange(endYRange[0], endYRange[1]),
      endRotate: getRandomInRange(endRotateRange[0], endRotateRange[1]),
      zIndex: cards.length - index,
    }));
  }, [
    cards,
    startXRange,
    startYRange,
    startRotateRange,
    endXRange,
    endYRange,
    endRotateRange,
  ]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, randomizedCards.length);
    const reducedMotion = prefersReducedMotion();

    const ctx = gsap.context(() => {
      const cardElements = cardRefs.current.filter(Boolean);
      if (!cardElements.length) return;

      gsap.set(containerRef.current, {
        xPercent: initialContainerXPercent,
      });

      // Reduced motion: cards sit at their resting position with no
      // shuffle offset or rotation - only the container's overall scroll
      // slide stays in motion.
      cardElements.forEach((cardEl, index) => {
        gsap.set(cardEl, {
          x: reducedMotion ? 0 : `${randomizedCards[index].startX}vw`,
          y: reducedMotion ? 0 : `${randomizedCards[index].startY}vw`,
          rotation: reducedMotion ? 0 : randomizedCards[index].startRotate,
          opacity: 1,
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });

      tl.to(
        containerRef.current,
        {
          xPercent: finalContainerXPercent,
          ease: "none",
        },
        0
      );

      cardElements.forEach((cardEl, index) => {
        tl.to(
          cardEl,
          {
            x: reducedMotion ? 0 : `${randomizedCards[index].endX}vw`,
            y: reducedMotion ? 0 : `${randomizedCards[index].endY}vw`,
            rotation: reducedMotion ? 0 : randomizedCards[index].endRotate,
            ease: "none",
          },
          0
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [randomizedCards, initialContainerXPercent, finalContainerXPercent]);

  return (
    <section
      ref={sectionRef}
      className={`relative w-screen ${className}`}
      style={{
        height: `${sectionHeight}vh`,
        background,
      }}
    >
      <div className="sticky top-0 flex h-screen w-screen items-center justify-center overflow-hidden">
        <div
          ref={containerRef}
          className="relative z-1 flex h-fit w-fit items-center justify-center gap-[6vw] max-[1025px]:gap-[4vw] max-md:gap-[3vw]"
          style={{ gap: cardsGap }}
        >
          {randomizedCards.map((card, index) => (
            <div
              key={card.id || index}
              ref={(el) => { cardRefs.current[index] = el; }}
              className="relative h-fit w-fit shrink-0 opacity-0 will-change-transform"
              style={{ zIndex: card.zIndex }}
            >
              <Card
                radius={cardRadius}
                padding={cardPadding}
                className={`h-[30vw]! w-[25vw]! shrink-0 overflow-hidden max-[1025px]:h-[55vw]! max-[1025px]:w-[45vw]! max-md:h-[78vw]! max-md:w-[62vw]! max-[540px]:h-[90vw]! max-[540px]:w-[72vw]! ${card.bgOuter || ""}`}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                }}
              >
                <div
                  className={`flex h-full w-full flex-col justify-between px-[1.5vw] pb-[1.2vw] pt-[2.5vw] max-[1025px]:px-[2vw] max-[1025px]:pb-[1.8vw] max-[1025px]:pt-[3vw] max-md:px-[4vw] max-md:pb-[3vw] max-md:pt-[4.5vw] ${card.bgInner || ""} ${card.text || ""}`}
                >
                  <div className="flex flex-col gap-[1.2vw] max-[1025px]:gap-[5vw] max-md:gap-[6vw]">
                    {card.eyebrow && (
                      <span className="text-[0.85vw] font-semibold leading-none tracking-[0.2em] uppercase max-[1025px]:text-[2.5vw] max-md:text-[4vw]">
                        {card.eyebrow}
                      </span>
                    )}

                    {card.description && (
                      <p className="w-[85%] text-[1.05vw] leading-[1.35] max-[1025px]:w-[92%] max-[1025px]:text-[2.5vw] max-md:w-full max-md:text-[4vw]">
                        {card.description}
                      </p>
                    )}
                  </div>

                  {card.title && (
                    <h2 className="text-[4.6vw] leading-[0.78] font-semibold max-[1025px]:text-[6vw] max-md:text-[9vw] max-md:leading-[0.86]">
                      {card.title}
                    </h2>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <h1 className="w-full px-[2vw] text-center text-[5.5vw] leading-[0.95] font-semibold text-[#1a1a1a] max-[1025px]:text-[7.5vw] max-md:px-[4vw] max-md:text-[10vw]">
            {heading}
          </h1>
        </div>
      </div>
    </section>
  );
};

export default ScrollShuffledCardsComp;
