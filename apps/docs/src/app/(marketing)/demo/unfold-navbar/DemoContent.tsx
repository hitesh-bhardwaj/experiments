"use client";

import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import Image from "next/image";
import UnfoldNavbar from "@/components/unfold-navbar";
import Button from "@/components/WebsiteComps/Button";

const BACKGROUND_IMAGE =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-22.jpg";

const DemoContent = ({ registry }: { registry: RegistryLike }) => {
  return (
    <RegistryRemixerDemo registry={registry} component={UnfoldNavbar} copyCodeOptions={{ propsVariableName: "unfoldNavbarProps" }}>
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
        <div className="flex flex-col items-center gap-20 max-md:gap-28 text-center">
          <h1 className="text-[6.5vw] max-md:text-[12vw] font-light leading-none tracking-[-0.03em] text-white">
            Unfold Navbar
          </h1>

          <div className="pointer-events-auto flex items-center gap-4 max-md:flex-col">

            <Button
              text="Read Article"
              href="/effects/navigation/unfold-navbar"
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

        <p className="absolute inset-x-0 bottom-10 text-center text-[clamp(12px,1.1vw,15px)] tracking-[0.02em] text-white/70 max-md:bottom-6">
          [Click the side menu to see the effect]
        </p>
      </div>

      {effect}
    </main>
      )}
    </RegistryRemixerDemo>
  );
};

export default DemoContent;
