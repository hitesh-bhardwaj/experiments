"use client";

import Image from "next/image";
import LinkButton from "@/components/link-button";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={LinkButton}
      render={(values: any) => {
        const { btnText, ...buttonProps } = values;
        return (
          <LinkButton
            {...buttonProps}
            text={btnText}
            clickedColor={values.hoverColor}
            iconClassName="size-[2vw] mt-[0.2vw] max-sm:size-[4vw]"
            className="text-[2vw] max-sm:text-[4.5vw]"
          />
        );
      }}
      copyCodeOptions={{ propsVariableName: "linkButtonProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="h-screen w-screen flex items-center justify-center relative">
            <div className="space-y-20 relative z-10 text-center -mt-20">
              <div className="space-y-4">
                <h1 className="text-xs max-sm:text-sm max-md:text-base uppercase tracking-[0.4em] text-white/60">
                  Hyperiux Button Demo
                </h1>
                <p className="text-5xl font-medium max-sm:text-4xl">Link Button</p>
              </div>
              <div className="w-fit mx-auto">{effect}</div>
            </div>

            <div className="fixed inset-0">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg"
                alt="bg image"
                title="Link Button"
                className="h-full w-full object-cover"
                width={1920}
                height={1080}
                priority
              />
              <div className="absolute inset-0 bg-black/70" />
            </div>
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
