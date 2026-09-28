"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
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
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
