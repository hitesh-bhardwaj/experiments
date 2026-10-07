"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { isLoaderV3Waiting } from "./loader-v3-state";

const FAILSAFE_MS = 15000;

let locked = false;
let lastScrollInput = 0;
const QUIET_MS = 250;
const noteInput = () => { lastScrollInput = performance.now(); };
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

function failsafe() {
  if (isLoaderV3Waiting()) {
    failsafeId = window.setTimeout(failsafe, 1000);
    return;
  }
  unlockScrollV3();
}

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
