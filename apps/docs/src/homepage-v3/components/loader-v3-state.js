"use client";

import { useEffect, useState } from "react";

export const LOADER_V3_COMPLETE_EVENT = "hyperiux-v3:loader-complete";
export const LOADER_V3_HANDOFF_EVENT = "hyperiux-v3:loader-handoff";

/**
 * Announces the loader is out of the way. The flag is set alongside the event
 * so a section that mounts after the loader finished can still read the state
 * synchronously instead of waiting for an event that already fired.
 */
export function markLoaderV3Complete() {
  if (typeof window === "undefined") return;

  window.__HYPERIUX_V3_LOADER_COMPLETE__ = true;
  window.dispatchEvent(new CustomEvent(LOADER_V3_COMPLETE_EVENT));
}

/**
 * The loader's mark has landed on the navbar's logo. Separate from "complete",
 * which fires when the exit *starts* so the hero can come up underneath: this
 * one is the moment the bar has to be there to take the mark over.
 */
export function markLoaderV3Handoff() {
  if (typeof window === "undefined") return;

  window.__HYPERIUX_V3_LOADER_HANDOFF__ = true;
  window.dispatchEvent(new CustomEvent(LOADER_V3_HANDOFF_EVENT));
}

// Set while the loader is on screen waiting for the visitor to pick an entry
// button. Fallback timers below hold off for as long as it stays set, so the
// header / hero never appear behind a loader that is still up.
export function setLoaderV3Waiting(waiting) {
  if (typeof window === "undefined") return;
  window.__HYPERIUX_V3_LOADER_WAITING__ = waiting;
}

export function isLoaderV3Waiting() {
  return typeof window !== "undefined" && window.__HYPERIUX_V3_LOADER_WAITING__ === true;
}

export function isLoaderV3Complete() {
  return (
    typeof window !== "undefined" &&
    window.__HYPERIUX_V3_LOADER_COMPLETE__ === true
  );
}

export function isLoaderV3Handoff() {
  return (
    typeof window !== "undefined" &&
    window.__HYPERIUX_V3_LOADER_HANDOFF__ === true
  );
}

/**
 * True once the loader has cleared. Falls open after `fallbackMs` so a section
 * gated on this is never left hidden on a page where the loader isn't mounted
 * (or where it failed before dispatching).
 */
export function useLoaderV3Complete(fallbackMs = 6000) {
  return useLoaderFlag(LOADER_V3_COMPLETE_EVENT, isLoaderV3Complete, fallbackMs);
}

/**
 * True once the mark has landed. No fallback of its own - a page where the
 * handoff never happens (the burst exit, or no loader at all) has to fall back
 * on `useLoaderV3Complete`, which knows when it is safe to give up waiting.
 */
export function useLoaderV3Handoff() {
  return useLoaderFlag(LOADER_V3_HANDOFF_EVENT, isLoaderV3Handoff, Infinity);
}

function useLoaderFlag(event, isSet, fallbackMs) {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    let raf1 = 0;
    let raf2 = 0;
    const onFire = () => setSeen(true);

    window.addEventListener(event, onFire);

    const already = isSet();

    // Already done before this mounted - the loader was skipped, so this is a
    // cold hydration and the consumer's intro is about to start on the same
    // frames React is still committing the rest of the page on. Firing on a
    // `setTimeout(0)` puts the animation's first frames right on top of that
    // work and it visibly stutters. Two rAFs instead: the first is the frame
    // hydration is already committing into, the second is the first frame the
    // main thread is actually free, which is where the intro should begin.
    if (already) {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(onFire);
      });
    }

    // The loader is running normally - no rush, just fall open if it never
    // reports back.
    // Re-arms while the loader is still waiting on the visitor.
    let fallback = 0;
    const tryFallback = () => {
      if (isLoaderV3Waiting()) {
        fallback = window.setTimeout(tryFallback, 500);
        return;
      }
      onFire();
    };
    if (!already && Number.isFinite(fallbackMs)) {
      fallback = window.setTimeout(tryFallback, fallbackMs);
    }

    return () => {
      window.removeEventListener(event, onFire);
      window.clearTimeout(fallback);
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [event, isSet, fallbackMs]);

  return seen;
}

// ── Once per session ────────────────────────────────────────────────────────
// The loader is an entrance, not a page transition: it earns its 3s the first
// time a visitor arrives and is only in the way on every navigation back to the
// homepage after that. `sessionStorage` is the right scope for that - it is
// per-tab and clears when the tab closes, so a fresh visit still gets the full
// intro while a return trip inside the same session goes straight to the hero.
const LOADER_V3_PLAYED_KEY = "hyperiux-v3:loader-played";

/**
 * True if the loader has already run in this tab's session. Storage access is
 * guarded: Safari private mode and hardened privacy settings throw on read, and
 * the loader playing again is a far better failure than the page throwing.
 */
export function hasLoaderV3Played() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(LOADER_V3_PLAYED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records that the loader has run, so it stays skipped for the rest of the session. */
export function markLoaderV3Played() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(LOADER_V3_PLAYED_KEY, "1");
  } catch {
    // Storage unavailable - the loader simply plays again next time.
  }
}
