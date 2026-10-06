"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import InfiniteCarousel from "@/components/InfiniteCarousel";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InfiniteCarousel}
      copyCodeOptions={{ propsVariableName: "infiniteCarouselProps" }}
    >
      {({ effect }) => (
        <div className="min-h-screen bg-[#f4f0ea]">
          <DemoHeader />
          <div className=" flex items-center pt-24 max-md:pt-20 max-sm:pt-15 justify-center px-4 bg-[#f4f0ea]">
            <div className="text-center">
              <h1 className="m-0 text-center text-7xl leading-[0.9] tracking-tighter text-[#111] max-md:text-6xl max-sm:text-5xl">
                Cards Carousel
              </h1>
              <p className="mt-3 max-md:pt-6 max-md:pb-8 max-sm:pb-1 max-sm:pt-5 text-[1rem] w-[80%] max-sm:w-[90%] mx-auto max-md:text-[2.5vw] max-sm:text-[3.5vw] text-[#111]/70">
                Give it a nudge - drag a card or tap the arrows to set the lineup in
                motion, watch it glide, loop, and reveal.
              </p>
            </div>
          </div>
          {effect}
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
