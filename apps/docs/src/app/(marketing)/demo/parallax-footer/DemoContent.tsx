"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ParallaxFooter from "@/components/parallax-footer";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ParallaxFooter}
      copyCodeOptions={{ propsVariableName: "parallaxFooterProps" }}
    >
      {({ effect }) => (
        <div className="relative min-h-screen bg-black">
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          {effect}
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
