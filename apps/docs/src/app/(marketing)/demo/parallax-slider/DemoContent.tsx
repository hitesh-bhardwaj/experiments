"use client";

import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import ParallaxSlider from "@/components/parallax-slider";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ParallaxSlider}
      copyCodeOptions={{ propsVariableName: "parallaxSliderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          <LenisSmoothScroll />
          <h1 className="sr-only">Parallax Slider</h1>
          {effect}
          <ScrollBottom className="bottom-[3%]" />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
