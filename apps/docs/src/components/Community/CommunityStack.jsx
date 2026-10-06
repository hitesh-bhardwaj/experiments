"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { STACKS } from "./community-data";
import { getCrowd, setStack, useCommunity } from "./community-store";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CHIP_STAGGER = 0.05;

// "Kotlin people, lighting up." / "React, GSAP and Vue people, lighting up."
function readout(names) {
  if (!names.length) return "";
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  return `${list} people, lighting up.`;
}

// Each chip owns one tenth of the crowd (CROWD_GROUPS in src/crowd.js), so
// picking it lights that share of the swarm
export default function CommunityStack() {
  const rootRef = useRef(null);
  const { stack } = useCommunity();
  const { sound } = useInteraction() ?? {};

  useFadeUp(rootRef);

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from("[data-chip]", {
      opacity: 0,
      y: 18,
      duration: 1.4,
      ease: "expo.out",
      stagger: CHIP_STAGGER,
      scrollTrigger: { trigger: "[data-chips]", start: "top 88%" },
    });
  }, { scope: rootRef });

  const toggle = (name, i) => {
    const next = stack.includes(name) ? stack.filter((s) => s !== name) : STACKS.filter((s) => s === name || stack.includes(s));
    setStack(next);
    getCrowd()?.highlight(new Set(next.map((s) => STACKS.indexOf(s))));
    sound?.note?.(i);
  };

  return (
    <section ref={rootRef} className={`mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] relative z-1 py-[clamp(12rem,30vh,18rem)] text-center max-md:py-28`} id="stack" data-zone="crowd2" data-hold-zone>
      {/* <p className="eyebrow label fadeup">Find your people</p> */}
      <LineReveal as="h2" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] mt-[22px] text-[clamp(2.2rem,4.6vw,4.6rem)] mx-auto`}>
        What do you <span className="gradient-text-animate gradient-text-single">build with?</span>
      </LineReveal>
      <p className={`max-w-[40vw] max-[1025px]:max-w-[70vw] max-md:max-w-full text-base leading-[1.65] text-[#9C9C9C] fadeup mx-auto mt-[3vw] max-md:mt-6`}>
        Pick your stack. Watch your corner of the crowd light up. We’ll use it to match you with the
        right channels, teardowns and people.
      </p>
      <div data-chips className="mx-auto mt-11 flex max-w-[760px] flex-wrap justify-center gap-2.5" role="group" aria-label="Your stack">
        {STACKS.map((name, i) => (
          <button
            key={name}
            type="button"
            data-chip
            aria-pressed={stack.includes(name)}
            onClick={() => toggle(name, i)}
            className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase h-11 px-5 backdrop-blur-[10px] transition-[background-color,color,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${stack.includes(name) ? "bg-primary text-[#141414] shadow-[0_10px_30px_-10px_rgba(255,107,0,.7)]" : "bg-[rgba(20,20,20,.55)] text-[#d8d8d8] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.6)]"}`}
          >
            {name}
          </button>
        ))}
      </div>
      <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase mt-[26px] min-h-[1.4em] text-[#FFB27A]`} aria-live="polite">{readout(stack)}</p>
    </section>
  );
}
