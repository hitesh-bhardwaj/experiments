// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/** One-shot read for imperative code */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}

/** Reactive read, re-renders on change */
export function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const sync = () => setReducedMotion(mediaQuery.matches);
    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

/** Reactive read that is correct on the very first render */
export function useReducedMotionSync() {
  const subscribe = useCallback((onChange: () => void) => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return () => {};

    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  // Server render has no preference to read, so it assumes no-preference and
  // the first client render corrects it before paint.
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
