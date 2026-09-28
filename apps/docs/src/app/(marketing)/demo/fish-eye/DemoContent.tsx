"use client";

import FishEye from "@/components/fish-eye";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <>
          <div className="h-[30vw] w-[30vw] max-md:hidden relative">
            <FishEye {...values} />
          </div>

          <div className="h-[45vw] w-[30vw] max-md:hidden relative">
            <FishEye {...values} />
          </div>

          <div className="size-[25vw] mt-auto max-md:hidden relative">
            <FishEye {...values} />
          </div>
        </>
      )}
      copyCodeOptions={{ propsVariableName: "fishEyeProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <LenisSmoothScroll />

          <div className="h-screen w-full bg-zinc-200 max-md:p-[20vw] max-sm:p-[10vw] max-md:flex-col flex items-start p-[5vw] pt-[6.5vw] justify-between max-md:justify-center max-md:gap-[10vw] max-md:items-center">
            <h1 className="absolute bottom-[8vw] left-[5vw] max-md:left-[2vw] max-sm:top-[18vw] max-md:top-[8vh] max-sm:right-[5vw] text-black text-[7vw] max-md:text-[7vw] max-sm:text-[12vw] leading-none font-bold">
              FISH EYE
            </h1>

            <h2 className="absolute top-[5vw] text-right max-sm:top-[85vh] max-md:top-[85vh] max-sm:right-[5vw] right-[5vw] max-md:w-full text-black max-sm:text-[12vw] max-md:text-[7vw] text-[7vw] leading-none font-bold max-sm:hidden">
              WITH <br />
              <span className="text-red-500"> TSL </span>
            </h2>

            <div className="hidden max-md:flex absolute inset-0 z-30 items-center justify-center px-8 text-center">
              <div className="pointer-events-none flex max-w-sm flex-col items-center gap-3 text-black">
                <p className="text-[8vw] font-light leading-none tracking-tight uppercase">
                  Open on desktop
                </p>
                <p className="text-sm leading-relaxed text-black/55">
                  Hover unlocks the lens illusion. Best experienced on desktop.
                </p>
              </div>
            </div>

            {effect}

            <div className="absolute bottom-[1vw] right-[3vw] z-40 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full text-black text-[1.1vw] max-md:hidden shadow-md">
              Float your cursor over an image - watch the scene bulge, wobble
              and come alive.
            </div>
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
