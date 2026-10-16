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
          <DemoHeader
            reducedMotionNote={{
              title: "The ripple keeps rolling.",
              body: "Noise Ripple Cursor distorts the image live as your cursor moves through it. The distortion is the effect itself, so reduced motion can't be applied here.",
            }}
          />
          <div className="min-h-screen w-full relative bg-[]">
            <section className="h-screen w-full relative">
              <HeadAnim animateOnScroll={false}>
                <h1 className="text-[10vw] w-[80vw] font-medium tracking-tight leading-[1.2]! p-[2vw] absolute text-white max-lg:text-[14vw] max-lg:w-[90vw] bottom-[1.5vw] max-lg:bottom-[10vw] max-md:bottom-[30vw] max-md:left-3 pointer-events-none z-10">
                  Noise Ripple Effect
                </h1>
              </HeadAnim>

              <SplitLine
                as="p"
                start="top 120%"
                className="hidden max-lg:block text-[3.5vw] max-md:text-[4.5vw] absolute max-md:bottom-[17vw] max-lg:bottom-[3.5vh] max-md:left-5 max-lg:left-5 z-10 text-white w-[70%] leading-[1.2]"
              >
                Best enjoyed on desktop for the full effect
              </SplitLine>

              {effect}

              <SplitLine
                as="p"
                start="top 120%"
                className="absolute bottom-10 max-md:top-20 right-10 text-[1.2vw] leading-[1.2] z-20 p-3 bg-white/10 rounded-xl max-lg:hidden backdrop-blur-lg w-60 text-center"
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
