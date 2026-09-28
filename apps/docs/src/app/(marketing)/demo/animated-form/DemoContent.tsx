"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import AnimatedForm from "@/components/animated-form";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={AnimatedForm}
      copyCodeOptions={{ propsVariableName: "animatedFormProps" }}
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
