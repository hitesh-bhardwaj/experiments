"use client";

import ClipPathSlider from "@/components/clip-path-slider";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ClipPathSlider}
      copyCodeOptions={{ propsVariableName: "clipPathSliderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#FFFFFF" textColor="white" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
