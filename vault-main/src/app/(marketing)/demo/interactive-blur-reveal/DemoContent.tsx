"use client";

import InteractiveBlurReveal from "@/components/interactive-blur-reveal";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <InteractiveBlurReveal
          {...values}
          iChannel0={
            values.iChannel0 ||
            "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg"
          }
        />
      )}
      copyCodeOptions={{ propsVariableName: "interactiveBlurRevealProps" }}
    >
      {({ effect }) => (
        <main className="relative h-dvh w-dvw overflow-hidden bg-black text-white">
          {effect}
          <DemoHeader />
          <div className="pointer-events-none fixed inset-0 z-10 h-screen w-screen">
            <section className="flex h-full w-full flex-col items-start justify-center px-10">
              <div>
                <h1 className="max-w-[60vw] text-[7vw] font-light leading-[0.9] tracking-tighter max-sm:max-w-full max-sm:text-[10vw]">
                  Design that feels discovered,
                  <br /> not displayed.
                </h1>
                <p className="mt-4 hidden font-medium tracking-wide text-white/70 max-md:mt-10 max-md:block max-md:w-[80%] max-md:text-[3vw] max-md:leading-[1.3] max-sm:mt-6 max-sm:w-full max-sm:text-[3.5vw]">
                  Tap here to experience the effect. For the full frosted-glass
                  experience, open on desktop.
                </p>
              </div>

              <p className="text-shadow-lg absolute right-10 bottom-10 max-w-[28vw] text-[1.25vw] leading-[1.45] max-md:hidden">
                Move the cursor across the screen and watch the frosted layer
                dissolve into a sharp, fluid reveal.
              </p>
            </section>
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
