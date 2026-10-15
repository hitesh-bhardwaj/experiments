"use client";

import VariableTextProximity from "@/components/variable-text-proximity";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values) => <VariableTextProximity {...values} />}
      copyCodeOptions={{ propsVariableName: "variableTextProximityProps" }}
    >
      {({ effect }) => (
        <main className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
          <DemoHeader />
          <p className="pointer-events-none absolute left-1/2 top-[18vh] z-20 w-[min(90vw,520px)] -translate-x-1/2 text-center text-md font-medium text-white/70 max-md:top-[16vh] max-md:text-xs">
            Move your cursor across the sentence
          </p>
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
