"use client";

import InfiniteGridGallery from "@/components/infinite-grid-gallery";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      component={InfiniteGridGallery}
      copyCodeOptions={{ propsVariableName: "infiniteGridGalleryProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#1a1a1a" textColor="#1a1a1a" />
          {effect}
        </>
      )}
    </RegistryRemixerDemo>
  );
}
