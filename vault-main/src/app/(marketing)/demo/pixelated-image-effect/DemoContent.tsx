"use client";

import PixelatedImageEffect from "@/components/pixelated-image-effect";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={PixelatedImageEffect}
      copyCodeOptions={{ propsVariableName: "pixelatedImageEffectProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The pixels keep shifting.",
              body: "Pixelated Image Effect changes pixelation based on cursor position in real time. Since the transition is driven entirely by motion, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
