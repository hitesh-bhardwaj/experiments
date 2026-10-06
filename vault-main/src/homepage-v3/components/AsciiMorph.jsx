"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Canvas can't read CSS variables: resolve next/font's real Plex Mono family name
function codeFontForCanvas() {
  return (typeof document !== "undefined" ? `${getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim() || '"IBM Plex Mono"'}, ui-monospace, Menlo, monospace` : "ui-monospace, Menlo, monospace");
}

// Two ends of the morph. Each is sampled into the *same* grid, so a glyph in one
// shape has a real coordinate to travel to in the other - this is what makes it
// an actual redistribution of glyphs rather than a crossfade.
const COLOR = "#ff5f00";
const SPREAD = 0.35; // 0 = every glyph moves together, →1 = long trailing stagger

// Dilation rounds for each end. Each round adds one ring of cells around the
// shape, making it heavier without changing glyph size or causing overlap.
// 1 = original silhouette, 2 = +1 ring, 3 = +2 rings, etc.
const NUMBER_FILL = 1;
const ICON_FILL = 3;

// A cell counts as "inked" once its averaged coverage crosses this. Below it the
// cell is empty (no glyph), which is what carves the hollow pupil of the eye.
//
// The sources are orange (#ff5f00, luminance ~0.52) sitting on a near-black
// plate, not shapes on transparency - so a cell's coverage is that orange
// averaged against the background it shares the cell with. Even a cell dead
// centre on a stroke only reaches ~0.3–0.43, so a 0.2 cut sat just under the
// signal and dropped every partially-covered cell: thin strokes came out as
// broken dashes rather than solid runs. 0.08 keeps the stroke interiors while
// staying well clear of the ~0.02 background plate.
const ON_THRESHOLD = 0.08;

// Smallest cell we will draw a glyph into. The font size is a rounded integer of
// the cell, so a sub-2px cell renders every "0"/"1" as partial-coverage
// antialiasing instead of solid pixels. On narrow viewports the requested `cols`
// is capped so the cell stays at or above this.
//
// Kept low deliberately: coarsening the grid also thins the shapes, because a
// stroke only a couple of source pixels wide occupies fewer cells. 2.0 is the
// point where the rounded font size reaches 2px - enough for a solid glyph -
// without giving up more resolution than that costs.
const MIN_CELL_PX = 2;

const smoothstep = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

/**
 * Samples one source image into a cols×rows grid of glyphs.
 *
 * Returns the inked cells only, each as { x, y, ch }. The glyph is not random:
 * an inked cell touching an empty neighbour (or the border) is an edge, drawn as
 * "0"; everything sealed inside the shape is "1". That gives the eye a "0" rim
 * over a "1" fill, and the thin "1" numeral reads as mostly "0".
 */
function sampleShape(image, cols, rows, fit, fill = 1) {
  const probe = document.createElement("canvas");
  probe.width = cols;
  probe.height = rows;
  const ctx = probe.getContext("2d", { willReadFrequently: true });

  const frame = fit === "cover" ? Math.max : Math.min;
  const scale = frame(cols / image.naturalWidth, rows / image.naturalHeight);
  const dw = image.naturalWidth * scale;
  const dh = image.naturalHeight * scale;
  ctx.drawImage(image, (cols - dw) / 2, (rows - dh) / 2, dw, dh);

  let pixels;
  try {
    pixels = ctx.getImageData(0, 0, cols, rows).data;
  } catch {
    return [];
  }

  let on = new Uint8Array(cols * rows);
  for (let i = 0; i < on.length; i += 1) {
    const p = i * 4;
    const lum =
      (pixels[p] * 0.3 + pixels[p + 1] * 0.59 + pixels[p + 2] * 0.11) / 255;
    const coverage = lum * (pixels[p + 3] / 255);
    on[i] = coverage >= ON_THRESHOLD ? 1 : 0;
  }

  // Dilate: each round adds one ring of cells around the shape, making it
  // heavier without touching glyph size. fill=1 → no dilation, 2 → +1 ring.
  const rounds = Math.max(0, Math.round(fill) - 1);
  for (let r = 0; r < rounds; r += 1) {
    const next = new Uint8Array(on);
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x;
        if (on[i]) continue;
        if (
          (x > 0 && on[i - 1]) ||
          (x < cols - 1 && on[i + 1]) ||
          (y > 0 && on[i - cols]) ||
          (y < rows - 1 && on[i + cols])
        ) {
          next[i] = 1;
        }
      }
    }
    on = next;
  }

  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const i = y * cols + x;
      if (!on[i]) continue;

      const edge =
        x === 0 ||
        y === 0 ||
        x === cols - 1 ||
        y === rows - 1 ||
        !on[i - 1] ||
        !on[i + 1] ||
        !on[i - cols] ||
        !on[i + cols];

      cells.push({ x, y, ch: edge ? "0" : "1" });
    }
  }

  return cells;
}

/**
 * Pairs two cell lists into travelling tokens.
 *
 * Both lists are sorted top-to-bottom, left-to-right, then walked in lockstep
 * against the longer of the two. The shorter shape's cells get reused as shared
 * start/end points, so at rest every glyph of that shape is covered and the
 * extra glyphs of the richer shape fan out from their nearest sibling.
 */
function buildTokens(fromCells, toCells) {
  const byRow = (a, b) => a.y - b.y || a.x - b.x;
  const a = [...fromCells].sort(byRow);
  const b = [...toCells].sort(byRow);
  if (!a.length || !b.length) return [];

  const n = Math.max(a.length, b.length);
  const tokens = new Array(n);

  for (let i = 0; i < n; i += 1) {
    const from = a[Math.floor((i * a.length) / n)];
    const to = b[Math.floor((i * b.length) / n)];
    tokens[i] = {
      ax: from.x,
      ay: from.y,
      ach: from.ch,
      bx: to.x,
      by: to.y,
      bch: to.ch,
      delay: n > 1 ? (i / (n - 1)) * SPREAD : 0,
    };
  }

  return tokens;
}

/**
 * Draws two shapes and morphs between them by travelling each glyph from its
 * position in `sources[0]` to its position in `sources[1]`. No scramble: a
 * glyph only ever shows its start char or its end char.
 *
 * Exposes an imperative `setProgress(0…1)` so a scrubbed GSAP timeline (or a
 * click tween) can drive it without re-rendering React on every tick. 0 rests on
 * the first source, 1 on the second.
 */
const AsciiMorph = forwardRef(function AsciiMorph(
  {
    sources,
    className = "",
    fit = "contain",
    cols = 50,
    numberFill = NUMBER_FILL,
    iconFill = ICON_FILL,
    numberBrightness = 100,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const tokensRef = useRef([]);
  const progressRef = useRef(0);
  const drawRef = useRef(() => {});

  const srcKey = sources.join("|");

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    let disposed = false;
    let cleanupMounted = () => {};

    // Preview.jsx renders four of these up front, each fetching two source
    // SVGs and running canvas sampling on mount - real work + real requests
    // for a grid that starts well below the fold. Deferred behind the same
    // IntersectionObserver-gating pattern used elsewhere (rootMargin 500px)
    // so nothing fires until the section is actually approaching view.
    // `setProgress` (below) can still be called by the scroll-driven morph
    // before this fires - it just records progressRef and calls whatever
    // drawRef currently is (the no-op stub until mount runs), and `rebuild`
    // draws from progressRef's latest value once images are ready, so no
    // scrub position is lost while this waits.
    const runMount = () => {
      const list = srcKey.split("|");
      let gridCols = cols;
      let gridRows = cols;
      let cell = 0;
      let cssW = 0;
      let cssH = 0;
      let ctx = null;
      let color = COLOR;

      const images = list.map(() => null);
      const rawCells = list.map(() => null);
      const densityFor = (index) => (index === 0 ? numberFill : iconFill);
      const numberAlpha = Math.max(0, Math.min(1, numberBrightness / 100));

      const draw = (p) => {
        if (!ctx || !cell) return;
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.fillStyle = color;
        ctx.globalAlpha = 1;

        const tokens = tokensRef.current;
        for (let i = 0; i < tokens.length; i += 1) {
          const tok = tokens[i];
          const local = smoothstep(clamp01((p - tok.delay) / (1 - SPREAD)));
          const x = lerp(tok.ax, tok.bx, local);
          const y = lerp(tok.ay, tok.by, local);
          const ch = local < 0.5 ? tok.ach : tok.bch;
          ctx.globalAlpha = lerp(numberAlpha, 1, local);
          ctx.fillText(ch, Math.round((x + 0.5) * cell), Math.round((y + 0.5) * cell));
        }
      };
      drawRef.current = draw;

      const rebuild = () => {
        if (!rawCells[0] || !rawCells[1]) return;
        tokensRef.current = buildTokens(rawCells[0], rawCells[1]);
        draw(progressRef.current);
      };

      const measure = () => {
        const { width, height } = box.getBoundingClientRect();
        if (!width || !height) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Integer CSS box so the bitmap is never stretched by a fractional layout.
        cssW = Math.max(1, Math.floor(width));
        cssH = Math.max(1, Math.floor(height));
        // `cols` is the ceiling, not a promise: a box too narrow to give each
        // column MIN_CELL_PX gets fewer, larger cells instead of a fine grid of
        // sub-pixel smears. Wide boxes are unaffected and keep the requested grid.
        gridCols = Math.max(1, Math.min(cols, Math.floor(cssW / MIN_CELL_PX)));
        cell = cssW / gridCols;
        gridRows = Math.max(1, Math.round(cssH / cell));

        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);

        ctx = canvas.getContext("2d", { alpha: true });
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        // Integer px font - fractional sizes anti-alias into mush.
        ctx.font = `${Math.max(1, Math.round(cell))}px ${codeFontForCanvas()}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLOR;
        color = window.getComputedStyle(canvas).color || COLOR;

        images.forEach((img, index) => {
          if (img?.complete && img.naturalWidth)
            rawCells[index] = sampleShape(
              img,
              gridCols,
              gridRows,
              fit,
              densityFor(index),
            );
        });
        rebuild();
      };

      list.forEach((src, index) => {
        const img = new window.Image();
        img.onload = () => {
          if (disposed) return;
          images[index] = img;
          if (cell) {
            rawCells[index] = sampleShape(
              img,
              gridCols,
              gridRows,
              fit,
              densityFor(index),
            );
            rebuild();
          }
        };
        img.src = src;
        images[index] = img;
      });

      measure();

      const observer = new ResizeObserver(measure);
      observer.observe(box);

      return () => {
        observer.disconnect();
      };
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          cleanupMounted = runMount();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(box);

    return () => {
      disposed = true;
      io.disconnect();
      cleanupMounted();
    };
  }, [srcKey, fit, cols, numberFill, iconFill, numberBrightness]);

  useImperativeHandle(ref, () => ({
    setProgress(value) {
      const p = clamp01(value);
      progressRef.current = p;
      drawRef.current(p);
    },
  }), []);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-primary"
      />
    </div>
  );
});

export default AsciiMorph;
