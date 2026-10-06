"use client";

import React from "react";
import HeadAnim from "../Animations/HeadAnim";

export default function Heading({ children, text, className, ...props }) {
  return (
    <HeadAnim>
      <h1
        className={[
          "font-aeonik max-md:text-3xl! text-6xl leading-[1.3]! text-foreground",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {children ?? text}
      </h1>
    </HeadAnim>
  );
}
