"use client";

import type { ReactNode } from "react";
import SweepLiftTransition from "@/components/sweep-lift-transition";
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
        <SweepLiftTransition {...values}>
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          {children}
        </SweepLiftTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "sweepLiftTransitionProps",
      }}
    />
  );
}
