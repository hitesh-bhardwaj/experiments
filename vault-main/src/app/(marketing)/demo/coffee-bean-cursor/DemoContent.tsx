"use client";

import CoffeeBeanCursor from "@/components/coffee-bean-cursor";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CoffeeBeanCursor}
      copyCodeOptions={{ propsVariableName: "coffeeBeanCursorProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The beans keep drifting.",
              body: "Coffee Bean Cursor animates in direct response to cursor movement. The motion is the effect, so it can't be reduced without disabling it entirely.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
