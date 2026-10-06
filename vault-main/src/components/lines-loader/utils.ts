export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}
