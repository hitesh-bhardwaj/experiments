"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import { ReactLenis } from "lenis/react";
import MaskTextWrapper from "./MaskTextWrapper";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <MaskTextWrapper effectProps={values} />}
      copyCodeOptions={{ propsVariableName: "maskTextRevealProps" }}
    >
      {({ effect }) => (
        <ReactLenis root>
          <DemoHeader logoColor="#ffffff" textColor="#ffffff" />
          <ScrollBottom
            textColor="text-black"
            className="bottom-[3%] z-20 gap-[0.5vw]"
          />
          {effect}
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
