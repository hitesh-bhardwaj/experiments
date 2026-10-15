// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { prefersReducedMotion } from "@/lib/motion";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import React, { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";

interface CardProps {
  children?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  content?: ReactNode;
  footer?: ReactNode;
  padding?: string;
  borderColor?: string;
  bg?: string;
  radius?: string;
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
}

const Card = ({
  children,
  title,
  subtitle,
  content,
  footer,
  padding = "p-[2vw] max-lg:p-[3vw] max-md:px-6 max-md:py-10",
  borderColor = "rgba(0,0,0,0.2)",
  bg = "",
  radius = "1.2vw",
  shadow = false,
  className = "",
}: CardProps) => {
  return (
    <div
      className={`flex flex-col gap-[1.2vw] border max-lg:gap-[2vw] max-md:w-full max-md:gap-[4vw] ${padding} ${radius ? `[border-radius:${radius}]` : ""} ${bg ? bg : ""} ${shadow ? "shadow-[0_10px_40px_rgba(0,0,0,0.08)]" : ""} ${className}`}
      style={{ borderColor }}
    >
      {children ? (
        children
      ) : (
        <>
          {title && (
            <div className="flex flex-col gap-[0.4vw]">
              <h3 className="m-0 text-[1.4vw] leading-[1.2] font-medium max-lg:text-[3.5vw] max-md:text-[5.5vw]">
                {title}
              </h3>
              {subtitle && (
                <p className="m-0 text-[0.9vw] opacity-60 max-lg:text-[2.2vw] max-md:text-[3.8vw]">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {content && (
            <div className="text-[1vw] leading-[1.7] opacity-80 max-lg:text-[2.4vw] max-md:text-[4vw]">
              {content}
            </div>
          )}
          {footer && <div className="mt-[0.5vw]">{footer}</div>}
        </>
      )}
    </div>
  );
};

gsap.registerPlugin(ScrollTrigger);

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
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          <h1 className="w-full px-[2vw] text-center text-[5.5vw] leading-[0.95] font-semibold text-[#1a1a1a] max-lg:text-[7.5vw] max-md:px-[4vw] max-md:text-[10vw]">
            {heading}
          </h1>
        </div>
        <div
          ref={containerRef}
          className="relative z-1 flex h-fit w-fit items-center justify-center gap-[6vw] max-lg:gap-[4vw] max-md:gap-[3vw]"
          style={{ gap: cardsGap }}
        >
          {randomizedCards.map((card, index) => (
            <div
              key={card.id || index}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="relative h-fit w-fit shrink-0 opacity-0 will-change-transform"
              style={{ zIndex: card.zIndex }}
            >
              <Card
                radius={cardRadius}
                padding={cardPadding}
                className={`h-[30vw]! w-[25vw]! shrink-0 overflow-hidden max-lg:h-[55vw]! max-lg:w-[45vw]! max-md:h-[78vw]! max-md:w-[62vw]! max-[540px]:h-[90vw]! max-[540px]:w-[72vw]! ${card.bgOuter || ""}`}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                }}
              >
                <div
                  className={`flex h-full w-full flex-col justify-between px-[1.5vw] pb-[1.2vw] pt-[2.5vw] max-lg:px-[2vw] max-lg:pb-[1.8vw] max-lg:pt-[3vw] max-md:px-[4vw] max-md:pb-[3vw] max-md:pt-[4.5vw] ${card.bgInner || ""} ${card.text || ""}`}
                >
                  <div className="flex flex-col gap-[1.2vw] max-lg:gap-[5vw] max-md:gap-[6vw]">
                    {card.eyebrow && (
                      <span className="text-[0.85vw] font-semibold leading-none tracking-[0.2em] uppercase max-lg:text-[2.5vw] max-md:text-[4vw]">
                        {card.eyebrow}
                      </span>
                    )}

                    {card.description && (
                      <p className="w-[85%] text-[1.05vw] leading-[1.35] max-lg:w-[92%] max-lg:text-[2.5vw] max-md:w-full max-md:text-[4vw]">
                        {card.description}
                      </p>
                    )}
                  </div>

                  {card.title && (
                    <h2 className="text-[4.6vw] leading-[0.78] font-semibold max-lg:text-[6vw] max-md:text-[9vw] max-md:leading-[0.86]">
                      {card.title}
                    </h2>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

const ScrollShuffledCards = ({
  background = "#FFFBEB",
  cardsGap = 6,
  sectionHeight = 400,
  shuffleIntensity = 1,
}: { background?: string; cardsGap?: number; sectionHeight?: number; shuffleIntensity?: number }) => {
  const scaleRange = ([min, max]: [number, number]): [number, number] => [min * shuffleIntensity, max * shuffleIntensity];

  return (
    <>
      <section className="w-screen h-screen">
        <ScrollShuffledCardsComp
          cards={cardsData}
          heading="Scroll Shuffled Cards"
          sectionHeight={sectionHeight}
          cardWidth="25vw"
          cardHeight="30vw"
          cardsGap={`${cardsGap}vw`}
          background={background}
          initialContainerXPercent={100}
          finalContainerXPercent={-100}
          startXRange={scaleRange([-4, 4])}
          startYRange={scaleRange([-4, 4])}
          startRotateRange={scaleRange([-6, 6])}
          endXRange={scaleRange([-20, 30])}
          endYRange={scaleRange([-10, 10])}
          endRotateRange={scaleRange([-10, 10])}
        />
      </section>
    </>
  );
};

export default ScrollShuffledCards;

const cardsData = [
  {
    id: 1,
    bgOuter: "bg-[#932F6D]",
    bgInner: "bg-[#E07BE0]",
    text: "text-[#932F6D]",
    eyebrow: "Residential",
    title: "Luxury Living",
    description:
      "Curated homes designed for buyers who want premium finishes, strong location value, and a lifestyle that feels elevated from day one.",
  },
  {
    id: 2,
    bgOuter: "bg-[#29BF12]",
    bgInner: "bg-[#ABFF4F]",
    text: "text-[#29BF12]",
    eyebrow: "Commercial",
    title: "Retail Growth",
    description:
      "High-visibility spaces built for ambitious brands that need stronger walk-ins, better frontage, and a location that supports scale.",
  },
  {
    id: 3,
    bgOuter: "bg-[#4C6085]",
    bgInner: "bg-[#39A0ED]",
    text: "text-[#4C6085]",
    eyebrow: "Investment",
    title: "Future Value",
    description:
      "Properties selected for long-term upside, resilient demand, and the kind of positioning that attracts serious investors.",
  },
  {
    id: 4,
    bgOuter: "bg-[#8c42b7]",
    bgInner: "bg-[#BC96E6]",
    text: "text-[#8c42b7]",
    eyebrow: "Coastal",
    title: "Beach Escape",
    description:
      "Private living environments that combine calm surroundings, direct access, and a premium everyday experience by the water.",
  },
  {
    id: 5,
    bgOuter: "bg-[#b66f3b]",
    bgInner: "bg-[#ECE4B7]",
    text: "text-[#b66f3b]",
    eyebrow: "Urban",
    title: "City Edge",
    description:
      "Sharply positioned spaces built for people who want access, energy, and a stronger connection to the city’s best districts.",
  },
];
