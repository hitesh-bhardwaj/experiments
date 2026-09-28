"use client";

import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ZoomSlider from "@/components/zoom-slider";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ZoomSlider}
      copyCodeOptions={{ propsVariableName: "zoomSliderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          <LenisSmoothScroll />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
