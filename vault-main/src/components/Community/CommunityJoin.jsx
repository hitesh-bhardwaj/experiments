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
    <section ref={rootRef} className={`mx-auto max-w-[1536px] px-[4.5vw] relative z-1 grid min-h-svh place-items-center pt-[10vh] pb-[14vh] text-center`} id="join" data-zone="ring" data-hold-zone>
      <div className="grid justify-items-center gap-[2.5vw] max-lg:gap-6">
        <LineReveal as="h2" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] text-[13vw]`}>
          Save Your <span className="gradient-text-animate gradient-text-single">Seat.</span>
        </LineReveal>
        <p className={`max-w-[30vw] max-lg:max-w-[60vw] max-md:max-w-full text-base leading-[1.65] text-[#9C9C9C] fadeup mb-2.5`}>
          The room fills from the front. Join the waitlist and you’ll hear first, get invited first, and
          walk in as a founding member.
        </p>
        <WaitlistForm className="fadeup w-[min(520px,100%)]!" />
      </div>
      <JoinedToast />
    </section>
  );
}
