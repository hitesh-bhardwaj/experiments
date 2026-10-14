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
    <section ref={rootRef} className="section-x relative z-1 flex min-h-svh items-center justify-center py-[7%] text-center" id="join" data-zone="ring">
      <div className="site-container flex flex-col items-center gap-[calc(var(--cvw)*2.5)] max-lg:gap-[5vw]">
        <LineReveal as="h2" className="type-display">
          Save Your <span className="gradient-text-animate gradient-text-single">Seat.</span>
        </LineReveal>
        <p className="fadeup type-body-lg w-[33%] text-foreground/80 max-lg:w-[66%] max-md:w-full">
          The room fills from the front. Join the waitlist and you’ll hear first, get invited first, and
          walk in as a founding member.
        </p>
        <div className="fadeup w-[40%] max-lg:w-[66%] max-md:w-full">
          <WaitlistForm />
        </div>
      </div>
      <JoinedToast />
    </section>
  );
}
