"use client";

import HeroBannerAnimated from "@/components/hero-banner-animated";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={HeroBannerAnimated}
      copyCodeOptions={{ propsVariableName: "heroBannerAnimatedProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The light keeps tracking.",
              body: "Hero Banner Animated moves light with your cursor in real time and zooms the scene on click. Since that tracking motion is continuous, reduced motion can't be applied here.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
