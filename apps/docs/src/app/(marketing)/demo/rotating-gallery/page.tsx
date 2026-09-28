import React from "react";
import RotatingGallery from "@/components/rotating-gallery";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";

const page = () => {
  return (
    <main style={{ width: "100%", height: "100svh" }}>
        <LenisSmoothScroll />
      <RotatingGallery />
    </main>
  );
};

export default page;
