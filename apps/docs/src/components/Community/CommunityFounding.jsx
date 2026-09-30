"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { PERKS, STEPS } from "./community-data";

export default function CommunityFounding() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="founding" id="founding" aria-labelledby="fd-h">
      <div className="fd-head">
        <p className="eyebrow label fadeup">Founding members</p>
        <LineReveal as="h2" id="fd-h" className="display d2">
          The first cohort <span className="gradient-text-animate">shapes the room.</span>
        </LineReveal>
      </div>
      <div className="fd-grid">
        <div className="fd-card fadeup">
          <ul className="fd-perks">
            {PERKS.map((perk) => (
              <li key={perk.title}><b>{perk.title}</b><span>{perk.text}</span></li>
            ))}
          </ul>
        </div>
        <ol className="fd-steps">
          {STEPS.map((step, i) => (
            <li key={step.title} className="fadeup" data-fadeup-delay={i * 0.1}>
              <span className="label">{String(i + 1).padStart(2, "0")}</span>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
