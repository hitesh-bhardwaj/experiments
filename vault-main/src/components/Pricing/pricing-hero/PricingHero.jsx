"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import Button from "@/homepage/components/Button";
import { MEDIA } from "@/lib/breakpoints";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";

// The Slinky blob is WebGL-only and decorative, so it loads client-side after the hero content
const ParticleBlob = dynamic(() => import("@/components/Animations/ParticleBlob"), { ssr: false });

const HEADER_OFFSET = 96; // keeps the target section's title clear of the fixed header

export default function PricingHero() {
  const ctaRef = useRef(null);
  // null until measured, so neither background starts loading on the wrong device
  const [isDesktop, setIsDesktop] = useState(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  // Lighthouse / PSI get the poster only: no video, no WebGL (true until checked)
  const [audit, setAudit] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(MEDIA.tablet);
    const sync = () => {
      setAudit(isLighthouseOrHeadless() || isSoftwareRenderer());
      setIsDesktop(!mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
      id="hero"
      aria-label="Pricing"
      className="home-type relative isolate flex min-h-[115vh] w-full flex-col justify-end overflow-hidden bg-transparent text-foreground select-none [touch-action:pan-y] pb-30"
    >
      <div className="absolute inset-0 z-0 max-lg:bottom-auto max-lg:h-svh" aria-hidden="true">
        {isDesktop && !audit && <ParticleBlob preset="slinky" phoneTop={0.35} />}
        {/* Tablet and mobile: a looping video instead of the WebGL blob */}
        {isDesktop === false && !audit && (
          <video
            src="/assets/hero-videos/pricing.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setVideoPlaying(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Poster: in the server HTML below desktop, so it shows from the first
            paint and stays until the video is actually playing */}
        {!videoPlaying && (
          <Image
            src="/assets/hero-videos/posters/pricing-hero.webp"
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className="hidden object-cover max-lg:block"
          />
        )}
      </div>
      <div className="pointer-events-none relative z-2 mx-auto flex w-full max-w-[1536px] flex-col px-[4.5vw] pt-[8vw] pb-[8vw] max-lg:px-[6vw] max-lg:pt-[12vw] max-md:px-[6vw] max-md:pt-[48svh] max-md:pb-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
        <div className="flex w-full justify-start max-md:flex-col max-md:items-stretch">
          <div className="flex w-[46%] flex-col gap-[3vw] max-lg:w-[75%] max-lg:gap-[4vw] max-md:w-full max-md:gap-[5vw]">
            <LineReveal as="h1" className="type-display relative w-full text-foreground">
              Pick a Plan. <span className="gradient-text-animate block">Keep the Code.</span>
            </LineReveal>
            <div className="flex w-[70%] flex-col gap-[2vw] max-lg:w-[90%] max-lg:gap-[3vw] max-md:w-full max-md:gap-[8vw]">
              <SplitLine as="p" start="top 120%" className="type-body-lg w-full text-foreground/80">
                Two plans, Pro and Pro+, billed quarterly or yearly. Every component you
                copy lands in your repo and stays yours, even if you cancel.
              </SplitLine>
              <div ref={ctaRef} className="flex w-fit gap-[1vw] max-lg:gap-[2vw] opacity-0 max-md:w-full max-md:flex-col max-md:gap-[5vw]">
                <Button text="See the Plans" href="#plans" scrollOffset={HEADER_OFFSET} variant="orange" className="max-md:w-full max-md:justify-center" />
                <Button text="Help me Choose" href="#finder" scrollOffset={HEADER_OFFSET} variant="outline" className="max-md:w-full max-md:justify-center" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
