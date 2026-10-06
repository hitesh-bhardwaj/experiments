import React from "react";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import PixelRandomTransition from "@/components/pixel-random";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function layout({ children }) {
  return (
    <PixelRandomTransition>
      <DemoHeader />
      {children}
    </PixelRandomTransition>
  );
}
