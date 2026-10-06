"use client";

import Copy from "@/components/Animations/Copy";
import HeadAnim from "@/components/Animations/HeadAnim";
import DonutParticles from "@/components/donut-particles";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={DonutParticles}
      copyCodeOptions={{ propsVariableName: "donutParticlesProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-black">
          <DemoHeader />
          {effect}
          <div className="relative z-20 flex h-full w-full items-center max-md:items-start">
            <div className="absolute bottom-10 left-0 w-full max-w-2xl px-10 max-md:top-10 max-md:bottom-auto max-md:px-6 max-sm:px-4">
              <HeadAnim>
                <h1 className="text-[7vw] font-medium leading-none text-white uppercase max-md:text-[10vw] max-sm:text-[12vw]">
                  Brands Built <span className="text-purple-500">Boldly</span>
                </h1>
              </HeadAnim>
            </div>
          </div>

          <div className="absolute right-10 bottom-8 z-20 max-w-md space-y-2 text-right max-md:right-4 max-md:bottom-10 max-md:w-[50vw]">
            <p className="text-[0.8vw] tracking-[0.28em] text-white uppercase max-md:text-[2.2vw] max-sm:text-[2.8vw]">
              Trace the orbit. The particles will follow.
            </p>
            <Copy delay={0.5}>
              <p className="text-lg leading-[1.2] text-white max-md:text-xl max-sm:text-sm">
                From strategy to visuals, we craft branding that tells your
                story and leaves a lasting impression.
              </p>
            </Copy>
            <div className="ml-auto flex w-full items-center justify-end gap-1">
              <button className="flex cursor-pointer items-center gap-1 rounded-full py-1.5 pr-4 text-white/80 transition-all duration-300 hover:text-primary">
                <Link href="/effects">Explore Platform</Link>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button className="flex cursor-pointer items-center gap-1 rounded-full py-1.5 pr-4 text-white/80 transition-all duration-300 hover:text-primary">
                <Link href="/effects/webgl-effects/donut-particles">
                  Read Article
                </Link>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-8 left-6 hidden w-[30vw] justify-end rounded-lg bg-white/20 p-2 text-center text-[2.5vw] text-white backdrop-blur-[0.5vw] max-md:flex max-sm:w-[35vw] max-sm:text-[3.5vw]">
            Experience the full magic on desktop
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
