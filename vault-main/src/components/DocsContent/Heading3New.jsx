"use client";

import React, { useRef } from "react";
import HeadingAnchor, { slugify } from "./HeadingAnchor";


export default function Heading3({ children, text, className, id, ...props }) {
  const anchorId = id ?? slugify(children ?? text);
  const headingRef = useRef(null);

  return (
    <h3
      ref={headingRef}
      className={[
        "group/heading scroll-mt-24 relative leading-1 first:mt-0 first:pt-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      id={anchorId || undefined}
      {...props}
    >
      <span className="group/htext">
        <span className="relative inline-block fadeup">{children ?? text}</span>
        <HeadingAnchor id={anchorId} />
      </span>
    </h3>
  );
}
