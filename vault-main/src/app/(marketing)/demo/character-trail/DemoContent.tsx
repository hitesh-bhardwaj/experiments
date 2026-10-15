"use client";

import CharacterTrail from "@/components/character-trail";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CharacterTrail}
      copyCodeOptions={{ propsVariableName: "characterTrailProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "The characters keep trailing.",
              body: "Character Trail redraws letters along your cursor's path in real time. The animation can't be reduced without removing the effect.",
            }}
          />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
