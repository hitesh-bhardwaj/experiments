"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SVGPath from "@/components/svg-path";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={SVGPath}
      copyCodeOptions={{ propsVariableName: "svgPathProps" }}
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
