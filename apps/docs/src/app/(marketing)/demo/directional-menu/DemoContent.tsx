"use client";

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
          <div className="pointer-events-none absolute inset-x-0 top-[25%] z-10 px-6 text-center">
            <h1 className="mx-auto text-[10vw] leading-none tracking-[-0.06em] text-white sm:text-[11vw] md:text-[7rem]">
              Directional Menu
            </h1>
            <p className="mx-auto mt-8 max-w-[40vw]  text-xl leading-[1.2] text-white/70 max-md:max-w-[80vw] max-md:text-2xl max-sm:text-sm">
              Interact with the navigation above to see smooth transitions, motion, and details crafted for a more immersive experience.
            </p>
          </div>
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
