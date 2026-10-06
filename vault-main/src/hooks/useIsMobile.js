import { useState, useEffect } from 'react';

/** Matches `--breakpoint-sm` in globals.css; phone-only layout below this width. */
export const PHONE_BREAKPOINT = 768;

/** Matches `--breakpoint-md` in globals.css; mobile + tablet use compact layout below this width. */
export const COMPACT_LAYOUT_BREAKPOINT = 1025;

/**
 * Detects compact layout (phones + tablets) and client mount state.
 *
 * @param {number} breakpoint - Max width for compact layout in px (default: 1025, Tailwind `md`)
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
