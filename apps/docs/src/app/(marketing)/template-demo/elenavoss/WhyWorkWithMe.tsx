"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Rocket, Sparkles, Zap } from "lucide-react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import OverflowTextReveal from "./effects/overflow-text-reveal";

const ORANGE = "#E8620F";

const REASONS = [
  {
    icon: Rocket,
    title: "Rapid Project Delivery",
    description:
      "Launch custom website projects into the real world in as little as 48 hours.",
  },
  {
    icon: Sparkles,
    title: "Precision & Aesthetics",
    description:
      "Meticulous design craftsmanship that offers complete control over layouts, typography, and every interactive detail.",
  },
  {
    icon: Zap,
    title: "Future-Proofed Designs",
    description:
      "Stay ahead of shifting trends with an approach that seamlessly integrates with the latest innovations in interactive design and user experience craft.",
  },
];

const WhyWorkWithMe = () => {
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    gsap.set(lineRefs.current, { scaleX: 0, transformOrigin: "left center" });
  }, []);

  const handleEnter = (index: number) => {
    const line = lineRefs.current[index];
    if (!line) return;
    gsap.killTweensOf(line);
    gsap.set(line, { transformOrigin: "left center" });
    gsap.to(line, { scaleX: 1, duration: 0.55, ease: "power2.out" });
  };

  const handleLeave = (index: number) => {
    const line = lineRefs.current[index];
    if (!line) return;
    gsap.killTweensOf(line);
    gsap.set(line, { transformOrigin: "right center" });
    gsap.to(line, { scaleX: 0, duration: 0.55, ease: "power2.out" });
  };

  useEffect(() => {
    if (prefersReducedMotion) {
      gsap.set(".work-card", { opacity: 1, yPercent: 0 });
      return;
    }

    const tween = gsap.fromTo(
      ".work-card",
      {
        opacity: 0,
        yPercent: 10,
      },
      {
        opacity: 1,
        yPercent: 0,
        stagger: 0.05,
        ease: "power2.out",
        scrollTrigger: {
          trigger: "#work-with-me",
          start: "top top",
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [prefersReducedMotion]);

  return (
    <section
      className="relative w-screen bg-[#070707] text-white pt-[25vw] pb-[10vw] max-[1025px]:pt-[65vw] "
      id="work-with-me"
    >
      <div className="text-center mb-[5vw] max-md:mb-[10vw]">
        <OverflowTextReveal stagger={0.015}>
          <h2 className="text-[5.5vw] max-[1025px]:text-[7vw] max-md:text-[9vw]">
            Why Work With Me?
          </h2>
        </OverflowTextReveal>

        <OverflowTextReveal splitBy="lines">
          <p className="text-[1.25vw] text-white mt-[1.5vw] max-[1025px]:text-[2.5vw] max-md:text-[4.5vw] max-md:mt-[2vw]">
            Fast-track your Digital Projects
          </p>
        </OverflowTextReveal>
      </div>

      <div className="grid grid-cols-3 max-[1025px]:grid-cols-1 ">
        {REASONS.map((reason, index) => {
          const Icon = reason.icon;
          return (
            <div
              key={reason.title}
              onMouseEnter={() => handleEnter(index)}
              onMouseLeave={() => handleLeave(index)}
              className={`relative px-[4vw] pt-[2vw] pb-[3vw] h-[32vw] flex flex-col justify-between work-card max-[1025px]:h-auto max-[1025px]:py-[6vw] max-[1025px]:px-[5vw] `}
            >
              <div>
                <Icon
                  size={50}
                  color={ORANGE}
                  strokeWidth={1.5}
                  className="mb-[2.5vw] max-[1025px]:mb-[4vw]"
                />

                <h3 className="text-[2vw] font-normal mb-[2.5vw] max-[1025px]:text-[4.2vw] max-md:text-[5.8vw] max-[1025px]:mb-[2vw]">
                  {reason.title}
                </h3>
                <p className="text-[1.25vw] leading-normal text-white/80 max-[1025px]:text-[2.8vw] max-md:text-[4vw]">
                  {reason.description}
                </p>
              </div>
              <div className="relative mt-[3vw] h-px w-full bg-white/20">
                <span
                  ref={(el) => {
                    lineRefs.current[index] = el;
                  }}
                  className="absolute inset-0 h-px w-full will-change-transform"
                  style={{ backgroundColor: ORANGE }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WhyWorkWithMe;
