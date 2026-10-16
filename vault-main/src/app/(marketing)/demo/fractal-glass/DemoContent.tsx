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
          <DemoHeader
            reducedMotionNote={{
              title: "The glass keeps shifting.",
              body: "Fractal Glass distorts the image based on cursor and touch position in real time. Since the distortion is driven entirely by motion, reduced motion can't be applied here.",
            }}
          />
          {effect}
          <div className="absolute bottom-8 left-1/2 w-fit -translate-x-1/2 text-center max-lg:hidden">
            Move the cursor left and right to see the fractal effect
          </div>
          <div className="absolute bottom-[85%] left-1/2 hidden w-fit -translate-x-1/2 text-center text-lg max-lg:block max-md:text-sm">
            Drag left and right to see the fractal effect
          </div>
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
