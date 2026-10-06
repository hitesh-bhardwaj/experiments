"use client";

import React, { useRef } from "react";
import HeadingAnchor, { slugify } from "./HeadingAnchor";
import { useFadeUp } from "../Animations/gsapAnimations";

export default function Heading3({ children, text, className, id, ...props }) {
  const anchorId = id ?? slugify(children ?? text);
  const headingRef = useRef(null);
  useFadeUp(headingRef);

  return (
    <h3
      ref={headingRef}
      className={[
        "group/heading scroll-mt-24 relative font-aeonik text-xl md:text-2xl font-semibold tracking-tighter text-foreground  first:mt-0 first:pt-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      id={anchorId || undefined}
      {...props}
    >
      {/* <span
        aria-hidden="true"
        className="docs-heading2-line absolute left-0 right-0 top-0 h-px bg-border/60 lineDraw block"
      /> */}
      {/* only the words (and the icon) reveal the copy link, not the full-width row */}
      <span className="group/htext">
        <span className="relative inline-block fadeup">{children ?? text}</span>
        <HeadingAnchor id={anchorId} />
      </span>
    </h3>
  );
}
