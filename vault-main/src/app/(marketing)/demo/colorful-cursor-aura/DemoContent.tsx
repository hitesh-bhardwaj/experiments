"use client";

import ColorfulCursorAura from "@/components/colorful-cursor-aura";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ColorfulCursorAura}
      copyCodeOptions={{ propsVariableName: "colorfulCursorAuraProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The aura keeps glowing.",
              body: "Colorful Cursor Aura renders continuously shifting color driven by cursor movement. The motion is the entire effect, so it can't be reduced.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
