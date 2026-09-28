"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { createAsciiLoaderField } from "./loader-ascii-field";
import { measureNavLogoTarget } from "./loader-dock-target";
import {
  hasLoaderV3Played,
  markLoaderV3Complete,
  markLoaderV3Handoff,
  markLoaderV3Played,
} from "./loader-v3-state";
import { lockScrollV3, unlockScrollV3, useScrollLockLenis } from "./scroll-lock-v3";

// Background static glyphs. The wordmark weaves HYPERIUX letters;
// this string is only the noise behind it.
const STATIC_CHARS = "!@#$%^*€π§Ωδ∞µΦ≈";
const WORDMARK_CHARS = "HYPERIUX@#10";

// The counter runs to 92 on its own, then only closes the last 8 once the page
// has actually finished loading - so the number tracks something real instead
// of sitting at 100 while assets are still coming in.
const SETTLE_DURATION = 1.6;
const CLOSE_DURATION = 0.45;
// Never hold the page longer than this, however slow the load is.
const MAX_WAIT_MS = 3000;

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
    hasLoaderV3Played() ||
    prefersReducedMotion() ||
    isLighthouseOrHeadless() ||
    isSoftwareRenderer()
  );
}

function skipLoaderNow() {
  markLoaderV3Complete();
  markLoaderV3Handoff();
  unlockScrollV3();
}

/**
 * @param {"dock"|"burst"} exitMode - how the mark leaves. `dock` collapses it
 *   onto the navbar's logo and hands over to the real svg; `burst` blows it out
 *   across the hero. Docking falls back to bursting on a page with no navbar
 *   logo to land on.
 */
export default function LoaderV3({ exitMode = "dock" }) {
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(false);

  const rootRef = useRef(null);
  const backdropRef = useRef(null);
  const canvasRef = useRef(null);

  // Mutated by GSAP, read by the field's own render loop. `clear` fades the
  // background static out; `exit` is what then carries the mark away.
  const fieldRef = useRef({ progress: 0, exit: 0, clear: 0 });

  useScrollLockLenis();

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
    markLoaderV3Played();
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
      lockScrollV3();


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

      // ── Phase 1: Build - progress runs 0 → 0.92 while the page loads ──
      const settle = gsap
        .timeline()
        .to(field, {
          progress: 0.92,
          duration: SETTLE_DURATION,
          ease: "power1.out",
        });

      const pageReady = new Promise((resolve) => {
        if (document.readyState === "complete") {
          resolve();
          return;
        }
        window.addEventListener("load", resolve, { once: true });
      });

      const capped = Promise.race([
        pageReady,
        new Promise((resolve) => {
          waitTimeout = window.setTimeout(resolve, MAX_WAIT_MS);
        }),
      ]);

      // ── Phase 2: Close - finish the counter, hand the mark over, uncover hero
      Promise.all([settle, capped]).then(() => {
        if (cancelled) return;

        const tl = gsap.timeline({
          onComplete: () => {
            setDone(true);
          },
        });

        // Finish the progress counter → 100
        tl.to(field, {
          progress: 1,
          duration: CLOSE_DURATION,
          ease: "power2.inOut",
        });

        // Brief beat, then the field leaves - collapsing onto the navbar's logo,
        // or bursting outward from the centre.
        const docking = exitMode === "dock";
        const clearStart = CLOSE_DURATION + 0.15;
        const exitDuration = docking ? DOCK_DURATION : BURST_DURATION;
        // Docking empties the screen first: the static dissolves, and only then
        // does the mark move. Bursting takes the static with it, so there is
        // nothing to wait for.
        const exitStart = docking
          ? clearStart + CLEAR_DURATION - CLEAR_OVERLAP
          : clearStart;

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
              markLoaderV3Complete();
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

          tl.call(markLoaderV3Handoff, undefined, landing);
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
        destroyField();
      };
    },
    { scope: rootRef, dependencies: [run] }
  );

  if (done || !run) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-1000 overflow-hidden"
    >
      {/* The lock above can only start once this has hydrated, and the markup
          is scrollable from the moment it paints - which on a cold load is
          long enough to wheel most of the way down the page before any of the
          JS lock exists. Shipping the lock as markup closes that window: it is
          in effect from the first byte, and by the time this element goes the
          inline lock has long since taken over. */}
      <style>{"html{overflow:hidden}"}</style>
      {/* Separate layer from the canvas so it can clear on its own - the
          glyphs have to stay at full strength while they burst across the
          hero, which a fade on the whole panel would take out with it. */}
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-background will-change-[opacity]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
      />
    </div>
  );
}
