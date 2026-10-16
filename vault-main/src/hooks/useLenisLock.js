"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

// How many open modals are holding the page still. Lenis restarts only when the last
// one closes, so a modal opened on top of another (sign-in over a delete dialog) doesn't
// set the page scrolling again when it closes first.
let holds = 0;

/**
 * Stops the page's smooth scroll (Lenis) while `open` is true - for every modal and dialog,
 * so the page behind it can't scroll. Pages without Lenis (reduced motion) are unaffected.
 */
export function useLenisLock(open) {
  const lenis = useLenis();
  useEffect(() => {
    if (!open || !lenis) return undefined;
    holds += 1;
    lenis.stop();
    return () => {
      holds = Math.max(0, holds - 1);
      if (holds === 0) lenis.start();
    };
  }, [open, lenis]);
}
