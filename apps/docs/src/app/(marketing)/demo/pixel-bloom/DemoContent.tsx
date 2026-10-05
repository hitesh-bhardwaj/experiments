"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import { usePrefersReducedMotion } from "@/lib/motion";
import PixelBloomWrapper from "./PixelBloomWrapper";

export default function DemoContent({ registry }: { registry: any }) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <PixelBloomWrapper pixelBloomProps={values} />}
      copyCodeOptions={{ propsVariableName: "pixelBloomProps" }}
    >
      {({ effect }) => (
        <>
          <LenisSmoothScroll />
          <DemoHeader />
          {effect}
          <ScrollBottom textColor="text-[#111111]" />
          {prefersReducedMotion && (
            <div
              aria-live="polite"
              className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-md:hidden"
            >
              <h2 className="text-sm leading-none text-neutral-800">
                The bloom keeps rippling.
              </h2>
              <p className="mt-2 text-xs leading-5 text-neutral-700">
                Pixel Bloom reveals pixelation as your cursor moves across the
                media. Since the transition is driven by motion, reduced motion
                can&apos;t be applied here.
              </p>
            </div>
          )}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
