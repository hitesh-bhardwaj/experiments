"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import {
  hasLoaderPlayed,
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
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { useInteraction } from "./InteractionProvider";
import { readSoundPreference } from "./SoundToggle";

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

// ── Enter: an "Enter the Vault" button shows as the counter nears 100; the
// loader holds on 100 until it is clicked, then carries on as before ──
const ENTER_AT = 0.85;

// ── Tablet / mobile: no rings - the counter rolls on the dark backdrop, and the
// hero's still fades in behind it as the counter is about to leave
const MOBILE_IMAGE = "/assets/img/hero-mobile.webp";
const MOBILE_ROLL = 1.2;
const MOBILE_STAGGER = 0.1;
// The still starts fading in at this share of the count, a beat after
const MOBILE_IMAGE_AT = 0.85;
const MOBILE_IMAGE_DELAY = 0.15;
const MOBILE_IMAGE_FADE = 0.8;
// Never hold a phone longer than this, loaded or not
const MOBILE_MAX_MS = 2500;

// digit → cell index; a 0 lands on the trailing 0 so it rolls the whole column
const cellOf = (char) => (char === "0" ? CELLS.length - 1 : Number(char));

// Lighthouse/PSI, software WebGL (PSI desktop), and reduced motion - plus the
// session gate, since a loader that has already played this session has
// nothing left to introduce. Don't hold the page for any of them.
function shouldSkipLoader() {
  if (typeof window === "undefined") return false;
  return (
    hasLoaderPlayed() ||
    prefersReducedMotion() ||
    isLighthouseOrHeadless() ||
    isSoftwareRenderer()
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
  const { setSound } = useInteraction();
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(false);
  // Below desktop the hero has no rings, so the loader fades in its still instead
  const [mobile, setMobile] = useState(false);

  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const counterRef = useRef(null);
  const imageRef = useRef(null);
  const imageLoadedRef = useRef(false);
  const enterRef = useRef(null);
  const enterBtnRef = useRef(null);
  // Decided once per mount: Strict Mode re-runs the effect below, and by then
  // markLoaderPlayed() has already written the session flag, so a fresh check
  // would skip the loader every time in dev
  const skipRef = useRef(null);

  useScrollLockLenis();

  // One gate per run: shows the button (once), resolves when it is clicked
  const makeEnterGate = () => {
    let open;
    const entered = new Promise((resolve) => { open = resolve; });
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      gsap.fromTo(enterBtnRef.current, { xPercent: -50, y: 10 }, { autoAlpha: 1, xPercent: -50, y: 0, duration: 0.6, ease: "power2.out" });
      enterBtnRef.current?.querySelector("a")?.focus({ preventScroll: true });
    };
    enterRef.current = () => {
      gsap.to(enterBtnRef.current, { autoAlpha: 0, xPercent: -50, y: 10, duration: 0.4, ease: "power2.in" });
      open();
    };
    return { entered, show };
  };

  useLayoutEffect(() => {
    if (skipRef.current === null) skipRef.current = shouldSkipLoader();
    if (skipRef.current) {
      skipLoaderNow();
      // shouldSkipLoader() reads matchMedia/UA signals that only exist
      // client-side - can't be a lazy useState initializer without risking a
      // hydration mismatch.
      setDone(true);
      return;
    }
    // Header / hero fallback timers hold while the loader is still up
    setLoaderWaiting(true);
    const start = () => {
      // Written before the loader starts, not after it finishes: a visitor who
      // navigates away mid-loader has already seen the intro.
      markLoaderPlayed();
      if (window.matchMedia(MEDIA.tablet).matches) {
        setMobile(true);
      } else {
        resetLoaderScene();
      }
      setRun(true);
    };
    // Chrome prerenders a URL typed in the address bar: wait until the page is
    // actually shown, or the loader plays out unseen in the background
    if (document.prerendering) {
      document.addEventListener("prerenderingchange", start, { once: true });
      return () => document.removeEventListener("prerenderingchange", start);
    }
    start();
  }, []);

  // ── Tablet / mobile ──
  useGSAP(
    () => {
      if (!run || !mobile) return;

      let cancelled = false;
      lockScroll();
      settleLoaderScene();
      const gate = makeEnterGate();

      const counterTl = gsap.timeline();
      counterTl.to(".count-digit", {
        yPercent: (_, el) => -(100 / CELLS.length) * cellOf(el.dataset.digit),
        duration: MOBILE_ROLL,
        ease: "power2.inOut",
        stagger: MOBILE_STAGGER,
      });

      // The counter follows real loading: the page, the fonts and the still itself
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

      const pageFraction = () => {
        if (milestones.load && imageLoadedRef.current) return 1;
        return Math.min(
          0.9,
          0.1 + (milestones.dom ? 0.2 : 0) + (milestones.fonts ? 0.2 : 0) + (imageLoadedRef.current ? 0.4 : 0)
        );
      };

      const started = performance.now();
      let exitTl = null;
      let imageTween = null;
      const fadeInImage = () => {
        imageTween ??= gsap.to(imageRef.current, {
          opacity: 1,
          duration: MOBILE_IMAGE_FADE,
          delay: MOBILE_IMAGE_DELAY,
          ease: "power2.out",
        });
        return imageTween;
      };

      const exit = () => {
        resetScrollTop();
        setLoaderWaiting(false);
        // Gone once the counter is out and the still is fully in
        exitTl = gsap.timeline({ onComplete: () => fadeInImage().then(() => setDone(true)) });
        exitTl.to(counterRef.current, { autoAlpha: 0, scale: 0.9, duration: 0.4, ease: "power2.in" }, 0);
        // The still matches the hero's own, so once it is in the loader just goes.
        // The hero's copy starts its intro here; its heading lands after the
        // loader has gone (Hero's NAV_LEAD + AT_HEADING)
        exitTl.call(markLoaderComplete, undefined, 0);
        exitTl.call(markLoaderHandoff, undefined, 0.3);
      };

      const tick = () => {
        if (cancelled) return;
        const timedOut = performance.now() - started >= MOBILE_MAX_MS;
        // Holds where it is while the page is behind it, unless it has waited long enough
        counterTl.timeScale(!timedOut && counterTl.progress() >= pageFraction() ? 0 : 1);
        if (counterTl.progress() >= MOBILE_IMAGE_AT) fadeInImage();
        if (counterTl.progress() >= ENTER_AT) gate.show();
        if (counterTl.progress() === 1) {
          gsap.ticker.remove(tick);
          gate.entered.then(() => { if (!cancelled) exit(); });
        }
      };
      gsap.ticker.add(tick);

      return () => {
        cancelled = true;
        gsap.ticker.remove(tick);
        counterTl.kill();
        exitTl?.kill();
        imageTween?.kill();
        document.removeEventListener("DOMContentLoaded", onDom);
        window.removeEventListener("load", onLoad);
        setLoaderWaiting(false);
      };
    },
    { scope: rootRef, dependencies: [run, mobile] }
  );

  // ── Desktop: the rings ──
  useGSAP(
    () => {
      if (!run || mobile) return;

      let cancelled = false;
      // Held from here until the hero's intro has landed - this component is
      // gone well before that, so the release lives in Hero.
      lockScroll();
      const gate = makeEnterGate();

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
          if (built >= ENTER_AT) gate.show();
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
      loaded.then(() => gate.entered).then(() => {
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
    { scope: rootRef, dependencies: [run, mobile] }
  );

  if (done || !run) return null;

  return (
    <div ref={rootRef} data-cursor-off className="fixed inset-0 z-1000 overflow-hidden">
      <div ref={backdropRef} className="absolute inset-0 bg-background" />
      {mobile && (
        // The hero's own still (same file, so it is one download), faded in as the counter leaves
        <div ref={imageRef} aria-hidden="true" className="absolute inset-0 opacity-0">
          <Image
            src={MOBILE_IMAGE}
            alt="loader-mobile"
            fill
            priority
            unoptimized
            sizes="100vw"
            draggable={false}
            onLoad={() => { imageLoadedRef.current = true; }}
            className="pointer-events-none object-cover select-none"
          />
        </div>
      )}
      <div
        ref={counterRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="relative">
          <div
            role="status"
            aria-label="Loading"
            className="type-h1 h-[1em] overflow-hidden leading-none text-foreground"
          >
            <div aria-hidden="true" className="flex">
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
          {/* Sits just under the counter, so the counter itself stays centred */}
          <div
            ref={enterBtnRef}
            className="invisible absolute top-full left-1/2 flex w-max justify-center text-center pt-[2.5vw] opacity-0 max-lg:pt-[5vw] max-md:pt-[8vw]"
          >
            <LinkButton
              href="#"
              text="Enter the Vault"
              onClick={() => {
                // The click is the user gesture browsers need before audio can start.
                // Turns sound on unless the visitor muted it on an earlier visit.
                if (readSoundPreference() !== false) setSound(true);
                enterRef.current?.();
              }}
              data-sound-kind="primary"
              underline
              tilted={false}
              underlineClassName="mt-0"
              className="mx-auto cursor-pointer type-body text-foreground transition-colors duration-300 hover:text-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
