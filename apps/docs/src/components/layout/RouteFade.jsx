"use client";

import { forwardRef } from "react";
import { AnimatePresence, motion } from "motion/react";

const routeFadeEase = [0.22, 1, 0.36, 1];

export const RouteFade = forwardRef(function RouteFade(
  { children, className = "", motionKey },
  ref
) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={motionKey}
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: routeFadeEase }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
});
