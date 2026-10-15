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
          <DemoHeader
            reducedMotionNote={{
              title: "The grid keeps lifting.",
              body: "Grid Lift raises the mask grid wherever your cursor drifts, in real time. Since the motion is the entire effect, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
