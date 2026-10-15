"use client";

import MousePixelation from "@/components/mouse-pixelation";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={MousePixelation}
      copyCodeOptions={{ propsVariableName: "mousePixelationProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen w-screen overflow-hidden bg-black">
          <DemoHeader
            reducedMotionNote={{
              title: "The pixels keep shifting.",
              body: "Mouse Pixelation reacts to cursor position across all three variants, in real time. Since the transition is driven entirely by motion, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
