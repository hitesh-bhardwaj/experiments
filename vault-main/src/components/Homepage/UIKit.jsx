'use client'
import React, { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import LineReveal from '../Animations/LineReveal'
import { prefersReducedMotion } from '@/lib/motion'

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

const UI_CARDS = [
  {
    id: 1,
    title: "Motion identity, not decoration",
    text: "Every effect should reinforce attention, hierarchy, brand feel, or interaction feedback. If motion does not earn its place, it does not belong.",
  },
  {
    id: 2,
    title: "Source code you own",
    text: "Vault is built for people who want control. Every effect lands in your repo as real, inspectable code. No runtime dependency on us. No lock-in. Change anything, keep everything.",
  },
  {
    id: 3,
    title: "Dependency-honest",
    text: "Effects use serious tools where they are needed: GSAP, Motion, Three.js, WebGL, Lenis, React, and Next.js. No surprise magic. No mystery layer.",
  },
  {
    id: 4,
    title: "Agency-grade creative frontend",
    text: "Vault is built from Hyperiux’s creative frontend discipline. These effects are refined on launches we actually shipped. Designed with reduced-motion, mobile, and cleanup considerations. Proven where it counts, not just in a sandbox.",
  },
  {
    id: 5,
    title: "Free entry, clear upgrade",
    text: "Start with 30+ free effects. Upgrade to Pro when you need the full library, advanced systems, complete packs, and ongoing drops.",
  },
];

export default function UIKit() {
  useEffect(() => {
    let ctx = gsap.context(() => {
      const reduceMotion = prefersReducedMotion();

      if (globalThis.innerWidth > 1024) {
        gsap.set(".use-case", { y: reduceMotion ? "0vw" : "37vw" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#uikit-section",
            start: "30% 90%",
            end: "102% bottom",
            scrub: true,
            // markers:true,
          },
        });

        if (!reduceMotion) {
          tl.to(".use-case", {
            y: "0vw",
            stagger: 0.2,
            duration: 0.4,
            ease: "power1.out",
          }).to(".use-case-container", {
            translateX: "-38%",
            duration: 1.2,
            delay: -1,
            ease: "power1.inOut",
          });
        } else {
          tl.fromTo(".use-case-container",
            { translateX: "100vw" },
            { translateX: "-38%", duration: 1.2, ease: "power1.inOut" }
          );
        }
      } else {
        if (!reduceMotion) {
          gsap.set(".use-case", { opacity: 0, y: 50 });
          gsap.to(".use-case", {
            scrollTrigger: {
              trigger: ".use-case-container",
              start: "top 90%",
              once: true,
            },
            opacity: 1,
            y: 0,
            stagger: 0.15,
            duration: 1,
            ease: "power3.out",
          });
        } else {
          gsap.set(".use-case", { opacity: 1, y: 0 });
        }
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section id="uikit-section" className="w-full h-[250vh] pt-[15vw] text-white max-[1025px]:overflow-hidden max-[1025px]:h-fit max-md:py-[25%] max-[1025px]:py-[12%] relative z-20">
        <div>
            <LineReveal as="h2" className="text110 w-[90vw] mx-auto text-center">
               Not <span className='gradient-text-animate'>Another</span> UI Kit. Not a Side Project.
            </LineReveal>
        </div>

      {/* Use Case Cards */}
      <div className="w-screen h-screen sticky mt-[-60vh]  max-md:mt-[8vh] top-0  overflow-hidden px-[3vw] max-[1025px]:h-fit max-[1025px]:static max-[1025px]:mt-[12vw] max-[1025px]:pb-[4vw] max-[1025px]:overflow-x-scroll mobile-scrollbar max-[1025px]:pr-[7vw] z-15 ">
        <div className="w-fit h-full flex gap-[3vw] max-md:gap-[6vw] items-end use-case-container translate-x-[20%] max-[1025px]:translate-x-0 max-md:pl-[5vw] ">
          {UI_CARDS.map((card) => (
            <div
              key={card.id}
              className="w-[28vw] h-fit flex flex-col relative use-case justify-between max-md:w-[70vw] max-[1025px]:w-[55vw]"
            >
              {/* Always visible top orange bar */}
              <div className="w-full h-[0.5vw] bg-[#ff5f00] max-[1025px]:h-[1vw] max-md:h-[1.5vw] shrink-0" />

              {/* Expanding card content */}
              <div className="w-full h-[37vw]  bg-[#161616] content-container overflow-hidden max-md:h-[40vh] max-[1025px]:h-[60vw]">
                <div className="p-[2.5vw] flex flex-col justify-between h-full max-[1025px]:p-[5vw]">
                  <h3 className="text64 max-md:text-[6.5vw]! max-md:w-[80%]">
                    {card.title}
                  </h3>

                  <p className="text24 max-md:text-[4vw]! max-md:leading-[1.2]">
                    {card.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
