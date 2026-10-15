"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import DitherCanvas from "@/components/dither-canvas";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DitherCanvas}
      copyCodeOptions={{ propsVariableName: "ditherCanvasProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen w-screen overflow-hidden bg-black">
          <DemoHeader
            reducedMotionNote={{
              title: "This effect can't be reduced.",
              body: "Reduced motion is enabled, but this effect is a continuous cursor-driven fluid distortion rendered every frame, and can't be simplified to a fade without losing the effect entirely.",
            }}
          />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
