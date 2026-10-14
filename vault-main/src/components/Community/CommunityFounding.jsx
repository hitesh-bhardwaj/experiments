"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import CardFluid from "@/homepage/components/CardFluid";

const PERKS = [
  { title: "A founding badge", text: "Permanent, visible, earned by being early." },
  { title: "A direct line to the Hyperiux team", text: "The people who build Vault, in the same room as you." },
  { title: "A vote on the roadmap from day one", text: "What gets built next starts with you." },
  { title: "First access to new effects", text: "See every drop before it reaches the public library." },
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
    <section ref={rootRef} className="section-x py-[7%]" id="founding" aria-labelledby="fd-h">
      <div className="site-container flex flex-col gap-[calc(var(--cvw)*5)] max-md:gap-[10vw]">
      <LineReveal as="h2" id="fd-h" className="type-h1 w-[50%] max-lg:w-[77%] max-md:w-full">
        The First Cohort <span className="gradient-text-animate gradient-text-single">Shapes the Room.</span>
      </LineReveal>
      <div className="flex items-start justify-between gap-[calc(var(--cvw)*4)] max-lg:flex-col">
        <div className="fadeup relative isolate w-[52%] overflow-hidden bg-ink p-[calc(var(--cvw)*3)] text-white max-lg:w-full max-md:p-[7vw]">
          <CardFluid />
          <ul className="relative flex flex-col gap-[calc(var(--cvw)*3)] max-lg:gap-[5vw]">
            {PERKS.map((perk) => (
              <li key={perk.title} className="flex items-start gap-[calc(var(--cvw)*1)] max-md:gap-[4vw]">
                {/* A box one title-line tall (type-h3, line height 1.25) centres the diamond on the title */}
                <span aria-hidden="true" className="type-h3 flex h-[1.25em] shrink-0 items-center">
                  <i className="block size-[calc(var(--cvw)*0.6)] rotate-45 bg-primary max-md:size-[2vw]" />
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <b className="type-h3 font-avenir font-medium!">{perk.title}</b>
                  <span className="type-body text-white/80">{perk.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        {/* Rows padded by half the perks' gap, and inset to start level with the first perk */}
        <ol className="flex w-[43%] flex-col pt-[calc(var(--cvw)*1.5)] max-lg:w-full max-lg:pt-0">
          {STEPS.map((step, i) => (
            <li key={step.title} className="fadeup flex gap-[calc(var(--cvw)*0.8)] border-t border-black/10 py-[calc(var(--cvw)*1.5)] last:border-b max-lg:py-[2.5vw] max-md:gap-[3vw]" data-fadeup-delay={i * 0.1}>
              {/* Same one-line box as the diamonds, so the number centres on the title */}
              <span className="type-h3 flex h-[1.25em] w-[calc(var(--cvw)*3.3)] shrink-0 items-center max-md:w-[12vw]">
                <span className="type-label text-primary">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <b className="type-h3 font-avenir font-medium!">{step.title}</b>
                <p className="type-body text-black/60">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      </div>
    </section>
  );
}
