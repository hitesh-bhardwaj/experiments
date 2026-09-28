"use client";

import ShearWipe from "@/components/shear-wipe";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => (
        <>
          <DemoHeader  />
          <ShearWipe {...values} />
        </>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "shearWipeProps",
      }}
    />
  );
}
