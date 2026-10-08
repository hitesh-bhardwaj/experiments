"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import Button from "@/homepage/components/Button";
import { useInteraction } from "@/homepage/components/InteractionProvider";
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
      className="home-type relative isolate flex min-h-[115vh] w-full flex-col justify-end overflow-hidden bg-transparent text-foreground select-none [touch-action:pan-y] [&.pt-hover]:cursor-pointer"
    >
      <div
        ref={stageRef}
        className="absolute inset-0 z-0 [&_canvas]:absolute [&_canvas]:inset-0 [&_canvas]:block [&_canvas]:size-full"
        aria-hidden="true"
      />
      <div className="pointer-events-none relative z-2 mx-auto flex w-full max-w-[1536px] flex-col gap-[8vw] px-[4.5vw] pt-[8vw] pb-[3vw] max-md:gap-[12vw] max-md:px-[6vw] max-md:pt-[48svh] max-md:pb-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <div className="flex items-end justify-between gap-[3vw] max-md:flex-col max-md:items-stretch max-md:gap-[5vw]">
          <LineReveal as="h1" className="t96 relative w-[58%] font-aeonik text-foreground max-md:w-full">
            Pick a plan. <span className="gradient-text-animate block">Keep the code.</span>
          </LineReveal>
          <div className="flex w-[32%] flex-col gap-[2vw] max-md:w-full max-md:gap-[5vw]">
            <SplitLine as="p" start="top 120%" className="text22 w-full font-avenir leading-[1.6] text-foreground/80">
              Two plans, Pro and Pro+, billed monthly or yearly. Every component you
              copy lands in your repo and stays yours, even if you cancel.
            </SplitLine>
            <div ref={ctaRef} className="flex w-fit gap-[1vw] opacity-0 max-md:w-full max-md:flex-col max-md:gap-[5vw]">
              <Button text="See the plans" href="#plans" scrollOffset={HEADER_OFFSET} variant="orange" className="max-md:w-full max-md:justify-center" />
              <Button text="Help me choose" href="#finder" scrollOffset={HEADER_OFFSET} variant="outline" className="max-md:w-full max-md:justify-center" />
            </div>
          </div>
        </div>
        <p className="fadeup text-center text-[0.7vw] font-semibold uppercase tracking-[0.1em] text-foreground/40 max-md:text-[2.8vw]" aria-hidden="true">
          Hover a plan to take it apart · click to lock · hold to merge
        </p>
      </div>
    </section>
  );
}
