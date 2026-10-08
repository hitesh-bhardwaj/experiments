import React from "react";

// Smooth scroll comes from the workspace layout (one Lenis for every workspace page);
// the preview drawer marks its panel data-lenis-prevent and stops Lenis while open.
export default function Layout({ children }) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}
