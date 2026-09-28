import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * True when the user has asked the OS to minimise animation.
 *
 * Safe to call during render or in a layout effect: returns false on the
 * server so the animated markup is what gets hydrated.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;

  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function subscribeToReducedMotion(callback) {
  if (typeof window === "undefined") return () => {};

  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);

  mediaQueryList.addEventListener("change", callback);

  return () => mediaQueryList.removeEventListener("change", callback);
}

function getServerReducedMotionSnapshot() {
  return false;
}

/**
 * React hook form of `prefersReducedMotion()`, for components whose JSX
 * output (not just an imperative GSAP tween) depends on the preference.
 * Uses useSyncExternalStore so it stays in sync with live OS changes
 * without a setState-in-effect.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    getServerReducedMotionSnapshot
  );
}
