"use client";

import MousePixelation from "@/components/mouse-pixelation";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={MousePixelation}
      copyCodeOptions={{ propsVariableName: "mousePixelationProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen w-screen overflow-hidden bg-black">
          <DemoHeader logoColor="#FFFFFF" textColor="white" />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
