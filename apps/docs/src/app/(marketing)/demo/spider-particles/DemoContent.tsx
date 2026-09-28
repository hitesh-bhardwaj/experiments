"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SpiderParticles from "@/components/spider-particles";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={SpiderParticles}
      copyCodeOptions={{ propsVariableName: "spiderParticlesProps" }}
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
