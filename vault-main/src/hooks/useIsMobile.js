import { useState, useEffect } from 'react';
import { BREAKPOINTS } from "@/lib/breakpoints";

/** Tailwind `md` (max-md:); phone-only layout below this width. */
export const PHONE_BREAKPOINT = BREAKPOINTS.md;

/** Tailwind `lg` (max-lg:); mobile + tablet use compact layout below this width. */
export const COMPACT_LAYOUT_BREAKPOINT = BREAKPOINTS.lg;

/**
 * Detects compact layout (phones + tablets) and client mount state.
 *
 * @param {number} breakpoint - Max width for compact layout in px (default: 1025, Tailwind `lg`)
 * @returns {{ isMounted: boolean, isMobile: boolean }}
 */
export default function useIsMobile(breakpoint = COMPACT_LAYOUT_BREAKPOINT) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsMounted(true);
      setIsMobile(window.innerWidth < breakpoint);
    });
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return { isMounted, isMobile };
}
