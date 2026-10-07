'use client'
import React, { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'
import Image from 'next/image'

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger)
}

const UI_CARDS = [
  {
    id: 1,
    icon: "/icons/motion-identity.svg",
    title: "Motion identity, not decoration",
    text: "Every effect should reinforce attention, hierarchy, brand feel, or interaction feedback. If motion does not earn its place, it does not belong.",
  },
  {
    id: 2,
    icon: "/icons/source-code.png",
    title: "Source code you own",
    text: "Vault is built for people who want control. Every effect lands in your repo as real, inspectable code. No runtime dependency on us. No lock-in. Change anything, keep everything.",
  },
  {
    id: 3,
    icon: "/icons/dependency-honest.svg",
    title: "Dependency-honest",
    text: "Effects use serious tools where they are needed: GSAP, Motion, Three.js, WebGL, Lenis, React, and Next.js. No surprise magic. No mystery layer.",
  },
  {
    id: 4,
    icon: "/icons/agency-grade.svg",
    title: "Agency-grade creative frontend",
    text: "Vault is built from Hyperiux’s creative frontend discipline. These effects are refined on launches we actually shipped. Designed with reduced-motion, mobile, and cleanup considerations. Proven where it counts, not just in a sandbox.",
  },
  {
    id: 5,
    icon: "/icons/free-entry.svg",
    title: "Free entry, clear upgrade",
    text: "Start with 50+ free effects. Upgrade to Pro when you need the full library, advanced systems, complete packs, and ongoing drops.",
  },
];

export default function NotAnotherUIKit() {
  useEffect(() => {
    let ctx = gsap.context(() => {
      const reduceMotion = prefersReducedMotion();

      if (globalThis.matchMedia("(min-width: 1026px)").matches) {
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
    <div id="uikit-section" className="w-full h-[250vh] text-white max-lg:overflow-hidden max-lg:h-fit max-lg:py-[12%] max-md:overflow-hidden max-md:h-fit max-sm:pb-[25%] max-sm:pt-0 max-md:py-[12%] relative z-20">
        {/* <div>
            <LineReveal as="h2" className="t96 w-[calc(var(--cvw)*90)] font-avenir max-md:text-center max-md:w-full mx-auto text-center">
               Not <span className='gradient-text-animate'>Another UI Kit.</span>  Not a Side Project.
            </LineReveal>
        </div> */}

      {/* Use Case Cards */}
      <div className="pointer-events-none max-lg:pointer-events-auto w-screen h-screen sticky mt-[-60vh] max-lg:static max-lg:h-fit max-lg:mt-[calc(var(--cvw)*12)] max-lg:pb-[calc(var(--cvw)*4)] max-lg:overflow-x-scroll max-lg:overflow-y-hidden max-lg:pr-[calc(var(--cvw)*7)] max-sm:mt-[8vh] top-0  overflow-hidden px-[calc(var(--cvw)*3)] max-md:overflow-y-hidden max-md:h-fit max-md:static max-md:mt-[calc(var(--cvw)*12)] max-md:pb-[calc(var(--cvw)*4)] max-md:overflow-x-scroll mobile-scrollbar max-md:pr-[calc(var(--cvw)*7)] z-15 ">
        <div className="w-fit h-full flex gap-[calc(var(--cvw)*3)] max-md:gap-[calc(var(--cvw)*8)]  items-end use-case-container translate-x-[20%] max-lg:translate-x-0 max-lg:gap-[calc(var(--cvw)*6)] max-sm:pl-[calc(var(--cvw)*5)] ">
          {UI_CARDS.map((card) => (
            <div
              key={card.id}
              className="pointer-events-auto w-[calc(var(--cvw)*28)] h-fit flex flex-col relative use-case justify-between max-lg:w-[calc(var(--cvw)*45)] max-md:w-[calc(var(--cvw)*80)]  bg-background/40 backdrop-blur-lg"
            >
              {/* Always visible top orange bar */}
              <div className="w-full h-[calc(var(--cvw)*0.5)] bg-[#ff5f00] max-md:h-[calc(var(--cvw)*1)] max-sm:h-[calc(var(--cvw)*1.5)] shrink-0" />

              {/* Expanding card content */}
              <div className="w-full h-[calc(var(--cvw)*37)] border border-grey content-container overflow-hidden max-lg:h-[calc(var(--cvw)*60)] max-md:h-[calc(var(--cvw)*100)]">
                <div className="p-[calc(var(--cvw)*2.5)] flex flex-col justify-between h-full max-md:p-[calc(var(--cvw)*5)]">
                  <div className="space-y-[calc(var(--cvw)*1.5)] max-md:space-y-[calc(var(--cvw)*4)]">
                  <div className='relative size-[calc(var(--cvw)*3.2)] max-md:size-[calc(var(--cvw)*14)]'>
                    {card.icon && <Image src={card.icon} alt="" aria-hidden="true" fill sizes="(max-width: 1025px) 10vw, 5vw" className="object-contain" />}
                  </div>
                  <h3 className="type-h2 max-md:w-[80%]">
                    {card.title}
                  </h3>
                  </div>

                  <p className="type-small">
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
