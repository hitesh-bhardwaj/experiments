"use client";

import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

// Same layout as the homepage hero: full screen, content anchored to the bottom,
// heading on the left and the intro copy beside it. No background of its own, so
// the site's dotted grid + fluid shows through.
export default function BlogHero() {
  useFadeUp();

  return (
    <section id="blog-hero" className="relative w-full overflow-x-clip">
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1536px] flex-col justify-end px-[4.5vw] pt-[8vw] pb-[5vw] max-md:px-[6vw] max-md:pt-32 max-md:pb-10">
        <div className="flex items-end justify-between gap-[3vw] max-md:flex-col max-md:items-stretch max-md:gap-[5vw]">
          <LineReveal as="h1" className="t96 relative w-[58%] font-aeonik text-foreground max-md:w-full">
            Ideas, Craft, and Code From The <span className="gradient-text-animate">Vault.</span>
          </LineReveal>

          <div className="flex w-[32%] flex-col gap-[2vw] max-md:w-full max-md:gap-[5vw]">
            <SplitLine as="p" start="top 120%" className="text22 w-full font-avenir leading-[1.6] text-foreground/80">
              Design thinking, engineering breakdowns, and the reasoning behind every scroll system, cursor effect, and WebGL scene in Hyperiux Vault - written by the team designing and building them.
            </SplitLine>
          </div>
        </div>
      </div>
    </section>
  );
}
