"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import CardDrift from "@/components/card-drift";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CardDrift}
      copyCodeOptions={{ propsVariableName: "cardDriftProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader
            reducedMotionNote={{
              title: "This effect can't be reduced.",
              body: "The scattered cards only move when you drag them - dragging stays fully interactive since it's a direct, user-initiated action, not automatic motion.",
            }}
          />
          {effect}
          <div className='absolute bottom-2 translate-x-[-50%] left-1/2  rounded-xl   text-white bg-white/10 px-4 py-2 max-md:bottom-5 text-center backdrop-blur-md'>
            Grab any card and move it around
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
