"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { MEDIA } from "@/lib/breakpoints";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";

// The Fomosphere blob is WebGL-only and decorative, so it loads client-side after the hero content
const ParticleBlob = dynamic(() => import("@/components/Animations/ParticleBlob"), { ssr: false });

// Same layout as the pricing hero: full screen, content anchored to the bottom left
// (heading, intro copy below it) and the particle blob on the right. No background
// of its own, so the site's dotted grid + fluid shows through.
export default function BlogHero() {
  useFadeUp();
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

  return (
    <section id="blog-hero" className="relative isolate w-full overflow-hidden">
      <div className="absolute inset-0 z-0 max-lg:top-[18vw] max-lg:bottom-auto max-lg:h-svh max-md:top-0" aria-hidden="true">
        {isDesktop && !audit && <ParticleBlob preset="fomosphere" phoneTop={0.4} />}
        {/* Tablet and mobile: a looping video instead of the WebGL blob */}
        {isDesktop === false && !audit && (
          <video
            src="/assets/hero-videos/blog.mp4"
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
            src="/assets/hero-videos/posters/blog-hero.webp"
            alt=""
            fill
            sizes="100vw"
            quality={90}
            className="hidden object-cover max-lg:block"
          />
        )}
      </div>
      <div className="pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[1536px] flex-col justify-end px-[4.5vw] pt-[8vw] pb-[5vw] max-lg:px-[6vw] max-lg:pt-[12vw] max-md:px-[6vw] max-md:pt-[48svh] max-md:pb-10 [&_a]:pointer-events-auto">
        <div className="flex w-[46%] flex-col gap-[3vw] max-lg:w-[75%] max-lg:gap-[4vw] max-md:w-full max-md:gap-[5vw]">
          <LineReveal as="h1" className="type-display relative w-full text-foreground">
            Ideas, Craft, and Code From The <span className="gradient-text-animate">Vault.</span>
          </LineReveal>
          <SplitLine as="p" start="top 120%" className="type-body-lg w-[70%] text-foreground/80 max-lg:w-[90%] max-md:w-full">
            Design thinking, engineering breakdowns, and the reasoning behind every scroll system, cursor effect, and WebGL scene in Hyperiux Vault - written by the team designing and building them.
          </SplitLine>
        </div>
      </div>
    </section>
  );
}
