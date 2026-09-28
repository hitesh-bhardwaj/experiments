"use client";

import LinesLoader from "@/components/lines-loader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={LinesLoader}
      copyCodeOptions={{ propsVariableName: "linesLoaderProps" }}
    />
  );
}
