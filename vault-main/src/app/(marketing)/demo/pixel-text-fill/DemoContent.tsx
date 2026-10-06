"use client";

import PixelTextFill from "@/components/pixel-text-fill";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import { ReactLenis } from "lenis/react";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <PixelTextFill {...values} sectionHeight={420} />}
      copyCodeOptions={{ propsVariableName: "pixelTextFillProps" }}
    >
      {({ effect }) => (
        <ReactLenis root options={{ duration: 1.4, smoothWheel: true }}>
          <DemoHeader />
          <section className=" bg-[#101113]" aria-hidden="true" />
          {effect}
          <ScrollBottom as="h2" textColor="text-white" />
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
