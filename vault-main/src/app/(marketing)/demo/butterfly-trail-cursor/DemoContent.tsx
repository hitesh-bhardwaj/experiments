"use client";

import ButterflyTrailCursor from "@/components/butterfly-trail-cursor";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ButterflyTrailCursor}
      copyCodeOptions={{ propsVariableName: "butterflyTrailCursorProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The butterflies keep drifting.",
              body: "These butterflies are animated purely by cursor movement. Pausing that motion would remove the effect, so reduced motion isn't supported here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
