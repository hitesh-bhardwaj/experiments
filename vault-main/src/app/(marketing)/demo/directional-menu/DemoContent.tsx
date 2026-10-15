"use client";

import Link from "next/link";
import DirectionalMenu from "@/components/directional-menu";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DirectionalMenu}
      copyCodeOptions={{ propsVariableName: "directionalMenuProps" }}
    >
      {({ effect }) => (
        <div className="relative min-h-screen bg-black">
          <DemoHeader />
          {effect}
          <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 flex flex-col items-center gap-[2vw] px-6 text-center max-md:gap-[5vw]">
            <h1 className="mx-auto text-[7vw] max-lg:text-[9vw] leading-none tracking-[-0.06em] text-white ">
              Directional Menu
            </h1>
            <p className="mx-auto mt-3 max-w-[40vw]  text-xl leading-[1.2] text-white/70 max-md:max-w-[80vw] max-md:text-2xl max-sm:text-sm">
              Interact with the navigation above to see smooth transitions, motion, and details crafted for a more immersive experience.
            </p>

            
            <div className="pointer-events-auto max-md:flex-col mt-5 flex items-center justify-center gap-[2vw] max-lg:gap-[2vw] max-md:gap-[7vw]">
              <Link
                href="/effects/navigation/directional-menu"
                className="bg-[#fffaf2] rounded-full max-md:w-[40vw] px-[1.6vw] py-[0.8vw] text-[0.85vw] tracking-widest text-[#111111] uppercase no-underline transition-opacity duration-250 hover:opacity-80 max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[1.5vw] max-md:px-[5vw] max-md:py-[3vw] max-md:text-[3.2vw]"
              >
                Read Article
              </Link>
              <Link
                href="/effects"
                className="border border-[#fffaf2]/40 max-md:w-[40vw] rounded-full px-[1.6vw] py-[0.8vw] text-[0.85vw] tracking-widest text-[#fffaf2] uppercase no-underline transition-colors duration-250 hover:border-[#fffaf2] max-lg:px-[3vw] max-lg:py-[1.5vw] max-lg:text-[1.5vw] max-md:px-[5vw] max-md:py-[3vw] max-md:text-[3.2vw]"
              >
                Effects
              </Link>
            </div>
          </div>
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
