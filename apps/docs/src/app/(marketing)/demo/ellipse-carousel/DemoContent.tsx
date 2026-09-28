"use client";

import EllipseCarousel from "@/components/ellipse-carousel";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={EllipseCarousel}
      copyCodeOptions={{ propsVariableName: "ellipseCarouselProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen">
          <DemoHeader logoColor="#111111" textColor="#111111" />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
