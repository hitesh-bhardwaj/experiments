"use client";

import HeadAnim from "@/components/Animations/HeadAnim";
import TestimonialSwiper from "@/components/testimonial-swiper";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={TestimonialSwiper}
      copyCodeOptions={{ propsVariableName: "testimonialSwiperProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="w-full h-full flex flex-col items-center gap-[1vw] bg-[#edeae2] text-[#111111] px-[5vw] py-[7%] max-md:py-[15%] max-sm:py-[20%] max-sm:pb-[10%] inset-0 z-1">
            <HeadAnim>
              <h1 className="text-[4vw] max-md:text-[7vw] max-sm:text-[9vw] ">
                Testimonial Swiper
              </h1>
            </HeadAnim>
            <SplitLine>
              <p className='text-center max-md:w-[80vw]'>
                Click on the navigation buttons to change the testimonials.
              </p>
            </SplitLine>
          </div>
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
