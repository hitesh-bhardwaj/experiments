"use client";

import React, { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { shouldSkipRealtimeGPU } from "@/lib/audit";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Bayer 8x8 ordered-dither matrix - gives the clustered, retro halftone grain. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];

/** Second matrix tap, decorrelated from the first so the accent doesn't
 *  land on exactly the same cells as the fill and stripe the pattern. */
const BAYER_OFFSET_Y = 3;
const BAYER_OFFSET_X = 5;

/**
 * A broad swell plus a shorter ripple. Two harmonics rather than one keep the
 * crest line from reading as a single symmetric arc, and giving them different
 * drift rates stops them re-aligning into one as the scroll moves them.
 */
const WAVES = 2;
const WAVE_AMP = [0.6, 0.4];
const WAVE_FREQ = [1.5, 4.2];
const WAVE_PHASE = [0.9, 2.1];
const WAVE_DRIFT = [1, -2.3];

/** Keeps the deepest crest from dissolving right at the canvas edge. */
const TAIL_MARGIN = 0.05;

const GAMMA_STEPS = 1024;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * "#000" | "#0a0a0a" | "#0a0a0aff" -> packed little-endian ABGR.
 *
 * An `#rrggbbaa` alpha is resolved here against `over` rather than written into
 * the pixel, so a translucent accent mutes toward the dot colour instead of
 * punching a hole through the solid part of the band.
 */
function packHex(hex, over) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 6) h += "ff";

  const n = parseInt(h, 16);
  let r = (n >>> 24) & 255;
  let g = (n >>> 16) & 255;
  let b = (n >>> 8) & 255;
  const a = (n & 255) / 255;

  if (a < 1 && over !== undefined) {
    const br = over & 255;
    const bg = (over >>> 8) & 255;
    const bb = (over >>> 16) & 255;
    r = Math.round(r * a + br * (1 - a));
    g = Math.round(g * a + bg * (1 - a));
    b = Math.round(b * a + bb * (1 - a));
  }

  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/**
 * Dithered section transition.
 *
 * Paints a Bayer-dithered gradient that starts fully solid at one edge and
 * dissolves into scattered pixels at the other, so a dark section can hand off
 * to a light one (or the reverse) without a soft CSS gradient. The dissolve
 * front is driven by scroll, so the band builds up as it enters the viewport.
 *
 * The canvas is rendered at one pixel per dither cell and upscaled with
 * `image-rendering: pixelated`, so a redraw stays cheap on every scrub tick.
 *
 * The dissolve edge is bowed rather than flat: each column dissolves at a
 * slightly different rate, so the density contours read as broad curves. The
 * accent colour rides one of those contours, which is what puts the orange on
 * the curve edges instead of in a flat horizontal stripe.
 *
 * @param {string}  dotColor       Hex colour of the dots (the section being left).
 * @param {string}  accentColor    Hex colour tracing the dissolve curve.
 * @param {number}  accentAt       Coverage level the accent peaks at (0-1).
 * @param {number}  accentWidth    How far either side of `accentAt` it reaches.
 * @param {number}  accentStrength Overall accent density, 0 disables it.
 * @param {number}  accentShift    Slides the accent along the band toward the
 *                                 dissolving edge, as a share of the band's
 *                                 height. Negative pushes it back toward solid.
 * @param {number}  tailFade       Coverage below which dots start dimming into
 *                                 the background, so the dissolving end greys
 *                                 out. 0 keeps every dot at full strength.
 * @param {number}  curveAmount    How hard the dissolve edge bows. 0 is flat.
 * @param {number}  holdAmount     How much the solid run varies per column, so
 *                                 the solid-to-texture boundary waves too.
 * @param {number}  waveDrift      Radians of phase the crests travel over the
 *                                 scroll, so the edge shape changes as it moves.
 * @param {number}  waveBreath     How much the crest height swells mid-scroll.
 * @param {number}  buildEnd       Share of the scroll spent building, 0-1. The
 *                                 remainder drives the edge off the far side
 *                                 until the band is solid colour.
 * @param {number}  cellSize       Dot size in CSS pixels.
 * @param {number}  gamma          >1 thins the dots out faster, <1 keeps them denser.
 * @param {boolean} flip           Dissolve upward instead of downward.
 * @param {boolean} invert         Paint the gaps instead of the dots, so the
 *                                 dots are see-through. With no background on
 *                                 the band, the page behind it (the dotted grid
 *                                 and fluid) shows where the dots would be:
 *                                 dotColor is then the section being left, and
 *                                 the band ends fully transparent.
 * @param {boolean} scrub          Build on scroll. False renders the finished state.
 * @param {string}  mobileStartTriggers `start` used below 768px.
 * @param {string}  mobileEndTriggers   `end` used below 768px.
 */
export default function DitherTransition({
  className = "",
  dotColor = "#fff",
  accentColor = "#1b1b1b",
  accentAt = 0.02,
  accentWidth = 0.7,
  accentStrength = 1.0,
  accentShift = 0.1,
  tailFade = 0.55,
  curveAmount = 0.55,
  holdAmount = 0.35,
  waveDrift = 2.4,
  waveBreath = 0.35,
  buildEnd = 0.55,
  cellSize = 3,
  gamma = 1,
  flip = true,
  invert = false,
  scrub = true,
  markers = false,
  start = "top bottom",
  end = "bottom top",
  mobileStartTriggers = "top bottom",
  mobileEndTriggers = "bottom top",
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const gridRef = useRef({ cols: 0, rows: 0, shape: "", image: null });
  // Progress 1 is now "flooded solid", so the static state rests at the end of
  // the build phase instead - the settled edge, not a blank band.
  const progressRef = useRef(scrub ? 0 : buildEnd);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const {
      cols,
      rows,
      image,
      pixels,
      basis,
      curve,
      hold,
      accentBias,
      accentLift,
      gammaLut,
    } = gridRef.current;
    if (!canvas || !image || !cols || !rows) return;

    const ctx = canvas.getContext("2d");
    const dot = packHex(dotColor);
    const accent = packHex(accentColor, dot);
    const progress = clamp01(progressRef.current);
    const split = Math.min(0.99, Math.max(0.01, buildEnd));
    // Phase one builds the dither edge in. Phase two keeps pushing on the same
    // edge until it runs off the far side and the band is solid colour, so
    // continued scrolling carries the transition all the way out.
    const front = Math.min(progress / split, 1);
    const exit = clamp01((progress - split) / (1 - split));
    // Resolve the crest line once per column per frame. sin(a + p) expands to
    // sin(a)cos(p) + cos(a)sin(p), so a moving phase costs two trig calls per
    // harmonic rather than one per column, and the shape can change on scroll
    // without touching the per-cell cost.
    const amount = curveAmount * (1 + waveBreath * Math.sin(progress * Math.PI));
    curve.fill(0);
    for (let k = 0; k < WAVES; k++) {
      const phase = progress * waveDrift * WAVE_DRIFT[k];
      const cp = Math.cos(phase);
      const sp = Math.sin(phase);
      const amp = WAVE_AMP[k];
      const sinRow = k * 2 * cols;
      const cosRow = sinRow + cols;
      for (let x = 0; x < cols; x++) {
        curve[x] += amp * (basis[sinRow + x] * cp + basis[cosRow + x] * sp);
      }
    }
    // Bias the crest so every column is >= 1 rather than swinging either side
    // of it. A column below 1 finishes dissolving past the last row, so its
    // dots run into the canvas edge and get sliced into a hard flat line. The
    // margin keeps even the deepest column clear of the edge.
    //
    // `hold` extends the solid run by a per-column amount. Coverage at the seam
    // is pinned to 1 for every column, so without it the solid-to-texture
    // boundary is dead straight however much the crest waves. Running it
    // counter to the crest makes the band breathe rather than just shift, and
    // folding it into the slope too keeps the tail inside the canvas.
    //
    // `accentLift` slides the accent along the band without moving the dissolve
    // under it. Coverage is linear in the row's depth, so reading it a fixed
    // distance further down the gradient is one multiply-add per column rather
    // than a second evaluation per cell - and because the step is scaled by the
    // same per-column slope, the accent rides the crest instead of cutting
    // across it. `flip` reverses which way is downhill.
    const liftScale =
      (flip ? accentShift : -accentShift) / (front > 0 ? front : 1);
    for (let x = 0; x < cols; x++) {
      const w01 = (curve[x] + 1) * 0.5;
      const held = holdAmount * (1 - w01);
      hold[x] = held;
      curve[x] = 1 + TAIL_MARGIN + held + amount * w01;
      accentLift[x] = liftScale * curve[x];
    }

    // Bound the flood by the deepest crest the amplitude can reach, so the band
    // still ends completely solid whatever the wave is doing at that moment.
    const flood =
      exit * (1 + TAIL_MARGIN + curveAmount * (1 + waveBreath));
    // Full coverage still sits inside the accent's falloff window, so without
    // this the orange would survive into the flooded band. It belongs to the
    // edge, so it leaves with the edge.
    const accentFade = 1 - exit;
    const useAccent = accentStrength > 0 && accentWidth > 0 && accentFade > 0;
    const invRows = rows > 1 ? 1 / (rows - 1) : 0;
    // Dots keep the full dot colour through the solid run, then ramp their
    // alpha down once coverage drops below `tailFade`, so the dissolving end
    // reads as a grey wash thinning into the section behind it instead of hard
    // white specks on black. Alpha rather than a blend toward a fixed grey: the
    // canvas composites over the band's own background, so the ramp lands on
    // the right dark end without being told what that end is.
    const tail = Math.max(0.0001, tailFade);
    const invTail = 1 / tail;

    pixels.fill(0);

    if (front > 0) {
      for (let y = 0; y < rows; y++) {
        const band = y * invRows;
        const rowBase = (y & 7) * 8;
        const accentRowBase = ((y + BAYER_OFFSET_Y) & 7) * 8;
        const offset = y * cols;

        for (let x = 0; x < cols; x++) {
          // Each column dissolves on its own curve, so the density contours
          // bow. The curve is scaled by `band` so the top edge stays solid
          // across the full width and butts cleanly against the section above.
          const depth = band * curve[x];
          const raw = clamp01(
            (front - (flip ? 1 - depth : depth)) / front + hold[x] + flood,
          );
          if (raw <= 0 && !invert) continue;

          const coverage = raw > 0 ? gammaLut[(raw * (GAMMA_STEPS - 1)) | 0] : 0;
          const threshold = (BAYER[rowBase + (x & 7)] + 0.5) / 64;
          // A cell is painted where the dither puts a dot - or, inverted, a gap
          if ((coverage > threshold) === invert) continue;

          let colour = dot;
          if (useAccent) {
            // Accent peaks on one iso-coverage contour, which follows the same
            // bow as the dissolve edge - sampled `accentShift` of the band's
            // height downhill of the cell it paints, which slides the whole
            // accent toward the dissolving edge.
            const lifted = clamp01(raw + accentLift[x]);
            const accentCoverage = gammaLut[(lifted * (GAMMA_STEPS - 1)) | 0];
            const falloff =
              1 - Math.abs(accentCoverage - accentAt) / accentWidth;
            if (falloff > 0) {
              // Orange only survives where the dither is actually mixed. At
              // full coverage there are no gaps and at zero there are no dots,
              // so an accent cell there sits alone in flat colour and reads as
              // a rigid lattice instead of travelling with the dots. This reads
              // the lifted value too, so the accent keeps its full weight at the
              // shifted position instead of dimming as it climbs.
              const mix = 4 * accentCoverage * (1 - accentCoverage);
              const texture = mix * mix;
              const weight =
                falloff *
                texture *
                accentBias[x] *
                accentStrength *
                accentFade;
              const accentThreshold =
                (BAYER[accentRowBase + ((x + BAYER_OFFSET_X) & 7)] + 0.5) / 64;
              if (weight > accentThreshold) colour = accent;
            }
          }

          // Painted share of the cell's neighbourhood: its dots, or inverted, its gaps
          const painted = invert ? 1 - coverage : coverage;
          const alpha = painted < tail ? ((painted * invTail * 255) | 0) : 255;
          pixels[offset + x] = (colour & 0x00ffffff) | (alpha << 24);
        }
      }
    }

    ctx.putImageData(image, 0, 0);
  }, [
    dotColor,
    accentColor,
    accentAt,
    accentWidth,
    accentStrength,
    accentShift,
    tailFade,
    curveAmount,
    holdAmount,
    waveDrift,
    waveBreath,
    buildEnd,
    flip,
    invert,
  ]);

  const resize = useCallback(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    const size = Math.max(1, cellSize);
    const cols = Math.max(1, Math.round(wrapper.offsetWidth / size));
    const rows = Math.max(1, Math.round(wrapper.offsetHeight / size));

    // Everything below is per-column or per-shape, never per-frame, so a
    // scrub tick stays pure arithmetic over the grid.
    const shape = `${gamma}`;
    const current = gridRef.current;
    if (cols === current.cols && rows === current.rows && shape === current.shape)
      return;

    canvas.width = cols;
    canvas.height = rows;

    // Only the frozen half of each harmonic lives here - sin/cos of the
    // column's angle. Phase and amplitude are applied per frame in draw(), so
    // the crest can move on scroll without recomputing trig per column.
    const basis = new Float32Array(WAVES * 2 * cols);
    const accentBias = new Float32Array(cols);
    for (let x = 0; x < cols; x++) {
      const xn = cols > 1 ? x / (cols - 1) : 0;
      for (let k = 0; k < WAVES; k++) {
        const angle = xn * Math.PI * WAVE_FREQ[k] + WAVE_PHASE[k];
        basis[k * 2 * cols + x] = Math.sin(angle);
        basis[k * 2 * cols + cols + x] = Math.cos(angle);
      }
      // Orange fades out toward the left and right edges of the band.
      accentBias[x] = 0.35 + 0.65 * Math.sin(xn * Math.PI);
    }

    const gammaLut = new Float32Array(GAMMA_STEPS);
    for (let i = 0; i < GAMMA_STEPS; i++) {
      const t = i / (GAMMA_STEPS - 1);
      gammaLut[i] = gamma === 1 ? t : Math.pow(t, gamma);
    }

    const image = canvas.getContext("2d").createImageData(cols, rows);
    gridRef.current = {
      cols,
      rows,
      shape,
      image,
      pixels: new Uint32Array(image.data.buffer),
      basis,
      curve: new Float32Array(cols),
      hold: new Float32Array(cols),
      accentBias,
      accentLift: new Float32Array(cols),
      gammaLut,
    };
    draw();
  }, [cellSize, gamma, draw]);

  useEffect(() => {
    if (shouldSkipRealtimeGPU()) return;

    resize();

    const wrapper = wrapperRef.current;
    if (!wrapper || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [resize]);

  useGSAP(
    () => {
      if (shouldSkipRealtimeGPU()) return;

      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Reduced motion still gets the transition, just already resolved.
      if (!scrub || reduced) {
        progressRef.current = buildEnd;
        draw();
        return;
      }

      // No `scrub` here: it only has meaning when a tween is linked to the
      // trigger. The band redraws straight off `self.progress`, and the page's
      // smooth scroll is what keeps that from stepping.
      const create = (from, to) =>
        ScrollTrigger.create({
          trigger: wrapperRef.current,
          start: from,
          end: to,
          markers,
          onUpdate: (self) => {
            progressRef.current = self.progress;
            draw();
          },
          onRefresh: (self) => {
            progressRef.current = self.progress;
            draw();
          },
        });

      // The band is usually much taller on phones (`max-md:h-[150vw]`), so the
      // same trigger points can leave the build finishing well off-screen and
      // the two widths get their own points. matchMedia rebuilds the trigger
      // on a breakpoint cross.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => create(start, end));
      mm.add("(max-width: 767px)", () =>
        create(mobileStartTriggers, mobileEndTriggers),
      );

      return () => mm.revert();
    },
    {
      scope: wrapperRef,
      dependencies: [
        scrub,
        start,
        end,
        mobileStartTriggers,
        mobileEndTriggers,
        draw,
      ],
    },
  );

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`pointer-events-none relative w-full overflow-hidden ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
