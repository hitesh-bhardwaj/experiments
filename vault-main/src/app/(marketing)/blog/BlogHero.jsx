"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

const ASCII_FALLBACK = <div className="absolute inset-0 bg-background" aria-hidden />;

// Same WebGL-only treatment the homepage hero gives it - the canvas reads a
// video texture, so it has no business in the server bundle.
const CubeBackgroundAscii = dynamic(
  () => import("@/homepage-v3/components/CubeBackgroundAscii"),
  { ssr: false, loading: () => ASCII_FALLBACK },
);


const DARK_FIELD_BASE = {
  invert: false,
  brightnessMap: 0.8,
  rampLow: 0,
  rampHigh: 0.63,
};


const VIDEO_CONFIGS = {
  "/test1.mp4": {
    ...DARK_FIELD_BASE,
    levelsLow: 0.185,
    levelsHigh: 0.6,
    brightnessMap: 0.95,
    videoScale: 0.8,
    videoOffsetX: 0.31,
  },
  "/test2.mp4": { ...DARK_FIELD_BASE, levelsLow: 0.06, levelsHigh: 0.5 },
};

const VIDEO_SRC = "/test1.mp4";
const VIDEO_CONFIG = VIDEO_CONFIGS[VIDEO_SRC];

export default function BlogHero() {
  useFadeUp();

  const introRef = useRef(1);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0">
        <CubeBackgroundAscii
          intro={introRef}
          src={VIDEO_SRC}
          config={VIDEO_CONFIG}
        />
      </div>

      <section className="absolute inset-0 z-20 pointer-events-none self-padd h-full flex max-md:items-end max-md:pb-[20vw]! items-center w-full">
        <div className="space-y-[2vw] max-lg:space-y-[8vw] mt-[2vw] max-lg:mt-0 relative z-2 w-[60%] max-lg:w-full">
          <div className="h-fit flex max-md:flex-col max-md:justify-start items-center w-full">
            <LineReveal
              as="h1"
              className="t96 max-md:text-left max-md:indent-0! relative w-full text-white"
            >
              Ideas, Craft, and Code From The <span className="gradient-text-animate">Vault.</span>
            </LineReveal>
          </div>
          <SplitLine
            as="p"
            start="top 120%"
            className="text24 max-sm:text-left text-[#C9C9C9] w-[85%] max-sm:w-[95%] max-md:w-[80%]"
          >
            Design thinking, engineering breakdowns, and the reasoning behind every scroll system, cursor effect, and WebGL scene in Hyperiux Vault - written by the team designing and building them.
          </SplitLine>
        </div>
      </section>
    </div>
  );
}
