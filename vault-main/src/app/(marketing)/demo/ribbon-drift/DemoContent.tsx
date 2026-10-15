"use client";

import RibbonDrift from "@/components/ribbon-drift";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
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
          <DemoHeader
            reducedMotionNote={{
              title: "The ribbon keeps drifting.",
              body: "Ribbon Drift ties its image reveal and text splits to scroll position. Since the animation is driven by scroll motion itself, it can't be reduced without removing the effect.",
            }}
          />
          {effect}
          <ScrollBottom textColor='text-[#111111]' />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
