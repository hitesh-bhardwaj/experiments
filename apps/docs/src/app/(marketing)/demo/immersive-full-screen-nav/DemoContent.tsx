"use client";

import Link from "next/link";
import ImmersiveFullscreenNav from "@/components/immersive-full-screen-nav";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={ImmersiveFullscreenNav}
      copyCodeOptions={{ propsVariableName: "immersiveFullscreenNavProps" }}
    >
      {({ effect }) => (
        <div className="relative min-h-screen bg-white">
          {effect}
          <main className="flex h-screen items-center justify-center bg-white max-sm:px-[7vw] text-center">
            <div className="max-w-5xl mx-auto text-center text-black">
              <h1 className="text-[7vw] max-md:w-[90%] max-md:mx-auto max-sm:text-[9vw]">
                Immersive Full Screen Navigation
              </h1>

              <p className="mt-8 text-[1.4vw] max-sm:text-[4.5vw] max-md:text-[3vw]">
                Click on the hamburger to open the navigation
              </p>

              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 max-sm:text-[4.5vw] max-md:text-[3vw]">
                <button className="rounded-full max-sm:min-w-[45vw] bg-black text-white font-medium">
                  <Link href="/effects/navigation/immersive-full-screen-nav" className="px-7 py-3 block w-full">
                    Get Started
                  </Link>
                </button>

                <button className="rounded-full max-sm:min-w-[45vw] border border-black">
                  <Link href="/effects" className="px-7 py-3 block w-full">
                    Explore Platform
                  </Link>
                </button>
              </div>
            </div>
          </main>
        </div>
      )}
    </RegistryRemixerDemo>
  );
}
