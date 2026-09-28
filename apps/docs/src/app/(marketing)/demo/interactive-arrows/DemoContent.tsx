"use client";

import InteractiveArrows from "@/components/interactive-arrows";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InteractiveArrows}
      copyCodeOptions={{ propsVariableName: "interactiveArrowsProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#1a1a1a" textColor="#1a1a1a" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
