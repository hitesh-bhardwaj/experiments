"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mobile header behaviour: true once the page is scrolled down (past `offset`), false
 * again on any scroll up or near the top. Reads the real scroll position, so it works
 * with native touch scrolling and with Lenis alike. Small moves (under `threshold` px)
 * are ignored so the bar doesn't flicker on jittery touch input.
 */
export function useHideOnScrollDown({ offset = 80, threshold = 6 } = {}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < offset) {
        setHidden(false);
        lastY.current = y;
      } else if (Math.abs(delta) >= threshold) {
        setHidden(delta > 0);
        lastY.current = y;
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [offset, threshold]);

  return hidden;
}
