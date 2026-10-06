"use client";

import React, { useRef } from "react";


export default function Heading3({ children, text, className, ...props }) {
  const headingRef = useRef(null);

  return (
    <h3
      ref={headingRef}
      className={[
        "relative font-display text-xl md:text-2xl leading-1 font-semibold tracking-tighter text-foreground  first:mt-0 first:pt-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* <span
        aria-hidden="true"
        className="docs-heading2-line absolute left-0 right-0 top-0 h-px bg-border/60 lineDraw block"
      /> */}
      <span className="relative inline-block">{children ?? text}</span>
    </h3>
  );
}
