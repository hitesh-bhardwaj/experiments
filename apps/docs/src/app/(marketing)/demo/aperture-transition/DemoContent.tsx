"use client";

import type { ReactNode } from "react";
import ApertureTransition from "@/components/aperture-transition";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

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
        <>
          {/* Stays outside the transition wrapper on purpose - see the same
              note in depth-shift-transition/DemoContent.tsx. ApertureTransition
              applies transform/position:fixed directly to its content wrapper
              and clones that subtree on leave, so a position:fixed header
              nested inside gets dragged around and duplicated mid-transition. */}
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          <ApertureTransition {...values}>
            {children}
          </ApertureTransition>
        </>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "apertureTransitionProps",
      }}
    />
  );
}
