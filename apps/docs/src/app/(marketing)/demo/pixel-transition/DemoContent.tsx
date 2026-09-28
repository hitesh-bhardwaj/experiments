"use client";

import type { ReactNode } from "react";
import PixelTransition from "@/components/pixel-transition";
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
        <PixelTransition {...values}>
          <DemoHeader />
          {children}
        </PixelTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "pixelTransitionProps",
      }}
    />
  );
}
