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
        className={`mx-auto max-w-[1536px] px-[4.5vw] relative z-1 flex h-screen flex-col justify-end pb-[3vw] max-lg:h-auto max-lg:min-h-svh max-lg:pt-36 max-md:pt-32 max-md:max-w-full max-lg:max-w-full`}
      >
        <div className="flex items-end gap-8 max-lg:flex-col max-lg:items-stretch max-lg:gap-10 max-md:gap-8">
          <div className="min-w-0 flex-[1.25]">
            {/* <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase fadeup inline-flex items-center gap-2.5 text-[#9C9C9C]`}>
              <span className="live-dot" aria-hidden="true" />
              Vault Community · Waitlist open
            </p> */}
            <LineReveal
              as="h1"
              delay={0.3}
              className="max-w-[50vw] font-aeonik t96 leading-[1.02] font-normal tracking-[-.035em] wrap-break-word max-md:max-w-full max-lg:max-w-full"
            >
              Find The People Who Notice <span className="gradient-text-animate gradient-text-single">Two Dropped Frames.</span>
            </LineReveal>
          </div>
          <div className="fadeup flex min-w-0 flex-[.9] flex-col gap-[2vw] pb-[.6rem] max-lg:gap-6" data-fadeup-delay="0.2">
            <p className="max-w-[34vw] max-lg:max-w-[70vw] max-md:max-w-full text-[15px] leading-[1.65] text-[#c9c9c9]">
              Vault Community is a home for developers who treat motion as craft. Live teardowns, first
              access to new effects, honest critique, and a room full of people who care about the same
              details you do.
            </p>
            <WaitlistForm />
            <p className={`font-avenir text-[0.75vw] font-medium tracking-[.14em] uppercase text-[#6d6d6d]`}>Free to join · invites go out in waves</p>
          </div>
        </div>
      </section>
      <div className={`mx-auto max-w-[1536px] py-[2vw] relative z-1`} data-zone="crowd" data-hold-zone>
        <p
          aria-hidden="true"
          className={`font-avenir text-[0.75vw] font-medium tracking-[.14em] uppercase flex h-fit items-center justify-center pb-[4vh] text-white/35 max-md:text-[11px]`}
        >
          Every dot is a seat. Move through the crowd.
        </p>
      </div>
    </div>
  );
}
