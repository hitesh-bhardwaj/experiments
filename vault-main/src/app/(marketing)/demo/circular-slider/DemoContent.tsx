"use client";

import CircularSlider from "@/components/circular-slider";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";

const defaultItems = [
  {
    title: "Arrow Fill Button",
    description: "Primary button with an expanding fill and animated arrow",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
  {
    title: "Custom Cursor",
    description: "Interactive cursor that transforms every hover",
    bgColor: "#AB92BF",
    textColor: "#3D2E50",
  },
  {
    title: "Text Scramble",
    description: "Dynamic text reveal with glitch-style transitions",
    bgColor: "#AFC1D6",
    textColor: "#2C3E52",
  },
  {
    title: "Hover Reveal Card",
    description: "Cards that come alive on hover interaction",
    bgColor: "#CEF9F2",
    textColor: "#1A5C53",
  },
  {
    title: "Scroll Animations",
    description: "Smooth GSAP-powered scroll-based animations",
    bgColor: "#D6CA98",
    textColor: "#4A3F1A",
  },
  {
    title: "Circular Slider",
    description: "Rotating card slider with immersive motion",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
];

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => (
        <CircularSlider
          items={values.items?.length ? values.items : defaultItems}
          title={values.title}
          subtitle={values.subtitle}
          backgroundColor={values.backgroundColor}
          showBottomText={values.showBottomText}
          gap={values.gap}
          cardWidth={values.cardWidth}
          cardHeight={values.cardHeight}
        />
      )}
      copyCodeOptions={{ propsVariableName: "circularSliderProps" }}
    >
      {({ effect }) => (
        <main className="min-h-screen text-white">
          <DemoHeader />
          {effect}
        </main>
      )}
    </RegistryRemixerDemo>
  );
}
