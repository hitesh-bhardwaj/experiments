"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import RotationSlider from "@/components/rotation-slider";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <RotationSlider {...values} />}
      copyCodeOptions={{ propsVariableName: "rotationSliderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <LenisSmoothScroll />
          {effect}
          <ScrollBottom />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
