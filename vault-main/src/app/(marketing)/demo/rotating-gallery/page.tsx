import React from "react";
import RotatingGallery from "@/components/rotating-gallery";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

const page = () => {
  return (
    <main style={{ width: "100%", height: "100svh" }}>
        <DemoHeader />
        <LenisSmoothScroll />
      <RotatingGallery />
    </main>
  );
};

export default page;
