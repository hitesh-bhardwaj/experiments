"use client";

import NoiseRippleCursor from "@/components/noise-ripple-cursor";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import HeadAnim from "@/components/Animations/HeadAnim";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={NoiseRippleCursor}
      copyCodeOptions={{ propsVariableName: "noiseRippleCursorProps" }}
    >
      {({ effect }) => (
        <>
          <LenisSmoothScroll />
          <DemoHeader />
          <div className="min-h-screen w-full relative bg-[]">
            <section className="h-screen w-full relative">
              <HeadAnim animateOnScroll={false}>
                <h1 className="text-[10vw] w-[80vw] font-medium tracking-tight leading-[.9]! p-[2vw] absolute text-white max-md:text-[14vw] max-md:w-[90vw] bottom-[1.5vw] max-md:bottom-[10vw] max-sm:bottom-[30vw] max-sm:left-3 pointer-events-none z-10">
                  Noise Ripple Effect
                </h1>
              </HeadAnim>

              <SplitLine
                as="p"
                start="top 120%"
                className="hidden max-md:block text-[3.5vw] max-sm:text-[4.5vw] absolute max-sm:bottom-[17vw] max-md:bottom-[3.5vh] max-sm:left-5 max-md:left-5 z-10 text-white w-[70%] leading-[1.2]"
              >
                Best enjoyed on desktop for the full effect
              </SplitLine>

              {effect}

              <SplitLine
                as="p"
                start="top 120%"
                className="absolute bottom-10 max-sm:top-20 right-10 text-[1.2vw] leading-[1.2] z-20 p-3 bg-white/10 rounded-xl max-md:hidden backdrop-blur-lg w-60 text-center"
              >
                Drift through the frame. Leave the ordinary behind.
              </SplitLine>
            </section>
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
