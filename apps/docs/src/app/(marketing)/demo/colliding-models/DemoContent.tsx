"use client";

import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import CollidingModels from "@/components/colliding-models";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={CollidingModels}
      copyCodeOptions={{ propsVariableName: "collidingModelsProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <div className="fixed inset-0 h-screen w-screen bg-white flex flex-col overflow-hidden">
            <div className="max-md:block w-[50%] mx-auto pt-24 max-md:mt-10 max-md:w-[80%] max-sm:w-[90%] max-sm:my-0">
              <h1 className="text-3xl max-sm:text-2xl text-black text-center">
                We build 3D visual experiences and interactive web worlds that help
                bold brands stand apart
              </h1>
            </div>
            {effect}
          </div>
        </>
      )}
    </RegistryRemixerDemo>
  );
}
