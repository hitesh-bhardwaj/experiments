"use client";

import { cloneElement, isValidElement } from "react";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import DisplacementNavbar from "@/components/displacement-navbar";
import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";

const DEMO_CHILDREN = (
  <div className="relative flex h-[90vh] flex-col items-center justify-center gap-10 px-[1.7vw] max-[1025px]:px-[5vw] min-[769px]:max-[1025px]:px-[2.6vw]">
    <h1 className="m-0 text-[5.5vw] max-[1025px]:text-[9vw] min-[769px]:max-[1025px]:text-[4.5vw] font-light leading-[1.05] tracking-[-0.03em] text-center">
      Displacement Navbar
    </h1>
    <p className="text-center text-[1vw] max-md:text-[3.5vw]  max-[1025px]:text-[2.5vw] tracking-[0.02em] text-black/70">
      [Click the menu to see the effect]
    </p>
    <div className="flex items-center gap-4 mt-16 max-md:flex-col">
      <CharStaggerPrimaryButton
        text="Read Article"
        href="/effects/navigation/displacement-navbar"
        staggerStep={0.01}
        btnClassName="w-[14vw] max-md:w-[60vw] text-white"
        bgClassName="bg-[#0D47A1] rounded-full"
        hoverColor="#ffffff"
      />
      <CharStaggerPrimaryButton
        text="Explore All Effects"
        href="/effects"
        staggerStep={0.01}
        btnClassName="w-[15vw] max-md:w-[60vw] text-white "
        bgClassName="bg-[#0D47A1] rounded-full "
        hoverColor="#ffffff"
      />
    </div>
  </div>
);

export default function DemoContent({ registry }: { registry: RegistryLike }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DisplacementNavbar}
      copyCodeOptions={{ propsVariableName: "displacementNavbarProps" }}
    >
      {({ effect }) =>
       
        isValidElement(effect) ? cloneElement(effect as React.ReactElement<{ children?: React.ReactNode }>, { children: DEMO_CHILDREN }) : effect
      }
    </RegistryRemixerDemo>
  );
}
