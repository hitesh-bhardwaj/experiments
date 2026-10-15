"use client";

import RectangularTextReveal from "@/components/rectangular-text-reveal";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import { ReactLenis } from "lenis/react";

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
              <div className="flex w-full max-w-[90vw] flex-col gap-[2vw] max-md:gap-[6vw] max-sm:gap-[10vw]">
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
                  className="max-w-4xl"
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
                      Bring headlines into view through sharp rectangular sweeps that mask and reveal each line in sequence. A structured text transition built for hero statements, section intros, and high-impact editorial moments.
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
