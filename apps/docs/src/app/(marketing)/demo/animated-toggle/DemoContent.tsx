"use client";

import Image from "next/image";
import AnimatedToggle from "@/components/animated-toggle";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={AnimatedToggle}
      copyCodeOptions={{ propsVariableName: "animatedToggleProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <section className="min-h-dvh w-full flex items-center relative justify-center">
            <div className="absolute top-0 inset-x-0 z-1 pt-[6vw] px-[7vw] space-y-[1vw] text-center max-md:pt-[14vw] max-md:space-y-[3vw]">
              <h1 className="text-[5vw] text-white max-sm:text-[11vw] max-md:text-[7vw] max-sm:text-center">
                Animated Toggle
              </h1>
              <p className="text-[1.2vw] max-md:hidden max-sm:text-[4.5vw] max-md:text-[3vw]">
                Hover over and click to see the effect for hovered and active
                state of the toggles below
              </p>
              <p className="text-[1.2vw] max-md:block hidden max-sm:text-[4.5vw] max-md:text-[3vw]">
                Click to see the effect for hovered and active
                state of the toggles below
              </p>
            </div>
            <div className="z-1 flex gap-8 justify-center">{effect}</div>
            <Image
              className="absolute w-full h-full object-cover brightness-40"
              src={
                "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg"
              }
              alt="Pexels Image"
              width={1920}
              height={1080}
              sizes="fill"
            />
          </section>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
