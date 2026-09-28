"use client";

import TextFillAnimation from "@/components/text-fill-animation";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import { ReactLenis } from "lenis/react";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <TextFillAnimation
          {...values}
          id="hero-break"
          mobileTextSize="8vw"
          mobileTextWidth="92%"
          tabletTextSize="6vw"
          tabletTextWidth="88%"
        />
      )}
      copyCodeOptions={{ propsVariableName: "textFillAnimationProps" }}
    >
      {({ effect }) => (
        <ReactLenis root>
          <DemoHeader />
          {effect}
          <ScrollBottom as="h2" textColor="text-black" />
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
