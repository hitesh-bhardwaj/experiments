"use client";

import Image from "next/image";
import Link from "next/link";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import type { RegistryLike } from "@/components/remixer-panel/types";
import PerspectiveShiftMenu from "@/components/perspective-shift-menu";
import type { PerspectiveShiftMenuProps } from "@/components/perspective-shift-menu";

const BACKGROUND_IMAGE =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-24.jpg";

// The page content the menu tilts away. It is the menu's children, so the
// remixer renders the whole thing through `render` rather than as a sibling.
const Hero = () => (
  <section className="relative h-screen w-full overflow-hidden">
    <div className="absolute inset-0 h-screen w-full">
      <Image
        src={BACKGROUND_IMAGE}
        alt=""
        priority
        width={1000}
        height={1000}
        sizes="100vw"
        className="h-full w-full object-cover"
      />
    </div>

    {/* Keeps the left column legible over the brighter half of the photo. */}
    <div className="absolute inset-0 bg-linear-to-r from-black/55 to-transparent" />

    <div className="relative flex h-full w-full items-center px-[2.1vw] pl-[7vw] max-[1025px]:px-[3vw] max-md:px-[5vw]">
      <div className="flex w-[42vw] flex-col gap-[1.6vw] max-[1025px]:w-[60vw] max-[1025px]:gap-[3vw] max-md:w-full max-md:gap-[5vw]">
        <h1 className="m-0 text-[4.6vw] leading-[0.95] font-light tracking-[-0.04em] text-[#fffaf2] max-[1025px]:text-[7vw] max-md:text-[12vw]">
          Motion components
          <br />
          you can ship
          <br />
          the same day.
        </h1>

        <p className="text-[1vw] leading-[1.6] font-light text-[#fffaf2]/75 max-[1025px]:text-[1.8vw] max-md:text-[3.8vw]">
          A library of production ready GSAP and React effects : copy the
          source, drop it in, keep the motion.
        </p>

        <div className="flex items-center gap-[1vw] max-[1025px]:gap-[2vw] max-md:gap-[3vw]">
          <Link
            href="/effects"
            className="bg-[#fffaf2] px-[1.6vw] py-[0.8vw] text-[0.85vw] tracking-[0.1em] text-[#111111] uppercase no-underline transition-opacity duration-250 hover:opacity-80 max-[1025px]:px-[3vw] max-[1025px]:py-[1.5vw] max-[1025px]:text-[1.5vw] max-md:px-[5vw] max-md:py-[3vw] max-md:text-[3.2vw]"
          >
            Effects
          </Link>
          <Link
            href="/effects/navigation/perspective-shift-menu"
            className="border border-[#fffaf2]/40 px-[1.6vw] py-[0.8vw] text-[0.85vw] tracking-[0.1em] text-[#fffaf2] uppercase no-underline transition-colors duration-250 hover:border-[#fffaf2] max-[1025px]:px-[3vw] max-[1025px]:py-[1.5vw] max-[1025px]:text-[1.5vw] max-md:px-[5vw] max-md:py-[3vw] max-md:text-[3.2vw]"
          >
            Read Article
          </Link>
        </div>

        <p className="text-[1vw] tracking-[0.02em] text-[#fffaf2]/60 max-[1025px]:text-[1.8vw] max-md:text-[3.5vw]">
          [Click the menu to see the effect]
        </p>
      </div>
    </div>
  </section>
);

const DemoContent = ({ registry }: { registry: RegistryLike }) => {
  return (
    <RegistryRemixerDemo
      registry={registry}
      copyCodeOptions={{ propsVariableName: "perspectiveShiftMenuProps" }}
      render={(values) => (
        <PerspectiveShiftMenu {...(values as PerspectiveShiftMenuProps)}>
          <Hero />
        </PerspectiveShiftMenu>
      )}
    />
  );
};

export default DemoContent;
