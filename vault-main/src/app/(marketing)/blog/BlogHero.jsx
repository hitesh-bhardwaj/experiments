"use client";

import dynamic from "next/dynamic";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

// The Fomosphere blob is WebGL-only and decorative, so it loads client-side after the hero content
const ParticleBlob = dynamic(() => import("@/components/Animations/ParticleBlob"), { ssr: false });

// Same layout as the pricing hero: full screen, content anchored to the bottom left
// (heading, intro copy below it) and the particle blob on the right. No background
// of its own, so the site's dotted grid + fluid shows through.
export default function BlogHero() {
  useFadeUp();

  return (
    <section id="blog-hero" className="relative isolate w-full overflow-hidden">
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <ParticleBlob preset="fomosphere" />
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
