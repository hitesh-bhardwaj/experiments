"use client";

import FlickeringText from "@/components/flickering-text";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={FlickeringText}
      copyCodeOptions={{ propsVariableName: "flickeringTextProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen">
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
