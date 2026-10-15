'use client'
import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'
import { MEDIA } from '@/lib/breakpoints'
import { FREE_LABEL } from '@/lib/library-counts'

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
    icon: "/icons/source-code.svg",
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
    text: `Start with ${FREE_LABEL} free effects. Upgrade to Pro when you need the full library, advanced systems, complete packs, and ongoing drops.`,
  },
];

export default function NotAnotherUIKit() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = prefersReducedMotion();

      if (!globalThis.matchMedia(MEDIA.tablet).matches) {
        gsap.set(".use-case", { y: reduceMotion ? "0vw" : "37vw" });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#uikit-section",
            start: "30% 90%",
            end: "102% bottom",
            scrub: true,
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
    <div id="uikit-section" className="relative z-20 h-[250vh] w-full text-foreground max-lg:h-fit max-lg:overflow-hidden max-lg:py-[4%] max-md:py-[12%]">
      {/* Use Case Cards */}
      <div className="section-x pointer-events-none sticky top-0 z-15 mt-[-60vh] h-screen w-full overflow-hidden mobile-scrollbar max-lg:pointer-events-auto max-lg:static max-lg:mt-[calc(var(--cvw)*12)] max-lg:h-fit max-lg:overflow-x-scroll max-lg:overflow-y-hidden max-lg:pb-[calc(var(--cvw)*4)]">
        <div className="use-case-container flex h-full w-fit translate-x-[20%] items-end gap-[calc(var(--cvw)*3)] max-lg:translate-x-0 max-lg:gap-[calc(var(--cvw)*6)] max-md:gap-[calc(var(--cvw)*8)]">
          {UI_CARDS.map((card) => (
            <div
              key={card.id}
              className="pointer-events-auto w-[calc(var(--cvw)*28)] h-fit flex flex-col relative use-case justify-between max-lg:w-[calc(var(--cvw)*45)] max-md:w-[calc(var(--cvw)*80)] bg-background/40 backdrop-blur-lg"
            >
              {/* Always visible top orange bar */}
              <div className="w-full h-[calc(var(--cvw)*0.5)] bg-primary max-md:h-[calc(var(--cvw)*1)] shrink-0" />

              {/* Expanding card content */}
              <div className="w-full h-[calc(var(--cvw)*37)] border border-grey content-container overflow-hidden max-lg:h-[calc(var(--cvw)*55)] max-md:h-[calc(var(--cvw)*100)]">
                <div className="p-[calc(var(--cvw)*2.5)] flex flex-col justify-between h-full max-md:p-[calc(var(--cvw)*5)]">
                  <div className="space-y-[calc(var(--cvw)*1.5)] max-md:space-y-[calc(var(--cvw)*4)]">
                  {/* The icon's shape masks the same moving gradient the headings use */}
                  {card.icon && (
                    <span
                      aria-hidden="true"
                      className="gradient-text-animate block size-[calc(var(--cvw)*4.2)] [-webkit-background-clip:border-box]! [background-clip:border-box]! mask-contain mask-center mask-no-repeat max-lg:size-[calc(var(--cvw)*8)] max-md:size-[calc(var(--cvw)*18)]"
                      style={{ maskImage: `url(${card.icon})`, WebkitMaskImage: `url(${card.icon})` }}
                    />
                  )}
                  <h3 className="type-h2 max-md:w-[80%]">
                    {card.title}
                  </h3>
                  </div>

                   <p className="type-body-lg">
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
