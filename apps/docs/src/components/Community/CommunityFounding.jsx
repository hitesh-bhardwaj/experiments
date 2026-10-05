"use client";

import { useEffect, useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { PERKS, STEPS } from "./community-data";
import { createFluidField } from "@/homepage-v3/lib/fluid-field";

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
    <section ref={rootRef} className="mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] pt-[clamp(7rem,18vh,11rem)]" id="founding" aria-labelledby="fd-h">
      <div>
        {/* <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase inline-flex items-center gap-2.5 text-[#9C9C9C] before:size-[5px] before:rounded-full before:bg-primary before:content-[''] text-[#6B6B6B] fadeup`}>Founding members</p> */}
        <LineReveal as="h2" id="fd-h" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] mt-[2vw] text-[clamp(2.2rem,4.6vw,4.6rem)] max-w-[35vw] max-[1025px]:max-w-[70vw] max-md:mt-4 max-md:max-w-full`}>
          The first cohort <span className="gradient-text-animate gradient-text-single">shapes the room.</span>
        </LineReveal>
      </div>
      <div className="mt-[clamp(3rem,8vh,5rem)] grid grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] items-start gap-[clamp(1.5rem,4vw,4rem)] max-[1025px]:grid-cols-1">
        <div className="fadeup relative isolate overflow-hidden bg-[#1D1D1D] p-[clamp(1.8rem,3vw,2.6rem)] text-[#F4F4F4]">
          <CardFluid />
          <ul className="relative grid gap-[2vw] max-[1025px]:gap-5">
            {PERKS.map((perk) => (
              <li key={perk.title} className="grid grid-cols-[8px_minmax(0,1fr)] items-center gap-x-4 gap-y-1">
                {/* diamond sits in its own column, centred on the title's line */}
                <i aria-hidden="true" className="size-2 rotate-45 bg-primary" />
                <b className="font-aeonik text-[clamp(1.1rem,1.5vw,1.35rem)] font-medium tracking-[-.02em]">{perk.title}</b>
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
