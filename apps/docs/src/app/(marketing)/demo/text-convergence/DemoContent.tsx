"use client";

import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import TextConvergence from "@/components/text-convergence";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={TextConvergence}
      copyCodeOptions={{ propsVariableName: "textConvergenceProps" }}
    >
      {({ effect }) => (
        <>
          <LenisSmoothScroll />
          <DemoHeader textColor="#ffffff" logoColor="#FFFFFF" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
