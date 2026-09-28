"use client";

import ScrollDistortion from "@/components/scroll-distortion";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

const sections = [
  { text: "SHADOW", src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg" },
  { text: "FLOWER", src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg" },
  { text: "RUN!!", src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg" },
];

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <ScrollDistortion sections={sections} {...values} />}
      copyCodeOptions={{ propsVariableName: "scrollDistortionProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader logoColor="#FFFFFF" textColor="#ffffff" />
          {effect}
          <ScrollBottom textColor="text-white" />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
