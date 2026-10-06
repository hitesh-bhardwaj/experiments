"use client";

import HeadAnim from "@/components/Animations/HeadAnim";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SpotlightText from "@/components/spotlight-text";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <SpotlightText
          {...values}
          className="mx-auto max-w-4xl max-md:w-[90%] max-sm:w-[80%]"
        />
      )}
      copyCodeOptions={{ propsVariableName: "spotlightTextProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="mx-auto flex h-screen flex-col items-center justify-center gap-25 max-sm:h-full max-sm:gap-10 max-sm:py-5">
            <div className="mx-auto w-[40%] space-y-5 max-md:w-[70%] max-sm:w-[70%] max-sm:pt-17">
              <HeadAnim>
                <h1 className="text-center text-[6vw] opacity-90 max-md:text-[7vw] max-sm:text-[8vw]">
                  Spotlight Text
                </h1>
              </HeadAnim>

              <SplitLine>
                <p className="text-center text-sm font-medium tracking-[0.35em] text-white/40 uppercase max-md:hidden max-md:text-lg max-sm:px-6 max-sm:text-base">
                  Sweep your cursor across the words and let the spotlight find
                  them
                </p>

                <p className="hidden text-center leading-[1.2] max-md:block max-md:text-xl max-sm:text-base">
                  This effect comes alive with a cursor. Try it on desktop.
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
