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
    gsap.from(".chip", {
      opacity: 0,
      y: 18,
      duration: 1.4,
      ease: "expo.out",
      stagger: CHIP_STAGGER,
      scrollTrigger: { trigger: ".chips", start: "top 88%" },
    });
  }, { scope: rootRef });

  const toggle = (name, i) => {
    const next = stack.includes(name) ? stack.filter((s) => s !== name) : STACKS.filter((s) => s === name || stack.includes(s));
    setStack(next);
    getCrowd()?.highlight(new Set(next.map((s) => STACKS.indexOf(s))));
    sound?.note?.(i);
  };

  return (
    <section ref={rootRef} className="wrap stack-sec" id="stack" data-zone="crowd2">
      <p className="eyebrow label fadeup">Find your people</p>
      <LineReveal as="h2" className="display d2">
        What do you <span className="gradient-text-animate">build with?</span>
      </LineReveal>
      <p className="body stack-sub fadeup">
        Pick your stack. Watch your corner of the crowd light up. We’ll use it to match you with the
        right channels, teardowns and people.
      </p>
      <div className="chips" role="group" aria-label="Your stack">
        {STACKS.map((name, i) => (
          <button key={name} type="button" className="chip label" aria-pressed={stack.includes(name)} onClick={() => toggle(name, i)}>
            {name}
          </button>
        ))}
      </div>
      <p className="chip-read label" aria-live="polite">{readout(stack)}</p>
    </section>
  );
}
