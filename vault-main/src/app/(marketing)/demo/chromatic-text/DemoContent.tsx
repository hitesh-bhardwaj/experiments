"use client";

import ChromaticText from "@/components/chromatic-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import { ReactLenis } from "lenis/react";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ChromaticText}
      copyCodeOptions={{ propsVariableName: "chromaticTextProps" }}
    >
      {({ effect }) => (
        <ReactLenis root>
          <main className="relative min-h-screen overflow-hidden bg-[#111111] text-white">
            <DemoHeader />
            {effect}
          </main>
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
