"use client";

import type { ReactNode } from "react";
import RadialSliceTransition from "@/components/radial-slice-transition";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({
  children,
  registry,
}: {
  children: ReactNode;
  registry: RegistryLike;
}) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => (
        <RadialSliceTransition {...values}>
          <DemoHeader />
          {children}
        </RadialSliceTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "radialSliceTransitionProps",
      }}
    />
  );
}
