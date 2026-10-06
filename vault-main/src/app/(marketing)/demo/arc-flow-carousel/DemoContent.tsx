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
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
