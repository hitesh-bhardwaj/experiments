"use client";

import EllipseCarousel from "@/components/ellipse-carousel";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={EllipseCarousel}
      copyCodeOptions={{ propsVariableName: "ellipseCarouselProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen">
          <DemoHeader />
          <p className="pointer-events-none absolute right-[-5%] bottom-[3%] z-20 -translate-x-1/2 text-center text-md font-medium text-black/60 max-md:top-[10vh] max-md:w-[80vw] max-md:text-xs">
            Drag the cards to rotate the ellipse
          </p>
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
