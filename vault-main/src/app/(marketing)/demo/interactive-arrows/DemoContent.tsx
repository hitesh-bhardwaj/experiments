"use client";

import InteractiveArrows from "@/components/interactive-arrows";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InteractiveArrows}
      copyCodeOptions={{ propsVariableName: "interactiveArrowsProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The arrows keep turning.",
              body: "Each arrow reorients toward your cursor continuously. That motion is the entire effect, so it can't be scaled back for reduced motion preferences.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
