"use client";

import type { ReactNode } from "react";
import RadialSliceTransition from "@/components/radial-slice-transition";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

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
          {children}
        </RadialSliceTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "radialSliceTransitionProps",
      }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
