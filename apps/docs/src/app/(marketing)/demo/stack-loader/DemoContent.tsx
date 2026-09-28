"use client";

import StackLoader from "@/components/stack-loader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={StackLoader}
      copyCodeOptions={{ propsVariableName: "stackLoaderProps" }}
    />
  );
}
