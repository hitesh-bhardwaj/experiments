"use client";

import React, { useRef } from "react";
import { useLineAnim } from "@/components/Animations/gsapAnimations";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function DocsContent({ className, children, ...props }) {
  const contentRef = useRef(null);
  useLineAnim(contentRef);

  return (
    <div
      ref={contentRef}
      className={cx(
        "mx-0 w-full max-w-none py-5 space-y-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
