"use client";

import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import StackSpread from "@/components/stack-spread";
import type {
  RegistryProp,
  RegistryRemixerConfig,
} from "@/components/remixer-panel/types";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";

export default function DemoContent({
  registry,
}: {
  registry: {
    name: string;
    category?: string;
    props?: RegistryProp[];
    remixer?: RegistryRemixerConfig;
  };
}) {
  return (
    <RegistryRemixerDemo registry={registry} component={StackSpread}>
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#141414" textColor="#141414" />
          <ScrollBottom textColor="text-black" />
          <LenisSmoothScroll />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
