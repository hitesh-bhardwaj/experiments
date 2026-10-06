/**
 * True when the user has asked the OS to minimise animation.
 * Safe during SSR / first render: returns false until the client mounts.
 */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}
