"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { getCrowd, setStack, useCommunity } from "./community-store";

const STACKS = ["React", "Next.js", "GSAP", "Three.js", "WebGL", "Motion", "Lenis", "Vue", "Svelte", "Webflow"];

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
    <section ref={rootRef} className="relative z-1 px-[4.5vw] py-[18vw] text-center max-md:px-[6vw] max-md:py-28" id="stack" data-zone="crowd2" data-hold-zone>
      <div className="mx-auto flex w-full max-w-[1536px] flex-col items-center gap-[3vw] max-md:gap-[6vw]">
        <LineReveal as="h2" className="type-h1">
          What Do You <span className="gradient-text-animate gradient-text-single">Build With?</span>
        </LineReveal>
        <p className="fadeup type-body-lg w-[45%] text-foreground/60 max-[1025px]:w-[77%] max-md:w-full">
          Pick your stack. Watch your corner of the crowd light up. We’ll use it to match you with the
          right channels, teardowns and people.
        </p>
        <div className="flex w-[58%] flex-col items-center gap-[1.8vw] max-[1025px]:w-full max-md:gap-[6vw]">
          <div data-chips className="flex flex-wrap justify-center gap-[0.7vw] max-md:gap-[2.5vw]" role="group" aria-label="Your stack">
            {STACKS.map((name, i) => (
              <button
                key={name}
                type="button"
                data-chip
                aria-pressed={stack.includes(name)}
                onClick={() => toggle(name, i)}
                className={`type-label h-11 px-5 backdrop-blur-lg transition-[background-color,color,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${stack.includes(name) ? "bg-primary text-background shadow-[0_0.7vw_2vw_-0.7vw_color-mix(in_srgb,var(--primary)_70%,transparent)]" : "bg-background/50 text-foreground/80 ring-1 ring-inset ring-foreground/15 hover:ring-primary/60"}`}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="type-label text-foreground/60" aria-live="polite">{readout(stack)}</p>
        </div>
      </div>
    </section>
  );
}
