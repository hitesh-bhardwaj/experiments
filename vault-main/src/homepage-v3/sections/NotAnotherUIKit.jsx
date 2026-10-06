'use client'
import React, { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'
import LineReveal from '@/components/Animations/LineReveal'

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
    text: "Start with 50+ free effects. Upgrade to Pro when you need the full library, advanced systems, complete packs, and ongoing drops.",
  },
];

// The principle cards that slide in under the wave. Rendered inside
// SignalSection (one section with the wave), not on its own.
export default function NotAnotherUIKit() {
  useEffect(() => {
    let ctx = gsap.context(() => {
      const reduceMotion = prefersReducedMotion();

      if (globalThis.matchMedia("(min-width: 768px)").matches) {
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
            ease: "none",
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
    <div id="uikit-section" className="w-full h-[250vh] text-white max-md:overflow-hidden max-md:h-fit max-sm:pb-[25%] max-sm:pt-0 max-md:py-[12%] relative z-20">
        {/* <div>
            <LineReveal as="h2" className="t96 w-[90vw] font-neue-haas max-md:text-center max-md:w-full mx-auto text-center">
               Not <span className='gradient-text-animate'>Another UI Kit.</span>  Not a Side Project.
            </LineReveal>
        </div> */}

      {/* Use Case Cards */}
      <div className="md:pointer-events-none w-screen h-screen sticky mt-[-60vh]  max-sm:mt-[8vh] top-0  overflow-hidden px-[3vw] max-md:overflow-y-hidden max-md:h-fit max-md:static max-md:mt-[12vw] max-md:pb-[4vw] max-md:overflow-x-scroll mobile-scrollbar max-md:pr-[7vw] z-15 ">
        <div className="w-fit h-full flex gap-[3vw] max-md:gap-[4vw] max-sm:gap-[6vw] items-end use-case-container translate-x-[20%] max-md:translate-x-0 max-sm:pl-[5vw] ">
          {UI_CARDS.map((card) => (
            <div
              key={card.id}
              className="pointer-events-auto w-[28vw] h-fit flex flex-col relative use-case justify-between max-sm:w-[70vw] max-md:w-[55vw] bg-background/40"
            >
              {/* Always visible top orange bar */}
              <div className="w-full h-[0.5vw] bg-[#ff5f00] max-md:h-[1vw] max-sm:h-[1.5vw] shrink-0" />

              {/* Expanding card content */}
              <div className="w-full h-[37vw] border border-grey content-container overflow-hidden max-sm:h-[40vh] max-md:h-[60vw]">
                <div className="p-[2.5vw] flex flex-col justify-between h-full max-md:p-[5vw]">
                  <h3 className="text-[3vw] font-aeonik max-sm:text-[6.5vw]! max-sm:w-[80%]">
                    {card.title}
                  </h3>

                  <p className="text24 font-avenir max-sm:text-[4vw]! max-sm:leading-[1.2]">
                    {card.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
