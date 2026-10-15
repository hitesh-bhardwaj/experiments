"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import CollidingModels from "@/components/colliding-models";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CollidingModels}
      copyCodeOptions={{ propsVariableName: "collidingModelsProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The models keep colliding.",
              body: "Colliding Models runs a live physics simulation that reacts to cursor movement continuously. Since the motion is the entire effect, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
