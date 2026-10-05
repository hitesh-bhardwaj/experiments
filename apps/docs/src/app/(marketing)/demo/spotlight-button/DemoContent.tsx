"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import SpotlightButton from "@/components/spotlight-button";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={SpotlightButton}
      render={(values: any) => (
        <SpotlightButton
          {...values}
          label="Explore Hyperiux"

          size="lg"
          className=""
        />
      )}
      copyCodeOptions={{ propsVariableName: "spotlightButtonProps" }}
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
                  Spotlight Button
                </h1>
              </div>

              <div className="w-fit">{effect}</div>
            </div>

            <div className="fixed inset-0">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-16.jpg"
                alt="bg image"
                title="Spotlight Button"
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
