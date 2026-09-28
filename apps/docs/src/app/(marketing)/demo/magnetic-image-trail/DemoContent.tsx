"use client";

import MagneticImageTrail from "@/components/magnetic-image-trail";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={MagneticImageTrail}
      copyCodeOptions={{ propsVariableName: "magneticImageTrailProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader  />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
