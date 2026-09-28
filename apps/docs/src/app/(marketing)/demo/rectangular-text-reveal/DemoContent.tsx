"use client";

import RectangularTextReveal from "@/components/rectangular-text-reveal";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import { ReactLenis } from "lenis/react";

const showcaseSections = [
  {
    eyebrow: "Bottom Reveal",
    direction: "bottom",
    title: "Bold headlines can arrive with a grounded upward motion.",
    body: "Use the bottom direction when you want the color block to push up through the line, giving larger statements a heavier and more cinematic entrance.",
    baseColor: "#ff6b00",
    overlayColor: "#111111",
    useOverlay: true,
  },
  {
    eyebrow: "Right Reveal",
    direction: "right",
    title: "Dense editorial copy feels sharper when the wipe snaps in from the right.",
    body: "This variation works well for supporting paragraphs, callouts, and smaller moments where the reveal should feel precise without overpowering the content around it.",
    baseColor: "#111111",
    overlayColor: "#f97316",
    useOverlay: false,
  },
  {
    eyebrow: "Top Reveal",
    direction: "top",
    title: "Vertical motion brings a more structured, architectural rhythm.",
    body: "Top-to-bottom reveals are helpful when the composition already has strong vertical alignment and you want the animation to reinforce that visual system.",
    baseColor: "#111111",
    overlayColor: "#eab308",
    useOverlay: true,
  },
  {
    eyebrow: "Left Reveal",
    direction: "left",
    title: "The default leftward sweep is still the most versatile all-rounder.",
    body: "It reads quickly, feels familiar, and gives product storytelling sections an energetic but controlled sense of progression as the user scrolls.",
    baseColor: "#2563eb",
    overlayColor: "#dbeafe",
    useOverlay: true,
  },
];

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      copyCodeOptions={{ propsVariableName: "rectangularTextRevealProps" }}
    >
      {({ values }: any) => (
        <ReactLenis root>
          <DemoHeader />
          <div className="min-h-screen w-screen bg-white text-black">
            <section className="flex min-h-screen items-center justify-center px-[6vw]">
              <div className="flex w-full max-w-360 flex-col gap-[2vw] max-md:gap-[6vw] max-sm:gap-[10vw]">
                <p className="text-[1rem] tracking-[0.35em] text-black/50 uppercase">
                  Rectangular Text Reveal
                </p>

                <RectangularTextReveal
                  overlayEnterDuration={0.35}
                  overlayExitDuration={0.35}
                  direction="bottom"
                  coverDuration={0.4}
                  revealDuration={0.5}
                  baseColor="#ff6b00"
                  overlayColor="#111111"
                  {...values}
                  className="max-w-6xl"
                >
                  <h1 className="text-6xl leading-[0.95] font-semibold max-sm:text-3xl">
                    A directional rectangular reveal built for expressive,
                    editorial motion systems.
                  </h1>
                </RectangularTextReveal>

                <div className="max-w-160">
                  <RectangularTextReveal
                    baseColor="#111111"
                    coverDuration={0.32}
                    direction="left"
                    revealDuration={0.36}
                    overlayColor="#f5f5f5"
                    {...values}
                  >
                    <p className="leading-[1.6] text-black/75">
                      Scroll through the page to compare each reveal direction
                      in context. Every example below is tuned to feel slightly
                      different, so the component reads like a flexible motion
                      primitive instead of a one-note effect.
                    </p>
                  </RectangularTextReveal>
                </div>
              </div>
            </section>
          </div>
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
