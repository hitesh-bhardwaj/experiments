"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import HelixSlider from "@/components/helix-slider";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={HelixSlider}
      copyCodeOptions={{ propsVariableName: "helixSliderProps" }}
    >
      {({ effect }) => (
        <>
        <LenisSmoothScroll />
          <DemoHeader />
          {effect}
          <span className="pointer-events-none fixed bottom-[3vw] left-[3vw] z-10 select-none text-[1.1vw] text-white/75 max-[1025px]:bottom-[4vw] max-[1025px]:left-[4vw] max-[1025px]:text-[1.8vw] max-md:bottom-[5vw] max-md:left-[5vw] max-md:text-[3.2vw]">
            Drag to explore
          </span>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
