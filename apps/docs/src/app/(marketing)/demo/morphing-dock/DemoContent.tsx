"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import Image from "next/image";
import MorphingDock from "@/components/morphing-dock";
import Button from "@/components/WebsiteComps/Button";

const BACKGROUND_IMAGE =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-23.jpg";

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo registry={registry} component={MorphingDock} copyCodeOptions={{ propsVariableName: "morphingDockProps" }}>
      {({ effect }) => (
        <main className="relative h-screen w-full overflow-hidden">
          <div className="absolute inset-0 h-full w-full">
            <Image
              src={BACKGROUND_IMAGE}
              alt=""
              fill
              priority
              sizes="100vw"
              className="h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-black/45" aria-hidden />
          </div>

          <div className="pointer-events-none relative z-10 grid h-full place-items-center px-10">
            <div className="flex flex-col items-center gap-20 text-center max-md:gap-28">
              <h1 className="text-[6.5vw] leading-none font-light tracking-[-0.03em] text-white max-md:text-[12vw]">
                Morphing Dock
              </h1>

              <div className="pointer-events-auto flex items-center gap-4 max-md:flex-col">
                <Button
                  text="Read Article"
                  href="/effects/navigation/morphing-dock"
                  variant="outline2"
                  className="border-white max-md:w-[60vw]"
                />
                <Button
                  text="Explore All Effects"
                  href="/effects"
                  variant="outline2"
                  className="border-white max-md:w-[60vw]"
                />
              </div>
            </div>

            <p className="absolute inset-x-0 bottom-50 text-center text-[clamp(12px,1.1vw,15px)] tracking-[0.02em] text-white/70 max-md:bottom-30">
              [Click the menu to see the effect]
            </p>
          </div>

          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
};

