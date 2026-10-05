"use client";

import GlitchyText from "@/components/glitchy-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={GlitchyText}
      copyCodeOptions={{ propsVariableName: "glitchyTextProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-black text-white">
          <DemoHeader />
          {effect}
          <SplitLine
            as="p"
            start="top 120%"
            className="absolute bottom-[5%] left-1/2 -translate-x-1/2 text-center"
          >
            Click on the button to run the animation
          </SplitLine>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
