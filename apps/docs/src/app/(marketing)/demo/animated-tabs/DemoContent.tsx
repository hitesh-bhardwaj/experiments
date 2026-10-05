"use client";

import AnimatedTabs from "@/components/animated-tabs";
import HeadAnim from "@/components/Animations/HeadAnim";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={AnimatedTabs}
      copyCodeOptions={{ propsVariableName: "animatedTabsProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className=" h-full flex flex-col items-center gap-[1vw] bg-white text-[#111111] px-[5vw] pt-[7%] max-md:pt-[15%] max-sm:pt-[30%] inset-0 z-1">
            <HeadAnim>
              <h1 className="text-[4vw] max-md:text-[7vw] max-sm:text-[9vw] ">
                Animated Tabs
              </h1>
            </HeadAnim>
            <SplitLine>
              <p className='text-center  max-md:w-[80vw]'>
                Click on the labels to change the tab.
              </p>
            </SplitLine>
          </div>
          <div className='max-md:mt-[-2vw]'>
            {effect}
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
