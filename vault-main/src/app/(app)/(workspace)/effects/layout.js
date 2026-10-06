import React from "react";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";

// Smooth scroll for the effects listing, category pages and effect pages.
// allowNestedScroll lets inner scroll areas (the Playground panel, dropdowns, code
// blocks) scroll under the cursor before handing the wheel back to the page; the
// preview drawer marks its panel data-lenis-prevent and stops Lenis while open.
export default function Layout({ children }) {
  return (
    <div className="w-full">
      <LenisSmoothScroll allowNestedScroll />
      {children}
    </div>
  );
}
