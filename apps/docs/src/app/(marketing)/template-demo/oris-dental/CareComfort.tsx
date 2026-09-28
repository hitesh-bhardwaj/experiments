"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SplitTextLines from "./effects/split-text-lines/SplitTextLines";
import SmoothInfiniteCarousel, {
  type SmoothInfiniteCarouselRef,
} from "./effects/smooth-carousel/SmoothInfiniteCarousel";
import CircularButton from "./effects/circular-button/CircularButton";
import DotsCanvas from "./teeth-3d/DotsCanvas";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export interface CareCardData {
  id: number;
  title: string;
  description: string;
  bgClassName: string;
}

const CARE_CARDS: CareCardData[] = [
  {
    id: 1,
    title: "Initial\nConsultation",
    description:
      "Your dentist will examine your teeth, discuss any concerns, and explain your options clearly.",
    bgClassName: "oris-bg-primary",
  },
  {
    id: 2,
    title: "Treatment\nPlanning",
    description:
      "We create a clear, step by step treatment plan tailored to your specific needs, timeline, and budget.",
    bgClassName: "bg-oris-secondary",
  },
  {
    id: 3,
    title: "Ongoing\nCare",
    description:
      "Regular checkups, preventive cleanings, and continued guidance designed to keep your teeth and gums healthy.",
    bgClassName: "oris-bg-primary",
  },
  {
    id: 4,
    title: "Gentle\nProcedures",
    description:
      "State-of-the-art technology and gentle techniques to ensure comfortable, stress-free visits every time.",
    bgClassName: "bg-oris-secondary",
  },
  {
    id: 5,
    title: "Smile\nRestoration",
    description:
      "Custom veneers, natural crowns, and durable implants designed to restore both function and radiant confidence.",
    bgClassName: "oris-bg-primary",
  },
  {
    id: 6,
    title: "Preventive\nHygiene",
    description:
      "Comprehensive cleanings, enamel protection, and personalized home-care guidance to protect lifelong oral health.",
    bgClassName: "bg-oris-secondary",
  },
];

/* smooothy's infinite mode parks each slide at symmetricMod(current + i, N),
   which clamps to (-N/2, N/2] - so a slide teleports from +N/2 to -N/2 the
   moment it crosses that edge. The jump is only invisible while
   (N / 2) * itemWidth >= the carousel's width.

   Desktop itemWidth is 27.9vw (26vw card + 1.9vw gap), so a 100vw wrapper
   needs N >= 8. With the 6 source cards, slot 3 landed at 83.7vw -> 111.6vw:
   the half-visible 4th card, which snapped away as soon as you swiped right.

   Duplicating the whole set (N = 12) pushes the jump out to 167vw, far past
   the right edge, and keeps the loop order intact - a partial duplicate would
   stutter (...6, 1, 2, 1, 2, 3...). The two copies sit 167vw apart, so the
   same card can never appear twice on screen. */
const CAROUSEL_CARDS = [...CARE_CARDS, ...CARE_CARDS];

export default function CareComfort() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const carouselWrapperRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const carouselRef = useRef<SmoothInfiniteCarouselRef | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      if (!carouselWrapperRef.current) return;

      const cardElements =
        carouselWrapperRef.current.querySelectorAll(".care-card-anim");

      // Initial state: translated deep from bottom with soft fade
      gsap.set(cardElements, {
        y: 130,
        autoAlpha: 0,
      });

      if (controlsRef.current) {
        gsap.set(controlsRef.current, {
          autoAlpha: 0,
        });
      }

      // ScrollTrigger entrance timeline with ultra-smooth easing
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: carouselWrapperRef.current,
          start: "top 82%",
          once: true,
        },
      });

      // Bottom arrow buttons fade in cleanly and early with opacity only
      if (controlsRef.current) {
        tl.to(
          controlsRef.current,
          {
            autoAlpha: 1,
            duration: 0.6,
            ease: "power2.out",
          },
          0.1
        );
      }

      // Staggered long smooth rise from bottom for cards
      tl.to(
        cardElements,
        {
          y: 0,
          autoAlpha: 1,
          duration: 1.45,
          stagger: 0.1,
          ease: "power4.out",
          onComplete: () => {
            // Clear animation props so swipe tilt works uninhibited
            gsap.set(cardElements, { clearProps: "y,opacity,visibility" });
          },
        },
        0
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="care-comfort"
      ref={sectionRef}
      className="w-full bg-white relative z-10 py-[7vw] max-md:py-16 overflow-hidden text-oris-secondary"
    >
      {/* Top Header: Title on Left, Detailed Paragraph on Right */}
      <div className="oris-paddx mb-[5vw] max-md:mb-8 flex justify-between items-start max-[1025px]:flex-col max-[1025px]:gap-6">
        {/* Left Heading */}
        <div className="w-[50%] max-[1025px]:max-w-full">
          <SplitTextLines as="h2" className="text-[4.2vw] max-md:w-[90vw] max-[1025px]:text-[6vw] max-md:text-[7.5vw]">
            Care Designed for Your{"\n"}Lasting Comfort
          </SplitTextLines>
        </div>

        {/* Right Paragraph */}
        <div className="max-w-[37vw] max-[1025px]:max-w-full text-right max-[1025px]:text-left pt-[0.6vw] max-[1025px]:pt-0">
          <SplitTextLines as="p" className="oris-text22" delay={0.15}>
            We provide thoughtful dental treatments that help patients understand
            their options, feel comfortable during appointments, and leave with
            clear guidance for maintaining their oral health between visits. Every
            step is designed around your wellbeing from initial consultation to
            ongoing preventive care.
          </SplitTextLines>
        </div>
      </div>

      {/* Infinite Smooth Carousel Cards with Scroll Entrance Animation */}
      {/* Sizing math (desktop): 3vw left inset + 3.5 cards + 3 gaps ~= 100vw
          -> card 26vw, gap 1.9vw (0.95vw padding per item side).
          Wrapper pl 2.05vw + item pl 0.95vw = 3vw, so the first card's left
          edge lines up exactly with the section heading (oris-paddx = 3vw). */}
      <div ref={carouselWrapperRef} className="w-full relative  py-6">
        <SmoothInfiniteCarousel
          ref={carouselRef}
          config={{
            infinite: true,
            snap: true,
            lerpFactor: 0.12,
            dragSensitivity: 0.005,
          }}
          wrapperClassName="py-2 pl-[2.05vw] max-[1025px]:pl-[3.7vw] max-md:pl-[3vw]"
          itemClassName="px-[0.95vw] max-[1025px]:px-[1.3vw] max-md:px-[2vw]"
        >
          {CAROUSEL_CARDS.map((card, idx) => (
            <div
              key={`${card.id}-${idx}`}
              aria-hidden={idx >= CARE_CARDS.length}
              className={`care-card-anim w-[28vw] max-[1025px]:w-[50vw] max-md:w-[76vw] aspect-[440/477] rounded-xl max-md:rounded-3xl px-[1.8vw] pt-[1.8vw] pb-[5vw] max-md:px-6 max-md:pt-6 max-md:pb-8 flex flex-col justify-end gap-[2.4vw] max-md:gap-6 relative  select-none will-change-transform ${card.bgClassName}`}
            >
              {/* Interactive Dots on Mouse Move */}
              <DotsCanvas
                spacing={20}
                baseRadius={1.2}
                maxRadius={4}
                interactionRadius={280}
                baseOpacity={0}
                maxOpacity={0.75}
                gradient={false}
                lerpFactor={0.22}
              />

              {/* Card Title */}
              <h3 className="relative z-10 text-white text-[2.4vw] max-[1025px]:text-[4vw] max-md:text-[7vw] font-normal leading-[1.15] whitespace-pre-line tracking-tight">
                {card.title}
              </h3>

              {/* Card Description */}
              <p className="relative z-10 text-white/85 oris-text22 max-[1025px]:text-[2.5vw] max-md:text-[3.6vw] leading-[1.3] max-w-[96%] font-normal">
                {card.description}
              </p>
            </div>
          ))}
        </SmoothInfiniteCarousel>
      </div>

      {/* Bottom Controls: Circular Navigation Buttons with Actual Arrows */}
      <div
        ref={controlsRef}
        className="oris-paddx mt-[3vw] max-md:mt-6 max-[1025px]:mx-auto max-[1025px]:justify-center flex items-center justify-end gap-[0.8vw] max-[1025px]:gap-3"
      >
        <CircularButton
          onClick={() => carouselRef.current?.goToPrev()}
          ariaLabel="Previous slide"
          bgClassName="oris-bg-primary"
          className="size-[3.4vw] min-w-11 min-h-11 max-md:size-12 max-[1025px]:size-18"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[1.2vw] h-[1.2vw] max-[1025px]:w-5 max-[1025px]:h-5 transition-colors duration-300"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </CircularButton>

        <CircularButton
          onClick={() => carouselRef.current?.goToNext()}
          ariaLabel="Next slide"
          bgClassName="oris-bg-primary"
          className="size-[3.4vw] min-w-11 min-h-11 max-md:size-12 max-[1025px]:size-18"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-[1.2vw] h-[1.2vw] max-[1025px]:w-5 max-[1025px]:h-5 transition-colors duration-300"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </CircularButton>
      </div>
    </section>
  );
}
