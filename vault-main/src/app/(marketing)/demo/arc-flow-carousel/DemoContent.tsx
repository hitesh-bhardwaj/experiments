"use client";

import ArcFlowCarousel from "@/components/arc-flow-carousel";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ArcFlowCarousel}
      copyCodeOptions={{ propsVariableName: "arcFlowCarouselProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen">
          <DemoHeader />
          <p className="pointer-events-none absolute left-1/2 bottom-[5%] z-20 -translate-x-1/2 text-center text-md font-medium text-white/70 max-md:top-[16vh] max-md:w-[80vw] max-md:text-xs">
            Drag to move the arc
          </p>
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
