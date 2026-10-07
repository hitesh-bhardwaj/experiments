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
        "w-full py-5 space-y-6 pl-[5vw] max-md:pl-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
