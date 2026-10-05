"use client";

import CircularSplitRoll from "@/components/circular-split-roll";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CircularSplitRoll}
      copyCodeOptions={{ propsVariableName: "circularSplitRollProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="max-md:block flex flex-col justify-center items-center gap-[2vw] text-center max-sm:pt-[18vw] pt-[10vw] sr-only">
            <h1 className="text-[7vw] max-sm:text-[11vw]">
              Circular Split Roll
            </h1>
            <p>Open in desktop for the better experience</p>
          </div>
          {effect}
          <ScrollBottom />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
