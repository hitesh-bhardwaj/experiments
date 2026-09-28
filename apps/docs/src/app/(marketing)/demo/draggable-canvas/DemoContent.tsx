"use client";

import DraggableCanvas from "@/components/draggable-canvas";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DraggableCanvas}
      copyCodeOptions={{ propsVariableName: "draggableCanvasProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
