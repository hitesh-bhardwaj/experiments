"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { mountExplodedTiers } from "./src/exploded-tiers";
import "./PricingHero.css";

const HEADER_OFFSET = 96; // keeps the target section's title clear of the fixed header

// Pricing hero from the "Exploded tiers" concept: headline + copy on the left,
// two glass plan stacks on the right. Hover a stack to take it apart, click to
// lock it open, press and hold anywhere to let Pro absorb Free. The page's
// billing store (components/Pricing/exploded/billing.js) broadcasts
// `vault:billing` so the stack titles follow the Monthly/Yearly toggle.
export default function PricingHero({ isIndia = false }) {
  useFadeUp();
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const { sound } = useInteraction() ?? {};

  useEffect(() => {
    if (!sectionRef.current || !stageRef.current) return undefined;
    const tiers = mountExplodedTiers(sectionRef.current, {
      THREE,
      sound,
      canvasParent: stageRef.current,
      currency: isIndia ? "INR" : "USD",
      yearly: true,
    });
    const onBilling = (e) => tiers.setBilling(!!e.detail?.yearly);
    window.addEventListener("vault:billing", onBilling);
    return () => {
      window.removeEventListener("vault:billing", onBilling);
      tiers.destroy();
    };
  }, [isIndia, sound]);

  return (
    <section ref={sectionRef} id="hero" className="pt-hero self-padd" aria-label="Pricing">
      <div ref={stageRef} className="pt-stage" aria-hidden="true" />
      <div className="pt-grid">
        <div className="pt-copy">
          <p className="pt-eyebrow fadeup">Pricing</p>
          <LineReveal as="h1" className="t96 text-white pt-title">
            Pick a plan. <span className="gradient-text-animate">Keep the code.</span>
          </LineReveal>
        </div>
        <div className="pt-side">
          <SplitLine as="p" start="top 120%" className="text24 text-[#C9C9C9]">
            Two plans, Free and Pro, with Pro billed monthly or yearly. Every component you
            copy lands in your repo and stays yours, even if you cancel.
          </SplitLine>
          <div className="pt-ctas fadeup">
            <ButtonV3 text="See the plans" href="#plans" scrollOffset={HEADER_OFFSET} variant="orange" className="max-sm:w-full max-sm:justify-center" />
            <ButtonV3 text="Help me choose" href="#finder" scrollOffset={HEADER_OFFSET} variant="outline" className="max-sm:w-full max-sm:justify-center" />
          </div>
        </div>
      </div>
      <p className="pt-hint" aria-hidden="true">
        Hover a plan to take it apart · click to lock · hold to merge
      </p>
    </section>
  );
}
