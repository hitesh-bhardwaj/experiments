"use client";

import RopeCursor from "@/components/rope-cursor";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={RopeCursor}
      copyCodeOptions={{ propsVariableName: "ropeCursorProps" }}
    >
      {({ effect, values }: any) => (
        <>
          <DemoHeader />
          <div className="h-screen w-full bg-[#F1EADE] overflow-hidden" style={{ color: values.ropeColor }}>
            {effect}
            <div className="flex items-center max-md:hidden justify-center flex-col h-full pointer-events-none">
              <h1 className="text-[4vw] text-center">Rope Cursor</h1>
              <p className="opacity-90 text-[2.5vw] text-center">
                (Move your cursor around to see the rope)
              </p>
            </div>
            <div className="items-center max-md:flex hidden justify-center gap-5 flex-col h-full pointer-events-none">
              <p className="text-4xl max-sm:text-2xl text-center">Rope Cursor</p>
              <p className="opacity-90 text-lg leading-[1.2] text-center">
                Desktop only - that&apos;s where the effect comes alive
              </p>
            </div>
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
