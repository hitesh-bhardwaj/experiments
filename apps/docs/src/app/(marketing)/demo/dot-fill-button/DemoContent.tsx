"use client";

import Image from "next/image";
import DotFillBtn from "@/components/dot-fill-button";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <DotFillBtn href="#" {...values} />}
      copyCodeOptions={{ propsVariableName: "dotFillButtonProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader textColor="#ffffff" logoColor="#FFFFFF" />
          <div className="h-screen w-screen flex items-center justify-center relative">
            <div className="space-y-20 relative z-10 text-center -mt-20">
              <div className="space-y-4">
                <p className="text-xs max-sm:text-sm max-md:text-base uppercase tracking-[0.4em] text-white/60">
                  Hyperiux Button Demo
                </p>
                <h1 className="text-5xl font-medium max-sm:text-4xl">Dot Fill Button</h1>
              </div>
              <div>{effect}</div>
            </div>

            <div className="fixed inset-0">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg"
                alt="bg image"
                title="Dot Fill Button"
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
