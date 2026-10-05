"use client";

import Image from "next/image";
import MetallicButton from "@/components/metallic-button";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={MetallicButton}
      render={(values: any) => (
        <MetallicButton {...values} className="scale-150" />
      )}
      copyCodeOptions={{ propsVariableName: "metallicButtonProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="relative flex h-screen w-screen items-center justify-center">
            <div className="relative z-10 flex flex-col items-center gap-20 text-center">
              <div className="flex flex-col gap-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60 max-md:text-sm">
                  Hyperiux Button Demo
                </p>
                <h1 className="text-5xl font-medium text-white max-md:text-4xl">
                  Metallic Button
                </h1>
              </div>

              <div className="w-fit">{effect}</div>
            </div>

            <div className="fixed inset-0">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/gradient.jpg"
                alt="bg image"
                title="Metallic Button"
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
