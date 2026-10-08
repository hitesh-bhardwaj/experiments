"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { createAsciiLoaderField } from "./loader-ascii-field";
import { measureNavLogoTarget } from "./loader-dock-target";
import {
  // hasLoaderPlayed, // see shouldSkipLoader()
  markLoaderComplete,
  markLoaderHandoff,
  markLoaderPlayed,
  setLoaderWaiting,
} from "./loader-state";
import { lockScroll, resetScrollTop, unlockScroll, useScrollLockLenis } from "./scroll-lock";
import {
  ButtonChrome,
  buttonClassName,
} from "./Button";
import { useInteraction } from "./InteractionProvider";

// Background static glyphs. The wordmark weaves HYPERIUX letters;
// this string is only the noise behind it.
const STATIC_CHARS = "!@#$%^*€π§Ωδ∞µΦ≈";
const WORDMARK_CHARS = "HYPERIUX@#10";

const MAX_WAIT_MS = 100;

// Exit: one scalar drives the whole thing, whichever way the field leaves.
//
// Dock - the mark scales down and travels to the navbar's logo, then hands over
// to the real svg. The field's transform is rigid and linear in this scalar, so
// the ease *is* the motion: it pulls off the centre of the screen and settles
// onto the logo rather than arriving at speed.
const DOCK_DURATION = 1.45;
// The background static dissolves first, on its own scalar, so the mark leaves
// an empty screen instead of dragging the noise along with it.
const CLEAR_DURATION = 0.7;
// How far the mark starts moving before the static has completely gone. Small -
// enough to tie the two beats together without the noise still travelling.
const CLEAR_OVERLAP = 0.15;
// The svg comes up underneath the landed mark and is given the bar's own 500ms
// intro to reach full strength before the glyphs start to go. Cross-fading the
// two instead dips in the middle - half-strength glyphs over a half-strength
// logo is less ink than either, and the mark visibly dulls at the very moment
// it is supposed to resolve. They are the same shape in the same place, so
// overlapping them at full strength costs nothing.
const HANDOFF_HOLD = 0.45;
const HANDOFF_FADE = 0.35;

// Burst - the field hands each cell its own start time and direction out of the
// scalar, so the mark breaks apart rather than unwinding letter by letter.
//
// Eased with "none" - the field's geometry is linear in this scalar, so a
// linear scalar is what gives every glyph constant outward velocity. Any ease
// here would make the burst surge or coast and read as a dissolve again.
const BURST_DURATION = 1.8;
// The black backing clears over the first part of the burst, uncovering the
// hero underneath while the glyphs are still crossing it. That overlap is the
// join between the two ASCII fields - hold the backdrop to the end instead and
// the loader reads as a panel that fades, not as a field that hands over.
const BACKDROP_LEAD = 0.1;
const BACKDROP_DURATION = 0.75;

// Same signals as Loader2: Lighthouse/PSI, software WebGL (PSI desktop), and
// reduced motion - plus the session gate, since a loader that has already
// played this session has nothing left to introduce. Do not start the ASCII
// field or hold the page for any of them.
function shouldSkipLoader() {
  if (typeof window === "undefined") return false;
  return (
    // Once-per-session gate (sessionStorage) disabled for now so the loader
    // plays on every load. Restore this line to bring the gate back.
    // hasLoaderPlayed() ||
    prefersReducedMotion() ||
    isLighthouseOrHeadless() ||
    isSoftwareRenderer()
  );
}

function skipLoaderNow() {
  markLoaderComplete();
  markLoaderHandoff();
  // No loader: the page still holds until the hero's heading, copy and buttons
  // have landed (Hero releases the lock when its intro completes)
  lockScroll();
}

function LoaderEntryButton({ label, onClick, variant = "outline" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      data-sound-kind={variant === "outline" ? "secondary" : "primary"}
      className={buttonClassName({
        variant,
        className:
          `${variant === "outline" ? "bg-background/70 text-white backdrop-blur-md" : ""}`,
      })}
    >
      <ButtonChrome label={label} hovered={hovered} />
    </button>
  );
}

/**
 * @param {"dock"|"burst"} exitMode - how the mark leaves. `dock` collapses it
 *   onto the navbar's logo and hands over to the real svg; `burst` blows it out
 *   across the hero. Docking falls back to bursting on a page with no navbar
 *   logo to land on.
 */
export default function Loader({ exitMode = "dock" }) {
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(false);
  // Resolved by either entry button; the mark waits for it before leaving.
  const entryRef = useRef(null);
  const entryResolveRef = useRef(null);
  const entryChosenRef = useRef(false);
  const tickerOffRef = useRef(null);
  const { setSound } = useInteraction();

  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const canvasRef = useRef(null);

  // Mutated by GSAP, read by the field's own render loop. `clear` fades the
  // background static out; `exit` is what then carries the mark away.
  const fieldRef = useRef({ progress: 0, exit: 0, clear: 0 });

  useScrollLockLenis();

  const chooseEntry = (soundEnabled) => {
    setSound(soundEnabled);
    if (entryRef.current) gsap.set(entryRef.current, { pointerEvents: "none" });
    entryChosenRef.current = true;
    // Whatever was scrolled while the loader was up, enter on the hero
    resetScrollTop();
    // The lock stays on: Hero releases it once its heading, copy and buttons have landed
    setLoaderWaiting(false);
    entryResolveRef.current?.();
  };

  useLayoutEffect(() => {
    if (shouldSkipLoader()) {
      skipLoaderNow();
      // shouldSkipLoader() reads sessionStorage/matchMedia/UA signals that
      // only exist client-side - can't be a lazy useState initializer
      // without risking a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return;
    }
    // Written before the timeline starts, not after it finishes: a visitor who
    // navigates away mid-loader has already seen the intro, and re-running it
    // on the way back is exactly what the gate is here to prevent.
    markLoaderPlayed();
    // Header / hero fallbacks hold until the visitor picks an entry button
    setLoaderWaiting(true);
    setRun(true);
  }, []);

  useGSAP(
    () => {
      if (!run) return;

      let cancelled = false;
      let waitTimeout = 0;

      // Held from here until the hero's intro has landed - this component is
      // gone well before that, so the release lives in Hero, not in this
      // timeline's `onComplete` or in the cleanup below.
      lockScroll();


      const canvas = canvasRef.current;
      if (!canvas) {
        skipLoaderNow();
        setDone(true);
        return;
      }

      const field = fieldRef.current;
      const destroyField = createAsciiLoaderField(canvas, field, {
        mode: exitMode,
        dockTarget: measureNavLogoTarget,
        staticChars: STATIC_CHARS,
        wordmarkChars: WORDMARK_CHARS,
      });

      // ── Phase 1: Build - progress follows the page's real loading ──
      // 10% to start, +25% once the DOM is parsed, +15% once fonts are ready,
      // up to +50% as scripts / stylesheets / images finish, 100% on `load`.
      // MAX_WAIT_MS is the safety net for a request that never settles.
      const milestones = { dom: document.readyState !== "loading", fonts: false, load: document.readyState === "complete" };
      const onDom = () => { milestones.dom = true; };
      const onLoad = () => { milestones.load = true; };
      if (!milestones.dom) document.addEventListener("DOMContentLoaded", onDom, { once: true });
      if (!milestones.load) window.addEventListener("load", onLoad, { once: true });
      (document.fonts?.ready ?? Promise.resolve()).then(() => { milestones.fonts = true; });
      waitTimeout = window.setTimeout(onLoad, MAX_WAIT_MS);

      const assetFraction = () => {
        const urls = [
          ...[...document.scripts].map((el) => el.src),
          ...[...document.querySelectorAll('link[rel="stylesheet"]')].map((el) => el.href),
        ].filter(Boolean);
        const loaded = new Set(performance.getEntriesByType("resource").map((entry) => entry.name));
        const images = [...document.images];
        const total = urls.length + images.length;
        if (!total) return 1;
        const done = urls.filter((url) => loaded.has(url)).length + images.filter((img) => img.complete).length;
        return done / total;
      };

      const targetProgress = () => {
        if (milestones.load) return 1;
        const value = 0.1 + (milestones.dom ? 0.25 : 0) + (milestones.fonts ? 0.15 : 0) + assetFraction() * 0.5;
        return Math.min(0.97, value); // the last stretch is held for `load`
      };

      // Counter eases toward the real figure, never backwards, and resolves at 100.
      const counted = new Promise((resolve) => {
        const tick = () => {
          if (cancelled) return;
          const target = Math.max(field.progress, targetProgress());
          field.progress += (target - field.progress) * 0.08;
          if (target === 1 && field.progress > 0.995) {
            field.progress = 1;
            gsap.ticker.remove(tick);
            resolve();
          }
        };
        gsap.ticker.add(tick);
        tickerOffRef.current = () => gsap.ticker.remove(tick);
      }).finally(() => {
        document.removeEventListener("DOMContentLoaded", onDom);
        window.removeEventListener("load", onLoad);
      });

      // ── Phase 2: Close - hand the mark over, uncover the hero. Holds on the
      // mark (counter at 100) until one of the entry buttons is chosen.
      const entered = new Promise((resolve) => {
        if (entryChosenRef.current) resolve();
        else entryResolveRef.current = resolve;
      });

      Promise.all([counted, entered]).then(() => {
        if (cancelled) return;

        const tl = gsap.timeline({
          onComplete: () => {
            setDone(true);
          },
        });

        // The counter already reached 100 before the click; only a short beat remains.
        const closeDuration = 0;

        // Brief beat, then the field leaves - collapsing onto the navbar's logo,
        // or bursting outward from the centre.
        const docking = exitMode === "dock";
        const clearStart = closeDuration + 0.15;
        const exitDuration = docking ? DOCK_DURATION : BURST_DURATION;
        // Docking empties the screen first: the static dissolves, and only then
        // does the mark move. Bursting takes the static with it, so there is
        // nothing to wait for.
        const exitStart = docking
          ? clearStart + CLEAR_DURATION - CLEAR_OVERLAP
          : clearStart;

        // The entry buttons leave with the mark: same start, same duration,
        // drifting up as it goes. Clicks stop as soon as the counter closes.
        if (entryRef.current) {
          tl.to(entryRef.current, {
            autoAlpha: 0,
            y: -24,
            duration: exitDuration * 0.6,
            ease: "power2.inOut",
          }, exitStart);
        }

        if (docking) {
          tl.to(
            field,
            {
              clear: 1,
              duration: CLEAR_DURATION,
              ease: "power2.inOut",
              onStart: () => {
                // Stop swallowing clicks the moment the panel starts clearing.
                gsap.set(rootRef.current, { pointerEvents: "none" });
              },
            },
            clearStart
          );
        }

        tl.to(
          field,
          {
            exit: 1,
            duration: exitDuration,
            // Docking reads this scalar rigidly - the ease *is* the motion, so
            // it has to be gentle at both ends and never fast in the middle.
            // `power2.inOut` spends most of its travel near peak speed and
            // brakes late, which is what made the mark look like it arrives at
            // the navbar and stops rather than settling onto it. A long-tailed
            // out-ease pulls away just as softly but bleeds the last of the
            // distance off slowly, so the landing has no perceptible edge.
            ease: docking ? "power3.inOut" : "none",
            onStart: () => {
              gsap.set(rootRef.current, { pointerEvents: "none" });
              // Hand off at the *start* of the exit, not the end: the hero's
              // own ASCII field needs to be coming up underneath while these
              // glyphs are still crossing the screen, or the two read as two
              // effects in sequence instead of one continuous field.
              markLoaderComplete();
            },
          },
          exitStart
        );

        // Held back to the mark's own beat when docking: the black has to stay
        // put while the static dissolves, or the hero surfaces under a screen
        // full of noise instead of behind the one mark crossing it.
        tl.to(
          backdropRef.current,
          {
            opacity: 0,
            duration: BACKDROP_DURATION,
            ease: "power2.inOut",
          },
          exitStart + BACKDROP_LEAD
        );

        if (docking) {
          // Landing. The bar is what carries the mark from here: it is told to
          // come in on this beat, and the glyphs only leave once it has - the
          // same mark hardening, not one shape replacing another.
          const landing = exitStart + exitDuration;

          tl.call(markLoaderHandoff, undefined, landing);
          tl.to(
            canvasRef.current,
            { opacity: 0, duration: HANDOFF_FADE, ease: "power2.out" },
            landing + HANDOFF_HOLD
          );
        }
      });

      return () => {
        cancelled = true;
        window.clearTimeout(waitTimeout);
        tickerOffRef.current?.();
        setLoaderWaiting(false);
        destroyField();
      };
    },
    { scope: rootRef, dependencies: [run] }
  );

  if (done || !run) return null;

  return (
    <div
      ref={rootRef}
      data-cursor-off
      className="fixed inset-0 z-1000 overflow-hidden"
    >
      <style>{"html{overflow:hidden}"}</style>
     
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-background will-change-[opacity]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        aria-hidden="true"
      />
      <div ref={entryRef} className="absolute inset-x-0 top-[calc(50%+min(5.02vw,98px)+2.5rem)] z-10 mx-auto flex w-full max-w-[44rem] flex-col items-center gap-4 px-6 text-center max-md:top-[calc(50%+5.64vw+2rem)]">
          <div className="flex items-center justify-center">
            <LoaderEntryButton
              label="Enter Vault"
              variant="orange"
              onClick={() => chooseEntry(true)}
            />
          </div>
          {/* <p className="font-avenir text-[10px] uppercase tracking-[0.22em] text-white/40">
            Headphones recommended
          </p> */}
      </div>
    </div>
  );
}
