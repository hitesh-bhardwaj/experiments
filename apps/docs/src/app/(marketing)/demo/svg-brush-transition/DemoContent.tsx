"use client";

import type { ReactNode } from "react";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import SVGBrushTransition from "@/components/svg-brush-transition";
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
        <SVGBrushTransition {...values}>
          {children}
        </SVGBrushTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "svgBrushTransitionProps",
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
