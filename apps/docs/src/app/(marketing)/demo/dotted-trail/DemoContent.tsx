"use client";

import DottedTrail from "@/components/dotted-trail";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DottedTrail}
      copyCodeOptions={{ propsVariableName: "dottedTrailProps" }}
    >
      {({ effect }) => (
        <>
          {effect}
          <div className="absolute bottom-[3vw] left-1/2 -translate-x-1/2 z-40  rounded-full bg-black/10 px-4 py-2 w-[30vw] text-center text-[1.1vw] text-black/70 backdrop-blur-md max-[1025px]:hidden">
            Move your cursor across the grid - the trail follows, blending from
            the core out to its edges.
          </div>
          <div className="absolute bottom-[10vh] left-1/2 hidden w-[40vw] -translate-x-1/2 rounded-[3vw] bg-black/10 px-7 py-4 text-center text-[2.5vw] text-black/70 backdrop-blur-md max-[1025px]:block max-md:w-[70%] max-md:text-[4vw] z-40">
            Open on desktop to see this cursor effect.
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
