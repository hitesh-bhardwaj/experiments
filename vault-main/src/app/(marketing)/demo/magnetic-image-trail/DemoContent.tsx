"use client";

import MagneticImageTrail from "@/components/magnetic-image-trail";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={MagneticImageTrail}
      copyCodeOptions={{ propsVariableName: "magneticImageTrailProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The images keep pulling.",
              body: "Magnetic Image Trail animates images being drawn toward your cursor in real time. Pausing that motion would remove the effect.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
