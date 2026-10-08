"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import JoinedToast from "./JoinedToast";
import WaitlistForm from "./WaitlistForm";

export default function CommunityJoin() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="relative z-1 flex min-h-svh items-center justify-center px-[4.5vw] pt-[10vh] pb-[14vh] text-center max-md:px-[6vw]" id="join" data-zone="ring" data-hold-zone>
      <div className="mx-auto flex w-full max-w-[1536px] flex-col items-center gap-[2.5vw] max-[1025px]:gap-[5vw]">
        <LineReveal as="h2" className="font-aeonik text-[13vw] font-normal leading-[1] tracking-tight">
          Save Your <span className="gradient-text-animate gradient-text-single">Seat.</span>
        </LineReveal>
        <p className="fadeup text22 w-[33%] leading-[1.6] text-foreground/60 max-[1025px]:w-[66%] max-md:w-full">
          The room fills from the front. Join the waitlist and you’ll hear first, get invited first, and
          walk in as a founding member.
        </p>
        <div className="fadeup w-[40%] max-[1025px]:w-[66%] max-md:w-full">
          <WaitlistForm />
        </div>
      </div>
      <JoinedToast />
    </section>
  );
}
