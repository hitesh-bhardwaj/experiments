"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import DottedGrid from "@/components/dotted-grid";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DottedGrid}
      copyCodeOptions={{ propsVariableName: "dottedGridProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "This effect can't be reduced.",
              body: "Reduced motion is enabled, but this effect is a continuous ambient dot-grid animation with cursor-driven distortion, and can't be simplified to a fade without losing the effect entirely.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
