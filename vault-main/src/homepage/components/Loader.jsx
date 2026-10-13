"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import {
  // hasLoaderPlayed, // see shouldSkipLoader()
  markLoaderComplete,
  markLoaderHandoff,
  markLoaderPlayed,
  setLoaderWaiting,
} from "./loader-state";
import {
  SCENE_READY_EVENT,
  loaderScene,
  resetLoaderScene,
  settleLoaderScene,
} from "./loader-scene";
import { lockScroll, resetScrollTop, useScrollLockLenis } from "./scroll-lock";
import { MEDIA } from "@/lib/breakpoints";

// ── Build: the rings follow real loading ─────────────────────────────────────
// The pace is the counter's roll (ROLL / STAGGER below), so the rings never
// snap in at once; they ripple out as the digits roll.
// A request that never settles can't hold the page past this, counted from
// when the rings start drawing...
const MAX_BUILD_MS = 6000;
// ...or from mount, if it never does (no WebGL, or its chunk failed).
const NO_SCENE_MS = 10000;
const LOAD_FALLBACK_MS = 4000;
const PROGRESS_EASE = 0.06;

// The backdrop only covers the frames before the rings are drawing; after
// that, the rings and the site's grid are the loader.
const BACKDROP_FADE = 0.8;

// ── Release: one scalar swings the rings into the hero ──────────────────────
// Linear here - the scene eases each part of it on its own (pose, unwind,
// fan), and the hero's intro runs alongside rather than after.
const SETTLE_DURATION = 2.6;
// The navbar fades in once the rings are on their way, as the heading rises.
const HANDOFF_AT = 1.0;

// ── Counter: "000" rolls to "100" in the middle of the rings ────────────────
// Same as the noma loader: every digit sits in its own 0–9 column (plus a
// trailing 0, so a target of 0 still travels the full column) and rolls up once,
// left to right with a stagger. The rings' build is tied to this timeline.
const TARGET = "100";
const CELLS = [...Array(10).keys(), 0];
const ROLL = 2.4;
const STAGGER = 0.2;
// The counter leaves a beat after it lands on 100, as the rings are released
const COUNTER_LEAVE_AT = 0.3;

// digit → cell index; a 0 lands on the trailing 0 so it rolls the whole column
const cellOf = (char) => (char === "0" ? CELLS.length - 1 : Number(char));

// Lighthouse/PSI, software WebGL (PSI desktop), and reduced motion - plus the
// tablet/mobile (no rings are rendered there), and the
// session gate, since a loader that has already played this session has
// nothing left to introduce. Don't hold the page for any of them.
function shouldSkipLoader() {
  if (typeof window === "undefined") return false;
  return (
    // Once-per-session gate (sessionStorage) disabled for now so the loader
    // plays on every load. Restore this line to bring the gate back.
    // hasLoaderPlayed() ||
    prefersReducedMotion() ||
    isLighthouseOrHeadless() ||
    isSoftwareRenderer() ||
    window.matchMedia(MEDIA.tablet).matches
  );
}

function skipLoaderNow() {
  settleLoaderScene();
  markLoaderComplete();
  markLoaderHandoff();
  // No loader: the page still holds until the hero's heading, copy and buttons
  // have landed (Hero releases the lock when its intro completes)
  lockScroll();
}

/**
 * The homepage entrance. Draws nothing of its own but a backdrop for the first
 * frames: the hero's rings (HeroRibbons) are already on screen underneath,
 * centred and spinning on the site's grid, rippling in one by one as the page
 * loads. Once it has, they swing into the hero's background while the hero
 * assembles on top. A 0 → 100 counter rolls in the middle of the rings while
 * they build; there is no button - it never waits on the visitor.
 */
export default function Loader() {
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(false);

  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const counterRef = useRef(null);

  useScrollLockLenis();

  useLayoutEffect(() => {
    if (shouldSkipLoader()) {
      skipLoaderNow();
      // shouldSkipLoader() reads matchMedia/UA signals that only exist
      // client-side - can't be a lazy useState initializer without risking a
      // hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }
    // Written before the loader starts, not after it finishes: a visitor who
    // navigates away mid-loader has already seen the intro.
    markLoaderPlayed();
    resetLoaderScene();
    // Header / hero fallback timers hold while the rings are still building
    setLoaderWaiting(true);
    setRun(true);
  }, []);

  useGSAP(
    () => {
      if (!run) return;

      let cancelled = false;
      // Held from here until the hero's intro has landed - this component is
      // gone well before that, so the release lives in Hero.
      lockScroll();

      // ── Counter: rolls once, starting when the rings are drawing ──
      const counterTl = gsap.timeline({ paused: true });
      counterTl.to(".count-digit", {
        yPercent: (_, el) => -(100 / CELLS.length) * cellOf(el.dataset.digit),
        duration: ROLL,
        ease: "power2.inOut",
        stagger: STAGGER,
      });

      // ── Backdrop: gone as soon as the rings are drawing ──
      let backdropGone = false;
      let sceneAt = 0;
      const dropBackdrop = () => {
        if (backdropGone || cancelled) return;
        backdropGone = true;
        sceneAt = performance.now();
        counterTl.play();
        gsap.to(backdropRef.current, { autoAlpha: 0, duration: BACKDROP_FADE, ease: "power2.out" });
      };
      if (loaderScene.ready) dropBackdrop();
      else window.addEventListener(SCENE_READY_EVENT, dropBackdrop, { once: true });

      // ── Build: the rings follow the real loading ──
      const milestones = {
        dom: document.readyState !== "loading",
        fonts: false,
        load: document.readyState === "complete",
      };
      const onDom = () => { milestones.dom = true; };
      const onLoad = () => { milestones.load = true; };
      if (!milestones.dom) document.addEventListener("DOMContentLoaded", onDom, { once: true });
      if (!milestones.load) window.addEventListener("load", onLoad, { once: true });
      (document.fonts?.ready ?? Promise.resolve()).then(() => { milestones.fonts = true; });
      const loadFallback = window.setTimeout(onLoad, LOAD_FALLBACK_MS);

      const pageFraction = () => {
        if (milestones.load) return 1;
        return Math.min(0.97, 0.1 + (milestones.dom ? 0.3 : 0) + (milestones.fonts ? 0.3 : 0));
      };

      const started = performance.now();
      let cleanupTick = () => {};

      const loaded = new Promise((resolve) => {
        const tick = () => {
          if (cancelled) return;
          const now = performance.now();
          const timedOut = sceneAt
            ? now - sceneAt >= MAX_BUILD_MS
            : now - started >= NO_SCENE_MS;
          // The counter holds where it is while the page itself is behind it,
          // and the rings build exactly as far as the counter has rolled
          counterTl.timeScale(counterTl.progress() >= pageFraction() ? 0 : 1);
          if (timedOut) counterTl.progress(1);
          const built = counterTl.progress();
          const target = timedOut ? 1 : Math.min(pageFraction(), built);

          // Eases toward the real figure, never backwards, and resolves at 1
          const next = Math.max(loaderScene.progress, target);
          loaderScene.progress += (next - loaderScene.progress) * PROGRESS_EASE;
          if (next >= 1 && loaderScene.progress > 0.995) loaderScene.progress = 1;

          if (loaderScene.progress === 1 && counterTl.progress() === 1) {
            gsap.ticker.remove(tick);
            resolve();
          }
        };
        gsap.ticker.add(tick);
        cleanupTick = () => gsap.ticker.remove(tick);
      });

      // ── Release: the rings swing into the hero, the hero lands on them ──
      loaded.then(() => {
        if (cancelled) return;
        gsap.set(rootRef.current, { pointerEvents: "none" });
        // Whatever was scrolled while the loader was up, enter on the hero.
        // The lock stays on: Hero releases it once its heading, copy and buttons have landed
        resetScrollTop();
        setLoaderWaiting(false);

        const tl = gsap.timeline({ onComplete: () => setDone(true) });

        // Only still up if the rings never drew (no WebGL)
        tl.to(backdropRef.current, { autoAlpha: 0, duration: BACKDROP_FADE, ease: "power2.out" }, 0);

        tl.to(
          loaderScene,
          {
            settle: 1,
            duration: SETTLE_DURATION,
            ease: "none",
            // The hero starts its intro as the rings start to move, so its copy
            // lands while they are still travelling - one motion, not two.
            onStart: markLoaderComplete,
          },
          0
        );
        tl.to(
          counterRef.current,
          { autoAlpha: 0, scale: 0.9, duration: 0.5, ease: "power2.in" },
          COUNTER_LEAVE_AT
        );
        tl.call(markLoaderHandoff, undefined, HANDOFF_AT);
      });

      return () => {
        cancelled = true;
        cleanupTick();
        counterTl.kill();
        window.clearTimeout(loadFallback);
        window.removeEventListener(SCENE_READY_EVENT, dropBackdrop);
        document.removeEventListener("DOMContentLoaded", onDom);
        window.removeEventListener("load", onLoad);
        setLoaderWaiting(false);
      };
    },
    { scope: rootRef, dependencies: [run] }
  );

  if (done || !run) return null;

  return (
    <div ref={rootRef} data-cursor-off className="fixed inset-0 z-1000 overflow-hidden">
      <style>{"html{overflow:hidden}"}</style>
      <div ref={backdropRef} className="absolute inset-0 bg-background" />
      <div
        ref={counterRef}
        role="status"
        aria-label="Loading"
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          aria-hidden="true"
          className="type-h1 h-[1em] overflow-hidden leading-none text-foreground"
        >
          <div className="flex">
            {TARGET.split("").map((digit, i) => (
              <div key={i} data-digit={digit} className="count-digit flex flex-col will-change-transform">
                {CELLS.map((n, k) => (
                  <span key={k} className="flex h-[1em] items-center justify-center tabular-nums">
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
