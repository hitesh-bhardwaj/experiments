"use client";

import type { ReactNode } from "react";
import DepthShiftTransition from "@/components/depth-shift-transition";
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
          {/* Stays outside the transition wrapper on purpose: DepthShiftTransition
              applies a GSAP `transform` directly to its content wrapper, and any
              position:fixed descendant of a transformed ancestor gets re-anchored
              to that ancestor instead of the viewport (CSS spec behavior). Nested
              inside, the header would get dragged around by the page-fly-away
              animation and duplicated by the leave clone - hoisting it out keeps
              it genuinely fixed and out of the cloned subtree. */}
          <DemoHeader logoColor="#ffffff" />
          <DepthShiftTransition {...values}>
            {children}
          </DepthShiftTransition>
        </>
      )}
      copyCodeOptions={{
        includeDemoHeader: false,
        propsVariableName: "depthShiftTransitionProps",
      }}
    />
  );
}
