"use client";

import CardsRunway from "@/components/cards-runway";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CardsRunway}
      copyCodeOptions={{ propsVariableName: "cardsRunwayProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <LenisSmoothScroll />
          <h1 className="text-[4vw] fixed top-[6vw] max-sm:top-[22vw] max-sm:text-[10vw] max-md:top-[20vw] inset-x-0 max-md:text-[6vw] mx-auto w-[90vw] text-center text-white z-30 pointer-events-none">
            Cards Runway
          </h1>
          <p className='fixed bottom-[5%] hidden max-md:block translate-x-[-50%] left-1/2 text-center text-white z-30 text-lg'>
            Drag
          </p>
          {effect}
          <ScrollBottom textColor="#ffffff" className='top-[11vw] gap-[0.5vw] max-md:hidden' />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
