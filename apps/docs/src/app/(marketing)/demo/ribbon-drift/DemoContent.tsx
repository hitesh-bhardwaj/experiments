"use client";

import RibbonDrift from "@/components/ribbon-drift";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={RibbonDrift}
      copyCodeOptions={{ propsVariableName: "ribbonDriftProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          {effect}
          <ScrollBottom textColor='text-[#111111]' />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
