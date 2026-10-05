"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import GridLift from "@/components/grid-lift";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={GridLift}
      copyCodeOptions={{ propsVariableName: "gridLiftProps" }}
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
