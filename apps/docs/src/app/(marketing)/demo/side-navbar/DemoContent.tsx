"use client";

import SideNavbar from "@/components/side-navbar";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={SideNavbar}
      copyCodeOptions={{ propsVariableName: "sideNavbarProps" }}
    >
      {({ effect }) => <div className="relative h-screen w-screen bg-white"><DemoHeader />{effect}</div>}
    </RegistryRemixerDemo>
  );
}
