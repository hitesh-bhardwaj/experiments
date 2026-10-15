"use client";

import HeadAnim from "@/components/Animations/HeadAnim";
import RingCarousel from "@/components/ring-carousel";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={RingCarousel}
      copyCodeOptions={{ propsVariableName: "ringCarouselProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="flex h-screen w-full flex-col items-center justify-start overflow-hidden bg-black px-4 max-md:px-0 pt-14 pb-2 max-md:pt-8 max-md:pb-4 max-sm:px-0 max-sm:pt-5 max-sm:pb-3">
            <div className="relative z-30 mb-0 flex flex-col w-full items-center justify-center max-md:mb-0 max-sm:mb-0 max-md:gap-2 gap-1">
              <HeadAnim>
                <h1 className="m-0 text-center text-[clamp(2rem,3.8vw,4.8rem)] leading-[0.95] max-md:text-[6vw] max-md:pt-8 max-sm:pt-10 font-medium tracking-[-0.04em] text-white max-sm:text-[clamp(1.8rem,9vw,2.6rem)]">
                  Ring Carousel
                </h1>
              </HeadAnim>
              <SplitLine>
                <p className="mx-auto w-fit text-sm leading-tight text-white/75 max-sm:w-[85vw] max-sm:text-center max-sm:text-xs">
                  Click on Navigation buttons to change the slide or you can drag the slider itself
                </p>
              </SplitLine>
            </div>

            {effect}
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
