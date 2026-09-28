"use client";

import ElevateNavbar from "@/components/elevate-navbar";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ElevateNavbar}
      copyCodeOptions={{ propsVariableName: "elevateNavbarProps" }}
    >
      {({ effect }) => <div className="relative min-h-screen">{effect}</div>}
    </RegistryRemixerDemo>
  );
}
