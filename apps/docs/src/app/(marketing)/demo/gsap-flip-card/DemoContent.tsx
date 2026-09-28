"use client";

import GsapFlipCard from "@/components/gsap-flip-card";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import type { RegistryLike } from "@/components/remixer-panel/types";

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={GsapFlipCard}
      copyCodeOptions={{ propsVariableName: "gsapFlipCardProps" }}
    >
      {({ values, effect }) => (
        <main
          className="relative h-screen max-[1025px]:h-full max-[1025px]:pb-14"
          style={{ backgroundColor: values.backgroundColor as string }}
        >
          <DemoHeader
            textColor={values.textColor as string}
            logoColor={values.textColor as string}
          />
          {effect}
          <SplitLine
            as="p"
            start="top 120%"
            className="absolute bottom-[3%] max-[1025px]:border max-[1025px]:p-2 max-[1025px]:rounded-full text-black/70 leading-[1.1] max-[1025px]:w-[80%] w-[20%] left-1/2 -translate-x-1/2 text-center max-[1025px]:bottom-5"
          >
            Click the stack to spread it out, then any frame to swap it in
          </SplitLine>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
