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
          <DemoHeader />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
