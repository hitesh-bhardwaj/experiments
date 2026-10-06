"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { isLoaderV3Waiting } from "./loader-v3-state";

/**
 * Holds the page still from the loader's first frame until the hero's intro has
 * landed. Both are full-screen scenes with nothing to scroll to, and the hero's
 * recede is scrubbed straight off scroll position - letting the page move
 * underneath means the intro plays against a hero that is already halfway
 * through receding, behind a loader that is still covering it.
 *
 * Two mechanisms, because neither covers the whole window on its own:
 *
 *  - `overflow: hidden` on <html>, applied as the loader mounts. For the first
 *    few frames it is the only thing there is.
 *  - `lenis.stop()`, applied as soon as there is an instance to stop. Lenis
 *    owns the wheel once it is running - it preventDefaults the event and moves
 *    the page itself - so the CSS lock alone would leave it integrating wheel
 *    input against a scroll position the browser refuses to change.
 *
 * The instance arrives late by construction, which is what made the previous
 * `lenis?.stop?.()` at mount a no-op: `<ReactLenis root>` is rendered without
 * children, so it never mounts its context provider, and `useLenis()` can only
 * resolve through lenis/react's root store - which ReactLenis fills from an
 * effect that runs after the loader has already mounted. So the lock records
 * intent, and `useScrollLockLenis` applies it whenever the instance shows up.
 */

// Never leave the page unscrollable, whatever happens to the intro that is
// meant to release it. Sized past the loader's own 6s completion fallback plus
// the hero intro that runs after it.
const FAILSAFE_MS = 15000;

let locked = false;
// Last wheel / touch scroll seen while locked: trackpad momentum keeps firing
// for a while after the fingers lift, and must not land once the lock lifts.
let lastScrollInput = 0;
const QUIET_MS = 250;
const noteInput = () => { lastScrollInput = performance.now(); };

// The lock itself: wheel / touch / scroll keys are swallowed before Lenis (or the
// browser) sees them. A capture listener on window runs ahead of Lenis's own
// window listener, so this holds even if Lenis was never handed to the lock.
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
const block = (e) => {
  if (!locked) return;
  if (e.type === "keydown") {
    if (!SCROLL_KEYS.has(e.key) || e.target.closest?.("input,textarea,select,[contenteditable]")) return;
  } else {
    noteInput();
  }
  e.preventDefault();
  e.stopPropagation();
};
const BLOCK_OPTS = { capture: true, passive: false };
let lenisInstance = null;
let failsafeId = 0;

export function lockScrollV3() {
  if (typeof document === "undefined" || locked) return;

  locked = true;
  document.documentElement.style.overflow = "hidden";
  addEventListener("wheel", block, BLOCK_OPTS);
  addEventListener("touchmove", block, BLOCK_OPTS);
  addEventListener("keydown", block, BLOCK_OPTS);
  lenisInstance?.stop?.();

  failsafeId = window.setTimeout(failsafe, FAILSAFE_MS);
}

// Holds off while the loader is still waiting on the visitor's click
function failsafe() {
  if (isLoaderV3Waiting()) {
    failsafeId = window.setTimeout(failsafe, 1000);
    return;
  }
  unlockScrollV3();
}

/** Jump to the very top, through Lenis when it's running, so the hero is what the visitor enters on. */
export function resetScrollTopV3() {
  if (typeof window === "undefined") return;
  lenisInstance?.scrollTo?.(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

export function unlockScrollV3() {
  if (typeof document === "undefined" || !locked) return;
  // Still scrolling (momentum included)? Wait for it to go quiet first.
  if (performance.now() - lastScrollInput < QUIET_MS) {
    window.setTimeout(unlockScrollV3, QUIET_MS);
    return;
  }
  removeEventListener("wheel", block, BLOCK_OPTS);
  removeEventListener("touchmove", block, BLOCK_OPTS);
  removeEventListener("keydown", block, BLOCK_OPTS);

  locked = false;
  window.clearTimeout(failsafeId);
  failsafeId = 0;

  document.documentElement.style.overflow = "";
  // Anything that slipped through while locked is undone: enter on the hero
  if (window.scrollY > 0) window.scrollTo(0, 0);
  // Lenis parks `targetScroll` on the real position while stopped, so it picks
  // up from where the page actually is rather than from everything the user
  // wheeled at it in the meantime.
  lenisInstance?.start?.();
}

/**
 * Keeps the module's handle on the root Lenis instance current, and stops it on
 * the spot if a lock is already waiting for it.
 *
 * Called from both the loader and the hero: the loader unmounts partway through
 * the hero's intro, so it cannot be the only one holding the instance that the
 * release depends on.
 */
export function useScrollLockLenis() {
  const lenis = useLenis();

  useEffect(() => {
    lenisInstance = lenis ?? null;
    if (locked) lenisInstance?.stop?.();
  }, [lenis]);
}
