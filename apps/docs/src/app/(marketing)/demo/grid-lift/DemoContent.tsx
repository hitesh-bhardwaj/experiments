"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
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
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
