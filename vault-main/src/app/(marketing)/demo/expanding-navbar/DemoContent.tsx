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
      {({ effect }) => (
        <div className="relative min-h-screen">
          <DemoHeader />
          {/* The navbar's menu is position: fixed, so it would stay on top of the device preview; the iframe renders its own copy. */}
          <div className="[html[data-pc-dev]_&]:hidden">{effect}</div>
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
