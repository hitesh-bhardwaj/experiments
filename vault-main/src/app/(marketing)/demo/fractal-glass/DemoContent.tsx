"use client";

import FractalGlass from "@/components/fractal-glass";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={FractalGlass}
      copyCodeOptions={{ propsVariableName: "fractalGlassProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen w-screen overflow-hidden bg-black text-white">
          <DemoHeader />
          {effect}
          <div className="absolute bottom-8 left-1/2 w-fit -translate-x-1/2 text-center max-md:hidden">
            Move the cursor left and right to see the fractal effect
          </div>
          <div className="absolute bottom-[85%] left-1/2 hidden w-fit -translate-x-1/2 text-center text-lg max-md:block max-sm:text-sm">
            Drag left and right to see the fractal effect
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
