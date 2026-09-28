"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import StripSlider from "@/components/strip-slider";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={StripSlider}
      copyCodeOptions={{ propsVariableName: "stripSliderProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
