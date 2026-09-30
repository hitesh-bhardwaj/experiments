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
    <section ref={rootRef} className="wrap join" id="join" data-zone="ring">
      <div className="join-inner">
        <p className="eyebrow label fadeup">Waitlist open</p>
        <LineReveal as="h2" className="display join-h">
          Save your <span className="gradient-text-animate">seat.</span>
        </LineReveal>
        <p className="body join-sub fadeup">
          The room fills from the front. Join the waitlist and you’ll hear first, get invited first, and
          walk in as a founding member.
        </p>
        <WaitlistForm className="fadeup" />
      </div>
      <JoinedToast />
    </section>
  );
}
