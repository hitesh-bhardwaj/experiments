"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import InfinitePerspectiveSlider from "@/components/infinite-perspective-slider";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InfinitePerspectiveSlider}
      copyCodeOptions={{ propsVariableName: "infinitePerspectiveSliderProps" }}
    >
      {({ effect }) => (
        <div className="relative min-h-screen bg-white">
          <DemoHeader />
          <LenisSmoothScroll />
          {effect}
          <ScrollBottom textColor="text-[#111111]" className="bottom-[5%] gap-[1vw] max-md:hidden" />
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
