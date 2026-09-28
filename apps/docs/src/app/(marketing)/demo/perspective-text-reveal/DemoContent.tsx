"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import PerspectiveTextWrapper from "./PerspectiveTextWrapper";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <PerspectiveTextWrapper effectProps={values} />}
      copyCodeOptions={{ propsVariableName: "perspectiveTextRevealProps" }}
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
