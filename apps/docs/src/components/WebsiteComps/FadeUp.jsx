"use client";

import { useRef } from "react";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

export default function FadeUp({
  children,
  as: Tag = "div",
  className = "",
  delay = 0,
}) {
  const containerRef = useRef(null);
  useFadeUp(containerRef);

  return (
    <Tag ref={containerRef}>
      {/* Inline (not a CSS class) so GSAP's clearProps can safely strip it
          once the entrance animation completes - a class would still be
          sitting there afterward and the element would just go invisible
          again. Matches useFadeUp's own gsap.set(..., { opacity: 0 })
          starting value, so this is a no-op once JS takes over - its only
          job is covering the gap between SSR paint and hydration, where
          GSAP hasn't run yet and the element would otherwise flash visible
          before disappearing into the animation's start state. */}
      <div
        className={`fadeup ${className}`}
        data-fadeup-delay={delay}
        style={{ opacity: 0 }}
      >
        {children}
      </div>
    </Tag>
  );
}
