"use client";

import InteractiveListPreview from "@/components/interactive-list-preview";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InteractiveListPreview}
      copyCodeOptions={{ propsVariableName: "interactiveListPreviewProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader textColor='#ffffff' logoColor='#FFFFFF' />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
