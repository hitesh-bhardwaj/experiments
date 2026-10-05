"use client";

import CurvedPlane from "@/components/curved-plane";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CurvedPlane}
      copyCodeOptions={{ propsVariableName: "curvedPlaneProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-white">
          <LenisSmoothScroll />
          <DemoHeader />
          <div className="pointer-events-none absolute inset-0 z-1 mx-auto w-[50%] pt-24 text-black max-md:mt-10 max-md:w-[80%] max-sm:w-[90%]">
            <h1 className="text-center text-[5vw] text-[#4274D9] max-md:text-[7vw] max-sm:text-[9vw]">
              Curved Plane
            </h1>
            <p className="mx-auto w-fit text-center text-[#4274D9] max-sm:w-[90%]">
              Scroll or drag to see the immersive curved effect on the slides.
            </p>
          </div>
          {effect}
          <ScrollBottom
            textColor="text-black"
            className="bottom-[5%] hidden max-md:flex"
          />
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
