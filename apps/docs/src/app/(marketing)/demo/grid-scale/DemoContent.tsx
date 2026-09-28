"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import GridScale from "@/components/grid-scale";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={GridScale}
      copyCodeOptions={{ propsVariableName: "gridScaleProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader textColor="#ffffff" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
