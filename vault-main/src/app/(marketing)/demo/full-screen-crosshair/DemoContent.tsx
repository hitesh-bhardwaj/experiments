"use client";

import HeadAnim from "@/components/Animations/HeadAnim";
import FullScreenCrosshair from "@/components/full-screen-crosshair";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SplitLine from "@/components/WebsiteComps/SplitLine";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={FullScreenCrosshair}
      copyCodeOptions={{ propsVariableName: "fullScreenCrosshairProps" }}
    >
      {({ effect }) => (
        <main className="h-screen w-screen relative bg-[#211951] text-[#826fffaa]">
          <DemoHeader />
          {effect}
          <HeadAnim>
            <h1 className="w-full h-full flex items-center justify-center text-center text-[3.5vw] font-medium max-md:text-[6.5vw]">
              Full Screen Crosshair
            </h1>
          </HeadAnim>
          <SplitLine
            as="p"
            start="top 120%"
            className="absolute max-md:hidden bottom-8 left-1/2 backdrop-blur-sm -translate-x-1/2 py-3 px-5 bg-white/5 text-center text-neutral-200 text-base rounded-xl"
          >
            Move your cursor to see the crosshair come alive ✛
          </SplitLine>
          <p className="absolute max-md:block hidden bottom-20 left-1/2 backdrop-blur-sm -translate-x-1/2 w-[50vw] max-sm:w-[80vw] py-3 px-5 bg-white/5 text-center text-neutral-200 text-lg rounded-2xl">
            Tap to see the crosshair move ✛
            <br />
            Best experienced on desktop.
          </p>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
