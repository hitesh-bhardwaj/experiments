"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
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
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
