"use client";

import Image from "next/image";
import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => {
        const { btnText, ...buttonProps } = values;
        return (
          <CharStaggerPrimaryButton
            {...buttonProps}
            text={btnText}
            bgClassName="rounded-full bg-[#ff6b00]"
            className="text-[1.2vw] max-sm:text-[4.5vw]"
          />
        );
      }}
      copyCodeOptions={{ propsVariableName: "charStaggerPrimaryButtonProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          <div className="h-screen w-screen flex items-center justify-center relative">
            <div className="space-y-20 relative z-10 text-center -mt-20">
              <div className="space-y-4">
                <p className="text-xs max-sm:text-sm max-md:text-base uppercase tracking-[0.4em] text-white/60">
                  Hyperiux Button Demo
                </p>
                <h1 className="text-5xl font-medium max-sm:text-4xl">Character Stagger Primary Button</h1>
              </div>
              <div>{effect}</div>
            </div>

            <div className="fixed inset-0">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg"
                alt="bg image"
                title="Character Stagger Primary Button"
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
