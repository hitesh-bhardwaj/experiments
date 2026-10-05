"use client";

import ElevateNavbar from "@/components/elevate-navbar";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ElevateNavbar}
      copyCodeOptions={{ propsVariableName: "elevateNavbarProps" }}
    >
      {({ effect }) => <div className="relative min-h-screen"><DemoHeader />{effect}</div>}
    </RegistryRemixerDemo>
  );
}
