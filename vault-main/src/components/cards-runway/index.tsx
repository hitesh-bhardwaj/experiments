// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import React, { useEffect, useRef } from "react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

function CardsRunwayComponent({
  data = [],
  accentColor = "#ff5f00",
  cardColor = "#161616",
  textColor = "#ffffff",
  ease = "power1.out",
  gap = 48,
}: any) {
  const root = useRef<any>(null);
  const safeGap = Math.max(0, Number(gap) || 0);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Must match the CSS max-[1025px] breakpoint (1280px under default
      // Tailwind): below it the section collapses to the static
      // horizontal-scroll layout, so the pin/scrub timeline only exists
      // at xl and up.
      if (globalThis.innerWidth >= 1280) {
        const track = root.current?.querySelector(".cards-runway-container");
        const viewport = root.current?.querySelector(".cards-runway-viewport");
        if (!track || !viewport) return;

        gsap.set(track, { x: 0 });
        gsap.set(".cards-runway-card", {
          y: prefersReducedMotion() ? "0vw" : "37vw",
          opacity: 1,
        });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "10% 80%",
            end: "102% bottom",
            scrub: true,
          },
        });
        tl.to(".cards-runway-card", {
          y: "0vw",
          stagger: 0.2,
          duration: 0.4,
          // Ease of each card popping up into place.
          ease,
        }).to(".cards-runway-container", {
          x: () => -Math.max(0, track.scrollWidth - viewport.clientWidth),
          duration: 1.2,
          delay: -0.8,
          ease: "power1.inOut",
        });
      } else {
        gsap.set(".cards-runway-card", { autoAlpha: 0, y: 50 });
        gsap.to(".cards-runway-card", {
          scrollTrigger: {
            trigger: ".cards-runway-container",
            start: "top 90%",
            once: true,
          },
          autoAlpha: 1,
          y: 0,
          stagger: 0.15,
          duration: 1,
          ease: "power3.out",
        });
      }
    }, root);

    return () => ctx.revert();
  }, [ease, safeGap]);

  return (
    <section
      ref={root}
      style={{ color: textColor }}
      className="w-full h-[350vh] bg-black max-lg:overflow-hidden max-lg:h-screen max-md:py-[25%] max-lg:py-[12%] relative z-20"
    >
      {/* Cards Runway */}
      <div className="w-screen h-screen sticky top-0 overflow-hidden px-[3vw] max-lg:h-fit max-lg:static pb-5  max-lg:mt-[40vw] max-lg:pb-[4vw] max-lg:overflow-x-scroll mobile-scrollbar max-lg:pr-[7vw] z-15 cards-runway-viewport">
        <div
          className="w-fit h-full flex items-end cards-runway-container"
          style={{ gap: `${safeGap}px` }}
        >
          {data.map((card: any) => (
            <div
              key={card.id}
              className="h-fit w-[28vw] flex flex-col relative cards-runway-card justify-between max-md:w-[70vw]! max-lg:w-[45vw]! opacity-0"
            >
              {/* Always visible top accent bar */}
              <div
                style={{ backgroundColor: accentColor }}
                className="w-full h-[0.5vw] max-lg:h-[1vw] max-md:h-[1.5vw] shrink-0"
              />

              {/* Card content */}
              <div
                style={{ backgroundColor: cardColor }}
                className="w-full h-[37vw] cards-runway-content overflow-hidden max-md:h-[40vh] max-lg:h-[55vw]"
              >
                <div className="p-[2vw] flex flex-col justify-between h-full max-lg:p-[5vw]">
                  <h3 className="text-[2.8vw] leading-[1.2] max-md:text-[6vw] max-lg:text-[4vw] max-md:w-[80%]">{card.title}</h3>
                  <p className="text-[1.25vw] max-lg:text-[2.6vw] max-md:text-[4.4vw] max-md:leading-[1.2]">{card.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const UI_CARDS = [
  {
    id: 1,
    title: "A smarter assistant in your pocket",
    text: "AI now drafts your messages, sets your reminders, and answers questions before you finish typing them. What once meant opening five apps is increasingly a single spoken sentence.",
  },
  {
    id: 2,
    title: "Recommendations that just fit",
    text: "The songs you discover, the shows you binge, the products you didn't know you wanted - quietly ranked by models learning your taste. Personalization has become the default, not the feature.",
  },
  {
    id: 3,
    title: "Language is no longer a wall",
    text: "Real-time translation turns menus, road signs, and conversations abroad into something you actually understand. AI is slowly erasing the friction of speaking a different tongue.",
  },
  {
    id: 4,
    title: "Creativity, on tap",
    text: "Write a prompt, get an image, a melody, or a first draft in seconds. AI doesn't replace the spark, it hands more people the tools to act on theirs.",
  },
  {
    id: 5,
    title: "Everyday coding, accelerated",
    text: "From autocompleting a function to explaining an error, AI sits beside developers as a tireless pair. The gap between an idea and a working prototype keeps getting shorter.",
  },
];

export default function CardsRunway({
  accentColor = "#ff5f00",
  cardColor = "#161616",
  textColor = "#ffffff",
  ease = "power1.out",
  gap = 48,
}) {
  return (
    <CardsRunwayComponent
      data={UI_CARDS}
      accentColor={accentColor}
      cardColor={cardColor}
      textColor={textColor}
      ease={ease}
      gap={gap}
    />
  );
}
