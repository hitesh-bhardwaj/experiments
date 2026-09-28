'use client'
import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

export default function CardsRunway({
  data = [],
  accentColor = "#ff5f00",
  cardColor = "#161616",
  speed = 1,
  gap = 48,
  perspective = 900,
}: any) {
  const root = useRef<any>(null);
  const safeSpeed = Math.max(0.2, Number(speed) || 1);
  const safeGap = Math.max(0, Number(gap) || 0);
  const safePerspective = Math.max(0, Number(perspective) || 0);

  useEffect(() => {
    let ctx = gsap.context(() => {
      // Must match the CSS max-[1025px] breakpoint (1280px under default
      // Tailwind): below it the section collapses to the static
      // horizontal-scroll layout, so the pin/scrub timeline only exists
      // at xl and up.
      if (globalThis.innerWidth >= 1280) {
        const track = root.current?.querySelector(".cards-runway-container");
        if (!track) return;

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
          duration: 0.4 / safeSpeed,
          ease: "power1.out",
        }).to(".cards-runway-container", {
          translateX: "-38%",
          duration: 1.2 / safeSpeed,
          delay: -0.8 / safeSpeed,
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
  }, [safeSpeed, safeGap]);

  return (
    <section
      ref={root}
      className="w-full h-[350vh] text-white bg-black max-[1025px]:overflow-hidden max-[1025px]:h-screen max-md:py-[25%] max-[1025px]:py-[12%] relative z-20"
    >
      {/* Cards Runway */}
      <div className="w-screen h-screen sticky top-0 overflow-hidden px-[3vw] max-[1025px]:h-fit max-[1025px]:static pb-5  max-[1025px]:mt-[40vw] max-[1025px]:pb-[4vw] max-[1025px]:overflow-x-scroll mobile-scrollbar max-[1025px]:pr-[7vw] z-15 cards-runway-viewport">
        <div
          className="w-fit h-full flex items-end cards-runway-container"
          style={{ gap: `${safeGap}px`, perspective: safePerspective }}
        >
          {data.map((card: any) => (
            <div
              key={card.id}
              className="h-fit w-[28vw] flex flex-col relative cards-runway-card justify-between max-md:w-[70vw]! max-[1025px]:w-[45vw]! opacity-0"
            >
              {/* Always visible top accent bar */}
              <div
                style={{ backgroundColor: accentColor }}
                className="w-full h-[0.5vw] max-[1025px]:h-[1vw] max-md:h-[1.5vw] shrink-0"
              />

              {/* Card content */}
              <div
                style={{ backgroundColor: cardColor }}
                className="w-full h-[37vw] cards-runway-content overflow-hidden max-md:h-[40vh] max-[1025px]:h-[55vw]"
              >
                <div className="p-[2vw] flex flex-col justify-between h-full max-[1025px]:p-[5vw]">
                  <h3 className="text-[2.8vw] leading-[1.2] max-md:text-[6vw] max-[1025px]:text-[4vw] max-md:w-[80%]">{card.title}</h3>
                  <p className="text-[1.25vw] max-[1025px]:text-[2.6vw] max-md:text-[4.4vw] max-md:leading-[1.2]">{card.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
