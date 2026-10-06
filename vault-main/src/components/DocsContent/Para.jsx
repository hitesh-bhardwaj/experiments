"use client";

import React from "react";
export default function Para({ children, text, className, ...props }) {

  return (
    <p
      className={["fadeup", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children ?? text}
    </p>
    
  );
}
