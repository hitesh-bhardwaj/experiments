"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { mountExplodedTiers } from "./src/exploded-tiers";

const HEADER_OFFSET = 96; // keeps the target section's title clear of the fixed header


export default function PricingHero({ isIndia = false }) {
  useFadeUp();
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const ctaRef = useRef(null);
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

  // Plays on load (no scroll trigger) with the same timing as the paragraph's SplitLine, so the
  // buttons rise together with the heading and text instead of trailing them.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return undefined;
    gsap.set(el, { opacity: 0, y: "100%" });
    let tween;
    const play = () => {
      tween = gsap.to(el, {
        opacity: 1,
        y: 0,
        delay:1,
        duration: 0.9,
        ease: "power3.out",
      });
    };
    const loading = () =>
      document.body.classList.contains("loader-active") || window.__HYPERIUX_LOADER_RUNNING__ === true;
    let poll;
    if (loading()) {
      poll = window.setInterval(() => {
        if (!loading()) {
          window.clearInterval(poll);
          play();
        }
      }, 60);
    } else {
      play();
    }
    return () => {
      window.clearInterval(poll);
      tween?.kill();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Pricing"
      data-hold-zone
      data-cursor-label="Hold to explore"
      className="home-type relative mx-auto w-full max-w-[1536px] isolate flex min-h-[115vh] flex-col justify-end overflow-hidden bg-transparent pt-[8vw]! pb-[3vw]! text-foreground select-none [touch-action:pan-y] [&.pt-hover]:cursor-pointer max-md:pt-[48svh]! px-[4.5vw] max-md:px-[calc(var(--cvw)*7)]"
    >
      <div
        ref={stageRef}
        className="absolute inset-0 z-0 [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:block [&_canvas]:size-full"
        aria-hidden="true"
      />
      <div className="pointer-events-none pb-[4vw] max-lg:pb-10 relative z-2 flex items-end justify-between gap-[2vw] max-md:flex-col max-md:items-stretch max-md:gap-[5vw] [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <div className="w-[67%] max-md:w-full ">
          <LineReveal as="h1" className="relative font-aeonik t96 text-[6.4vw]! max-md:text-[13vw]! mt-[1.8vw] leading-[1.3]! text-foreground">
            Pick a plan. <span className="gradient-text-animate block">Keep the code.</span>
          </LineReveal>
        </div>
        <div className="relative   flex w-[30%] flex-col gap-[1.8vw] pb-[1.5vw] max-md:top-0 max-md:w-full max-md:gap-[4vw]">
          <SplitLine as="p" start="top 120%" className={`text22 font-avenir text-[1.1vw]! leading-[1.6]! max-md:text-[2.2vw]! max-sm:text-[4.1vw]! text-foreground max-md:w-[75%] max-sm:w-full max-md:text-left`}>
            Two plans, Pro and Pro+, billed monthly or yearly. Every component you
            copy lands in your repo and stays yours, even if you cancel.
          </SplitLine>
          <div ref={ctaRef} className="flex opacity-0 flex-wrap gap-[0.8vw] max-md:gap-[3vw]">
            <ButtonV3 text="See the plans" href="#plans" scrollOffset={HEADER_OFFSET} variant="orange" className="max-sm:w-full max-sm:justify-center" />
            <ButtonV3 text="Help me choose" href="#finder" scrollOffset={HEADER_OFFSET} variant="outline" className="max-sm:w-full max-sm:justify-center" />
          </div>
        </div>
      </div>
      <div className="fadeup relative z-2 mt-[4.5vw] max-md:pt-[7vw] max-md:pb-[8vw]" aria-hidden="true">
        <p className="text-center text-[0.7vw] font-semibold uppercase tracking-widest text-foreground/40 max-md:text-[2.8vw]">
          Hover a plan to take it apart · click to lock · hold to merge
        </p>
      </div>
    </section>
  );
}
