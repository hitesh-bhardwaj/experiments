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
        className="relative z-1 flex h-screen w-full flex-col justify-end max-lg:h-auto max-lg:min-h-svh"
      >
        {/* Copy on the left, stacked; the crowd's blob sits on the right */}
        <div className="mx-auto flex w-full max-w-[1536px] px-[4.5vw] pb-[3vw] max-lg:pt-36 max-lg:pb-[5vw] max-md:px-[6vw] max-md:pt-[48svh]">
          <div className="flex w-[60%] flex-col gap-[3vw] max-lg:w-[75%] max-lg:gap-[4vw] max-md:w-full max-md:gap-[5vw]">
            <LineReveal
              as="h1"
              delay={0.3}
              className="type-display w-full wrap-break-word"
            >
              Find The People Who Notice <span className="gradient-text-animate gradient-text-single">Two Dropped Frames.</span>
            </LineReveal>
            <div className="fadeup flex w-[80%] flex-col gap-[2vw] max-lg:w-[90%] max-lg:gap-[3vw] max-md:w-full max-md:gap-[5vw]" data-fadeup-delay="0.2">
              <p className="type-body-lg w-full text-foreground/80">
                Vault Community is a home for developers who treat motion as craft. Live teardowns, first
                access to new effects, honest critique, and a room full of people who care about the same
                details you do.
              </p>
              <WaitlistForm />
              <p className="type-label text-foreground/40">Free to join · Invites go out in Waves</p>
            </div>
          </div>
        </div>
      </section>
      <div className="relative z-1 mx-auto w-full max-w-[1536px] px-[4.5vw] pt-[2vw] pb-[4vh] max-md:px-[6vw]" data-zone="crowd">
        <p
          aria-hidden="true"
          className="type-label flex items-center max-md:justify-start justify-center text-foreground/35"
        >
          Every dot is a seat. Move through the crowd.
        </p>
      </div>
    </div>
  );
}
