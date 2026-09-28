"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import OverflowTextRevealWrapper from "./OverflowTextRevealWrapper";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <OverflowTextRevealWrapper effectProps={values} />}
      copyCodeOptions={{ propsVariableName: "overflowTextRevealProps" }}
    />
  );
}
