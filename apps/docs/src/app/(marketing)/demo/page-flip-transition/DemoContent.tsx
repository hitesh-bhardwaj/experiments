"use client";

import type { ReactNode } from "react";
import PageFlipTransition from "@/components/page-flip-transition";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({
  children,
  registry,
}: {
  children: ReactNode;
  registry: RegistryLike;
}) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => (
        <PageFlipTransition {...values}>
          {children}
        </PageFlipTransition>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "pageFlipTransitionProps",
      }}
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
