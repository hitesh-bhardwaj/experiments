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
        className="relative z-1 flex h-screen w-full flex-col justify-end max-[1025px]:h-auto max-[1025px]:min-h-svh"
      >
        <div className="mx-auto flex w-full max-w-[1536px] items-end justify-between gap-[3vw] px-[4.5vw] pb-[3vw] max-[1025px]:flex-col max-[1025px]:items-stretch max-[1025px]:gap-[5vw] max-[1025px]:pt-36 max-md:px-[6vw] max-md:pt-32">
          <LineReveal
            as="h1"
            delay={0.3}
            className="type-display w-[58%] wrap-break-word max-[1025px]:w-full"
          >
            Find The People Who Notice <span className="gradient-text-animate gradient-text-single">Two Dropped Frames.</span>
          </LineReveal>
          <div className="fadeup flex w-[32%] flex-col gap-[2vw] max-[1025px]:w-full max-[1025px]:gap-[5vw]" data-fadeup-delay="0.2">
            <p className="type-body-lg w-full text-foreground/80 max-[1025px]:w-[70%] max-md:w-full">
              Vault Community is a home for developers who treat motion as craft. Live teardowns, first
              access to new effects, honest critique, and a room full of people who care about the same
              details you do.
            </p>
            <WaitlistForm />
            <p className="type-label text-foreground/40">Free to join · invites go out in waves</p>
          </div>
        </div>
      </section>
      <div className="relative z-1 mx-auto w-full max-w-[1536px] px-[4.5vw] pt-[2vw] pb-[4vh] max-md:px-[6vw]" data-zone="crowd" data-hold-zone>
        <p
          aria-hidden="true"
          className="type-label flex items-center justify-center text-foreground/35"
        >
          Every dot is a seat. Move through the crowd.
        </p>
      </div>
    </div>
  );
}
