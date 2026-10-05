"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import JoinedToast from "./JoinedToast";
import WaitlistForm from "./WaitlistForm";

// Final call: the crowd forms a ring around the form (data-zone="ring")
export default function CommunityJoin() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className={`mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] relative z-1 grid min-h-svh place-items-center pt-[10vh] pb-[14vh] text-center`} id="join" data-zone="ring" data-hold-zone>
      <div className="grid justify-items-center gap-[2.5vw] max-[1025px]:gap-6">
        <LineReveal as="h2" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] text-[clamp(4rem,13vw,12rem)]`}>
          Save your <span className="gradient-text-animate gradient-text-single">seat.</span>
        </LineReveal>
        <p className={`max-w-[30vw] max-[1025px]:max-w-[50ch] max-md:max-w-full text-base leading-[1.65] text-[#9C9C9C] fadeup mb-2.5`}>
          The room fills from the front. Join the waitlist and you’ll hear first, get invited first, and
          walk in as a founding member.
        </p>
        <WaitlistForm className="fadeup w-[min(520px,100%)]!" />
      </div>
      <JoinedToast />
    </section>
  );
}
