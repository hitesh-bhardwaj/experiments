"use client";

import React from "react";
import HeadingAnchor, { slugify } from "./HeadingAnchor";

export default function Heading2({ children, text, className, id, ...props }) {
  const anchorId = id ?? slugify(children ?? text);

  return (
    <h2
      className={[
        "group/heading scroll-mt-24 relative mt-10 pt-6 first:mt-0 first:pt-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      id={anchorId || undefined}
      {...props}
    >
      <span
        aria-hidden="true"
        className="docs-heading2-line absolute left-0 right-0 top-0 h-px bg-border/60 lineDraw block"
      />
      {/* only the words (and the icon) reveal the copy link, not the full-width row */}
      <span className="group/htext">
        <span className="relative inline-block fadeup">{children ?? text}</span>
        <HeadingAnchor id={anchorId} />
      </span>
    </h2>
  );
}
