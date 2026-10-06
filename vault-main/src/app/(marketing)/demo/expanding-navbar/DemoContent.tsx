"use client";

import ExpandingNavbar from "@/components/expanding-navbar";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ExpandingNavbar}
      copyCodeOptions={{ propsVariableName: "expandingNavbarProps" }}
    >
      {({ effect }) => <div className="relative min-h-screen"><DemoHeader />{effect}</div>}
    </RegistryRemixerDemo>
  );
}
