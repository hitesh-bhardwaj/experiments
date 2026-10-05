"use client";

import CursorMove from "@/components/cursor-move";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <CursorMove
          {...values}
          textAs="h1"
          backgroundClassName="bg-zinc-950"
        />
      )}
      copyCodeOptions={{ propsVariableName: "cursorMoveProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          {effect}
          <div className="absolute bottom-[3vw] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-4 py-2 rounded-full text-white text-[1.05vw] max-md:hidden shadow-lg w-[52vw] text-center">
            Glide your cursor over the screen - the crosshair dances, the letters bend, and the coordinates responds.
          </div>
          <div className="absolute bottom-[10vh] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-7 py-4 rounded-[3vw] text-white text-[2.5vw] max-sm:text-[4vw] hidden max-md:block w-[45%] max-sm:w-[80%] text-center mx-auto">
            Open on desktop to experience the effect as intended.
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
