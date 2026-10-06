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
          <DemoHeader />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
