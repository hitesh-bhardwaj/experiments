"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import WaitlistForm from "./WaitlistForm";

// Markup and values from the Vault Community prototype (.hero / .cm-hero /
// .hero-side / .stir), as Tailwind.
export default function CommunityHero() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <div ref={rootRef}>
      <section
        id="hero"
        data-zone="crowd"
        data-hold-zone
        className={`mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] relative z-1 grid h-screen content-end pb-[clamp(3rem,10vh,7rem)] max-[1025px]:h-auto max-[1025px]:min-h-svh max-[1025px]:pt-36 max-md:pt-32 max-md:max-w-full max-[1025px]:max-w-full`}
      >
        <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,.9fr)] items-end gap-8 max-[1025px]:grid-cols-1 max-[1025px]:gap-10 max-md:gap-8">
          <div>
            {/* <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase fadeup inline-flex items-center gap-2.5 text-[#9C9C9C]`}>
              <span className="live-dot" aria-hidden="true" />
              Vault Community · Waitlist open
            </p> */}
            <LineReveal
              as="h1"
              delay={0.3}
              className="max-w-[50vw] font-aeonik text-[clamp(2.6rem,6.4vw,6.6rem)] leading-[1.02] font-normal tracking-[-.035em] wrap-break-word max-md:max-w-full max-[1025px]:max-w-full"
            >
              Find the people who notice <span className="gradient-text-animate gradient-text-single">two dropped frames.</span>
            </LineReveal>
          </div>
          <div className="fadeup grid gap-[2vw] pb-[.6rem] max-[1025px]:gap-6" data-fadeup-delay="0.2">
            <p className="max-w-[34vw] max-[1025px]:max-w-[70vw] max-md:max-w-full text-[15px] leading-[1.65] text-[#c9c9c9]">
              Vault Community is a home for developers who treat motion as craft. Live teardowns, first
              access to new effects, honest critique, and a room full of people who care about the same
              details you do.
            </p>
            <WaitlistForm />
            <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase text-[#6d6d6d]`}>Free to join · invites go out in waves</p>
          </div>
        </div>
      </section>
      <div className={`mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] relative z-1`} data-zone="crowd" data-hold-zone>
        <p
          aria-hidden="true"
          className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase grid h-fit items-center justify-items-center pb-[4vh] text-[rgba(244,244,244,.35)]`}
        >
          Every dot is a seat. Move through the crowd.
        </p>
      </div>
    </div>
  );
}
