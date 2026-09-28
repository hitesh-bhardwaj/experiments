"use client";

import BorderBeam from "@/components/border-beam";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import { ArrowUpRight, X } from "lucide-react";
import Image from "next/image";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={BorderBeam}
      copyCodeOptions={{ propsVariableName: "borderBeamProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#000000" textColor="#000000" />
          <main className="h-screen overflow-hidden bg-[#eef2f4] text-black">
            <section className="relative box-border flex h-screen w-full px-8 pb-8 pt-[8vw] max-md:items-center max-md:justify-center max-[1025px]:items-center max-[1025px]:justify-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.16)_1px,transparent_0)] bg-[length:64px_64px]" />
              <div className="relative z-10 grid h-full w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-stretch gap-5 max-lg:grid-cols-1 max-md:h-[110vw] max-[1025px]:h-[60vw]">
                <div className="relative h-full min-h-0">{effect}</div>

                <div className="grid h-full min-h-0 grid-rows-[1.28fr_1fr] gap-5 max-md:hidden max-[1025px]:hidden">
                  <article className="relative min-h-0 overflow-hidden rounded-[18px] bg-white p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                    <p className="text-[0.8vw] font-semibold uppercase tracking-[0.16em] text-black/80">
                      World of hearing technology
                    </p>
                    <ArrowUpRight className="absolute right-7 top-6 h-4 w-4" strokeWidth={2} />
                    <div className="absolute right-0 top-0 h-full w-[54%]">
                      <Image
                        src="/assets/img/abstract-sphere.png"
                        alt="abstract sphere"
                        fill
                        sizes="(max-width: 1024px) 50vw, 270px"
                        className="object-cover object-center"
                        priority
                      />
                    </div>

                    <h2 className="absolute bottom-6 left-6 text-[2.8vw] font-normal leading-none text-[#202124]">
                      View our blog
                    </h2>
                  </article>

                  <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
                    <article className="relative min-h-0 rounded-[18px] bg-[#a879f4] p-6 text-white">
                      <p className="max-w-[110px] text-[0.8vw] font-semibold uppercase leading-tight tracking-[0.08em]">
                        Discover our history
                      </p>
                      <ArrowUpRight className="absolute right-6 top-6 h-4 w-4" strokeWidth={2} />
                      <h2 className="absolute bottom-6 left-6 text-[2.8vw] font-normal leading-none">
                        About us
                      </h2>
                    </article>

                    <article className="relative min-h-0 rounded-[18px] bg-[#8cff00] p-6 text-black">
                      <p className="max-w-[120px] text-[0.8vw] font-bold uppercase leading-tight tracking-[0.06em]">
                        Have some questions?
                      </p>
                      <span className="absolute right-6 top-6 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black">
                        <X className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <h2 className="absolute bottom-6 left-6 text-[2.8vw] font-normal leading-none">
                        Contact us
                      </h2>
                    </article>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
