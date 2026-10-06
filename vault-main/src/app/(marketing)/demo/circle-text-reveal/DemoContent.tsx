"use client";

import CircleTextReveal from "@/components/circle-text-reveal";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CircleTextReveal}
      copyCodeOptions={{ propsVariableName: "circleTextRevealProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="relative min-h-screen bg-white text-black">
            {effect}
            <p className="pointer-events-none absolute bottom-8 left-1/2 z-20 max-w-105 -translate-x-1/2 px-6 text-center font-mono text-sm leading-relaxed text-black/55 max-md:hidden">
              Hover across the headline and let the circle uncover what stayed
              quiet.
            </p>
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
