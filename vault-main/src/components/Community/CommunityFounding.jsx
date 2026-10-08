"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import CardFluid from "@/homepage/components/CardFluid";

const PERKS = [
  { title: "A founding badge", text: "Permanent, visible, earned by being early." },
  { title: "A direct line to the Hyperiux team", text: "The people who build Vault, in the same room as you." },
  { title: "A vote on the roadmap from day one", text: "What gets built next starts with you." },
  // NEEDS PRODUCT CONFIRMATION: the concept left the founding offer as a placeholder
  { title: "[Founding offer on Vault Pro]", text: "[To confirm: e.g. a founding-member discount or extended trial.]" },
];

const STEPS = [
  { title: "Join the waitlist", text: "Thirty seconds. Just your email and your stack." },
  { title: "Get your invite", text: "We open the doors in small waves, waitlist first, so every conversation stays good." },
  { title: "Walk in", text: "Your first teardown and a room full of people who get it are waiting inside." },
];

export default function CommunityFounding() {
  const rootRef = useRef(null);
  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="mx-auto flex w-full max-w-[1536px] flex-col gap-[5vw] px-[4.5vw] py-[7%] max-md:gap-[10vw] max-md:px-[6vw]" id="founding" aria-labelledby="fd-h">
      <LineReveal as="h2" id="fd-h" className="type-h1 w-[50%] max-[1025px]:w-[77%] max-md:w-full">
        The First Cohort <span className="gradient-text-animate gradient-text-single">Shapes the Room.</span>
      </LineReveal>
      <div className="flex items-start justify-between gap-[4vw] max-[1025px]:flex-col">
        <div className="fadeup relative isolate w-[52%] overflow-hidden bg-ink p-[3vw] text-light max-[1025px]:w-full max-md:p-[7vw]">
          <CardFluid />
          <ul className="relative flex flex-col gap-[2vw] max-[1025px]:gap-[5vw]">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex items-start gap-[1vw] max-md:gap-[4vw]">
                {/* diamond sits on the title's line */}
                <i aria-hidden="true" className="relative top-[0.6vw] size-[0.6vw] shrink-0 rotate-45 bg-primary max-md:top-[2.2vw] max-md:size-[2vw]" />
                <div className="flex min-w-0 flex-col gap-1">
                  <b className="type-h3 font-medium!">{perk.title}</b>
                  <span className="type-body text-light/60">{perk.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <ol className="flex w-[43%] flex-col max-[1025px]:w-full">
          {STEPS.map((step, i) => (
            <li key={step.title} className="fadeup flex gap-[0.8vw] border-t border-black/10 py-[1.5vw] last:border-b max-md:gap-[3vw] max-md:py-[5.6vw]" data-fadeup-delay={i * 0.1}>
              <span className="type-label relative top-[0.3vw] w-[3.3vw] shrink-0 text-primary max-md:top-[1vw] max-md:w-[12vw]">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex min-w-0 flex-col gap-1">
                <b className="type-h3 font-medium!">{step.title}</b>
                <p className="type-body text-black/60">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
