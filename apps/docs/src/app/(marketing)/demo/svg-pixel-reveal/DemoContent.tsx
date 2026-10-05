"use client";

import HeadAnim from "@/components/Animations/HeadAnim";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import SVGPixelReveal from "@/components/svg-pixel-reveal";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <SVGPixelReveal
          src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg"
          alt="Nature scene"
          priority
          className="w-full max-sm:max-w-md h-[70vh] max-w-xl"
          {...values}
        />
      )}
      copyCodeOptions={{ propsVariableName: "svgPixelRevealProps" }}
    >
      {({ effect }) => (
        <>
          <LenisSmoothScroll />
          <DemoHeader />
          <main className="h-full bg-neutral-950 text-white">
            <section className="flex min-h-[40vh] max-sm:h-[30vh] items-center justify-center px-6">
              <div className="w-fit text-center space-y-[1vw]">
                <HeadAnim>
                  <h1 className="mt-4 text-[4vw] max-sm:text-[9vw] max-md:text-[7vw]">
                    Pixelated to crisp on scroll
                  </h1>
                </HeadAnim>
                <SplitLine>
                  <p>
                    Scroll down to morph the pixelated image into the crystal clear image.
                  </p>
                </SplitLine>
              </div>
            </section>

            <section className="flex min-h-[50vh] max-sm:min-h-[70vh] items-center justify-center px-6 py-20">
              {effect}
            </section>
          </main>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
