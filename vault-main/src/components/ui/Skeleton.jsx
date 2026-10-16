"use client";

import { useLayoutEffect, useRef } from "react";

// The shimmer's loop (globals.css .skeleton-shimmer)
const SWEEP_MS = 1800;

/**
 * Placeholder for a value that is still being fetched (counts, plan, stats, cards).
 * Inherits the surrounding text colour, so it works on light and dark surfaces. Its own
 * soft band sweeps across it - brighter with `light`, for light surfaces; none under
 * reduced motion. Size it with `className` (it defaults to
 * a short, text-height bar).
 */
export function Skeleton({ className = "h-[1em] w-8", light = false, ...props }) {
  // Each skeleton picks up its loop where the clock says it is, so a re-mount (a re-render
  // that swaps it) carries on smoothly instead of snapping the band back to the start
  const ref = useRef(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.style.animationDelay = `-${Math.round(performance.now() % SWEEP_MS)}ms`;
  }, []);
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={`skeleton-shimmer ${light ? "skeleton-shimmer-light" : ""} inline-block bg-current/10 align-middle ${className}`}
      {...props}
    />
  );
}
