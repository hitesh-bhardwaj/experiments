"use client";

import { MotionConfig } from "motion/react";

// Every motion/react animation follows the OS reduced-motion setting: movement and
// scale are dropped, opacity fades stay.
export default function ReducedMotionConfig({ children }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
