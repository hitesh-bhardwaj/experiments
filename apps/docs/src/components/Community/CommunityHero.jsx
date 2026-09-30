"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import WaitlistForm from "./WaitlistForm";

export default function CommunityHero() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <div ref={rootRef}>
      <section className="cm-hero-sec wrap" id="hero" data-zone="crowd">
        <div className="hero-grid">
          <div>
            <p className="eyebrow label fadeup">
              <span className="live-dot" aria-hidden="true" />
              Vault Community · Waitlist open
            </p>
            <LineReveal as="h1" className="display d1" delay={0.3}>
              Find the people who notice <span className="gradient-text-animate">two dropped frames.</span>
            </LineReveal>
          </div>
          <div className="hero-side fadeup" data-fadeup-delay="0.2">
            <p className="body">
              Vault Community is a home for developers who treat motion as craft. Live teardowns, first
              access to new effects, honest critique, and a room full of people who care about the same
              details you do.
            </p>
            <WaitlistForm />
            <p className="wl-note label">Free to join · invites go out in waves</p>
          </div>
        </div>
      </section>
      <div className="wrap stir-wrap" data-zone="crowd">
        <p className="stir label" aria-hidden="true">Every dot is a seat. Move through the crowd.</p>
      </div>
    </div>
  );
}
