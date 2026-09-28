"use client";

import OrbitFlipSlider from "@/components/orbit-flip-slider";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={OrbitFlipSlider}
      copyCodeOptions={{ propsVariableName: "orbitFlipSliderProps" }}
    >
      {({ effect }) => effect}
    </RegistryRemixerDemo>
  );
}
