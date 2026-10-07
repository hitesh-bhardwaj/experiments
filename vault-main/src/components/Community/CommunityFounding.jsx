"use client";

import { useEffect, useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { createFluidField } from "@/homepage-v3/lib/fluid-field";

const PERKS = [
  { title: "A founding badge", text: "Permanent, visible, earned by being early." },
  { title: "A direct line to the Hyperiux team", text: "The people who build Vault, in the same room as you." },
  { title: "A vote on the roadmap from day one", text: "What gets built next starts with you." },
  // NEEDS PRODUCT CONFIRMATION: the concept left the founding offer as a placeholder
  { title: "[Founding offer on Vault Pro]", text: "[To confirm: e.g. a founding-member discount or extended trial.]" },
];

const STEPS = [
  { title: "Join the waitlist", text: "Thirty seconds. Just your email and your stack." },
  { title: "Get your invite", text: "We open the doors in small waves, waitlist first, so every conversation stays good." },
  { title: "Walk in", text: "Your first teardown and a room full of people who get it are waiting inside." },
];

// The site's dotted grid + fluid ink, kept inside the perks card: the pointer
// stirs the ink and pushes the dots (same set-up as the homepage Text demo)
const CARD_FLUID = { cell: 18, iterations: 8, scrollDrift: false, dyeDecay: 0.985, pointerForce: 0.25, pointerInk: 0.008 };

function CardFluid() {
  const dotsRef = useRef(null);
  const inkRef = useRef(null);

  useEffect(() => {
    const fluid = createFluidField({ ink: inkRef.current, dots: dotsRef.current, ...CARD_FLUID }).start();
    return () => fluid.destroy();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-1" aria-hidden="true">
      <canvas ref={dotsRef} className="absolute inset-0 block size-full" />
      <canvas ref={inkRef} className="absolute inset-0 block size-full opacity-60 mix-blend-screen blur-[14px] saturate-[1.2]" />
    </div>
  );
}

export default function CommunityFounding() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="mx-auto max-w-[1536px] px-[4.5vw] py-[7vw] px-[4.5vw]" id="founding" aria-labelledby="fd-h">
      <div>
        {/* <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase inline-flex items-center gap-2.5 text-[#9C9C9C] before:size-[5px] before:rounded-full before:bg-primary before:content-[''] text-[#6B6B6B] fadeup`}>Founding members</p> */}
        <LineReveal as="h2" id="fd-h" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] mt-[2vw] text80 max-md:text-[9vw] max-w-[35vw] max-[1025px]:max-w-[70vw] max-md:mt-4 max-md:max-w-full`}>
          The First Cohort <span className="gradient-text-animate gradient-text-single">Shapes the Room.</span>
        </LineReveal>
      </div>
      <div className="mt-[5vw] grid grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-start gap-[4vw] max-[1025px]:grid-cols-1">
        <div className="fadeup relative isolate overflow-hidden bg-[#1D1D1D] p-[3vw] max-md:p-7 text-[#F4F4F4]">
          <CardFluid />
          <ul className="relative grid gap-[2vw] max-[1025px]:gap-5">
            {PERKS.map((perk) => (
              <li key={perk.title} className="grid grid-cols-[8px_minmax(0,1fr)] items-center gap-x-4 gap-y-1">
                {/* diamond sits in its own column, centred on the title's line */}
                <i aria-hidden="true" className="size-2 rotate-45 bg-primary" />
                <b className="font-aeonik text-[1.5vw] max-md:text-lg font-medium tracking-[-.02em]">{perk.title}</b>
                <span className="col-start-2 text-[14.5px] text-[#a9a9a9]">{perk.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <ol>
          {STEPS.map((step, i) => (
            <li key={step.title} className={`fadeup grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-[rgba(29,29,29,.1)] py-[22px] last:border-b`} data-fadeup-delay={i * 0.1}>
              <span className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase row-span-2 pt-[5px] text-primary`}>{String(i + 1).padStart(2, "0")}</span>
              <b className="font-aeonik text-xl font-medium tracking-[-.02em]">{step.title}</b>
              <p className={`text-[#6B6B6B] text-[15px]`}>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
