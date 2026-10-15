"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import LiquidGlassWrapper from "./LiquidGlassWrapper";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <LiquidGlassWrapper cursorProps={values} />}
      copyCodeOptions={{ propsVariableName: "liquidGlassCursorProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The lens keeps tracking.",
              body: "Liquid Glass Cursor magnifies and refracts whatever your cursor passes over. Since the lens is driven entirely by cursor motion, there's no reduced motion version to fall back on.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
