"use client";

import BookFlip from "@/components/book-flip";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={BookFlip}
      copyCodeOptions={{ propsVariableName: "bookFlipProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The pages keep turning.",
              body: "Book Flip animates each page turn as a continuous physical bend when you click or drag. Since that motion is the entire interaction, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
