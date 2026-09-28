"use client";

import ParallaxImageAnimation from "@/components/parallax-image-animation";
import { ReactLenis } from "lenis/react";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import HeadAnim from "@/components/Animations/HeadAnim";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

function formatCodeValue(value: unknown) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "undefined";
  return JSON.stringify(value, null, 2);
}

function buildParallaxImageCode({ values }: { values: Record<string, unknown> }) {
  return `import ParallaxImageAnimation from "@/components/effects/parallax-image-animation";

const parallaxImageProps = {
  translateY: ${formatCodeValue(values.translateY)},
  scrub: ${formatCodeValue(values.scrub)},
  enableScale: ${formatCodeValue(values.enableScale)},
  scaleFrom: ${formatCodeValue(values.scaleFrom)},
  scaleTo: ${formatCodeValue(values.scaleTo)},
};

export default function Example() {
  return (
    <ParallaxImageAnimation
      {...parallaxImageProps}
      src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg"
      wrapperClassName="w-[27vw] h-[37vw] max-md:h-[65vh] max-md:w-full max-sm:h-[120vw]"
      imageClassName="scale-[1.4] -translate-y-[30%]"
    />
  );
}`;
}

function ParallaxImage({ values, src, wrapperClassName, imageClassName, enableScale }: any) {
  return (
    <ParallaxImageAnimation
      {...values}
      src={src}
      wrapperClassName={wrapperClassName}
      imageClassName={imageClassName}
      enableScale={enableScale ?? values.enableScale}
    />
  );
}

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <section className="w-screen h-fit flex flex-col gap-[7vw] items-center justify-center bg-black text-white max-sm:gap-[10vw]">
          <div className="w-[70%] max-md:w-[75%] flex justify-between max-sm:w-[90%] max-md:flex-col">
            <div>
              <SplitLine>
                <p className="text-[1.5vw] max-md:text-[4vw] mb-[2vw] font-medium max-sm:text-[5.5vw] max-md:mb-[5vw]">
                  Only Parallax
                </p>
              </SplitLine>
              <ParallaxImage
                values={values}
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg"
                wrapperClassName="w-[27vw] h-[37vw] max-md:h-[65vh] max-md:w-full max-sm:h-[120vw]"
                imageClassName="scale-[1.4] -translate-y-[30%]"
                enableScale={false}
              />
            </div>
            <div className="mt-[15vw]">
              <SplitLine>
                <p className="text-[1.5vw] max-md:text-[4vw] max-md:mb-[5vw] mb-[2vw] font-medium max-sm:text-[5.5vw]">
                  Scale Down with Parallax
                </p>
              </SplitLine>
              <ParallaxImage
                values={values}
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg"
                wrapperClassName="w-[32vw] h-[32vw] max-md:w-full max-md:h-[65vh] max-sm:h-[90vw]"
                imageClassName="scale-[1.4] -translate-y-[30%]"
                enableScale
              />
            </div>
          </div>
          <div className="w-[70%] flex justify-between max-md:pt-24 max-md:w-[75%] max-sm:w-[90%] max-md:flex-col max-sm:gap-[10vw]">
            <ParallaxImage
              values={values}
              src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg"
              wrapperClassName="w-[27vw] h-[37vw] rounded-[0.5vw] max-md:h-[65vh] max-md:w-full max-sm:h-[120vw] max-sm:rounded-[2vw]"
              imageClassName="scale-[1.4] -translate-y-[30%]"
            />
            <div className="mt-[17vw] max-sm:mt-0">
              <ParallaxImage
                values={values}
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg"
                wrapperClassName="w-[38vw] h-[30vw] rounded-[1vw] max-md:w-full max-sm:rounded-[3vw] max-md:h-[65vh] max-sm:h-[100vw]"
                imageClassName="scale-[1.4] -translate-y-[30%]"
              />
            </div>
          </div>
        </section>
      )}
      copyCodeOptions={{ buildCode: buildParallaxImageCode }}
    >
      {({ effect }) => (
        <ReactLenis root>
          <DemoHeader textColor="#ffffff" logoColor="#FFFFFF" />
          <section className="w-screen h-screen bg-black text-white flex flex-col gap-[7vw] max-sm:gap-[12vw] items-center justify-center">
            <HeadAnim>
              <h1 className="text-[4vw] max-md:text-[5.5vw] font-medium max-sm:text-[8.5vw] w-[70%] text-center">
                Scroll To See Image Parallax Effect
              </h1>
            </HeadAnim>
          </section>
          {effect}
          <section className="w-screen h-screen max-md:h-[50vh] bg-black" />
        </ReactLenis>
      )}
    </RegistryRemixerDemo>
  );
}
