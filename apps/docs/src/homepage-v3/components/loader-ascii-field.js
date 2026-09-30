import { resolveCharSet } from "./char-sets";

/**
 * Full-screen dithered-text loader field.
 *
 * The wordmark SVG (/hyperiux-wordmark.svg) is loaded and rasterised into a
 * coverage buffer, so every cell knows how much ink it carries.
 *
 * Two layers share one grid:
 *   static  - churning random glyphs, thinned out as progress rises.
 *   reveal  - the wordmark shape, dithered in by the Bayer threshold.
 *
 * There are two ways out, chosen by `mode`:
 *
 *   dock  - the whole field collapses onto the navbar's logo. One similarity
 *           transform carries every cell, so the mark keeps its shape all the
 *           way down and lands exactly on the rect the real svg will occupy,
 *           which is what lets the two cross-fade as a single mark hardening.
 *           The background static fades out ahead of it, so only the wordmark
 *           is still travelling by the time it arrives.
 *   burst - exit is per-cell, not per-letter: the field bursts outward from the
 *           centre of the screen, every cell shrinking as it travels its own
 *           ray, so the mark breaks into particles that clear the viewport
 *           rather than the word collapsing letter by letter.
 *
 * Either way it hands off to the hero's own ASCII field, which is fading up
 * underneath while this is still in flight.
 *
 * Every cell is drawn with a real alpha, so nothing pops on or off - cells are
 * batched by (colour, alpha step) through a counting sort, which keeps the
 * whole frame down to a few dozen fillStyle changes.
 *
 * Deliberately 2D canvas, not WebGL: the hero's ASCII effect is compiling its
 * shaders and decoding its video while this is on screen.
 */

const WORDMARK_GLYPHS = Array.from("HYPERIUX");

// ── Colours ──────────────────────────────────────────────────────────────────
const STATIC_COLOR = "#1a1a1a";
const REVEAL_COLOR = "#ff5f00";
const FLASH_COLOR = "#ffffff";
const COUNTER_COLOR = "#ffffff";
// What the mark cools to on its way out. The orange is the loader's own accent
// and carrying it across the hero would read as a second colour crossing the
// screen; grey lets the particles pass over the ASCII field instead of
// competing with it.
const BURST_COLOR = "#8f8f8f";
// Steps in the orange → grey ramp. Quantised like alpha and scale, so a cooling
// cell is still one bucket in the sort rather than its own fillStyle change.
const BURST_STEPS = 5;

// ── Timing / density ────────────────────────────────────────────────────────
const FRAME_MS = 1000 / 60;
// How often a cell swaps glyph, and how far apart neighbouring cells' churn
// clocks are pushed. Without the spread the whole grid flips on the same tick,
// which reads as a screen-wide glitch instead of a texture.
const CHURN_MS = 110;
const CHURN_SPREAD = 1;
// A dissolving cell churns harder than a settled one.
const CHURN_EXIT_BOOST = 2.5;
const STATIC_DENSITY = 0.18;
// Width of the soft edge on the static density test - cells inside this band
// ramp their alpha instead of switching on.
const STATIC_FEATHER = 0.05;
// Slow per-cell brightness drift, so a settled field still breathes.
const STATIC_BREATH = 0.9;
const FLASH_BAND = 0.07;
const INK_FEATHER = 0.05;
const SWEEP = 0.35;

// ── Exit ────────────────────────────────────────────────────────────────────
// The burst. Every cell travels a straight line outward from the centre of the
// screen at constant velocity - linear in time, which is what separates this
// from an eased explosion: the field opens up rather than detonating.
//
// Distances are fractions of the viewport's half-diagonal, so the burst covers
// the same proportion of the screen whatever the window size.
//
// Flat distance every cell travels regardless of where it sits. This is the
// term that moves the middle of the wordmark: cells near the origin have no
// meaningful ray to be pushed along, and without a flat push the centre of the
// mark would sit still while only its edges appeared to burst.
const EXIT_LAUNCH = 0.55;
// Extra distance handed to a cell in proportion to how far out it already is,
// so the edges of the field clear the viewport at the same moment the centre
// does rather than lagging behind it.
const EXIT_REACH = 1.1;
// How far each cell's direction is pulled off its radial ray toward a stable
// random one. Pure rays expand the wordmark along its own shape - it is a thin
// horizontal band, so it opens sideways and barely at all vertically. Mixing in
// a random direction is what gives the band real spread on both axes; too much
// and it stops reading as a burst from a point.
const EXIT_SCATTER = 0.45;
// Glyph size at the end of a cell's own burst, as a fraction of the resting
// size. Shrinking as they travel is what makes the field read as breaking into
// particles instead of sliding away at full size.
const EXIT_SCALE_MIN = 0.18;
// Portion of the exit timeline spent handing out per-cell start times. The
// remainder (1 - spread) is how long any single cell takes to dissolve. Kept
// short so the field goes mostly together - a long stagger reads as a
// dissolve, and this wants to read as one release.
const EXIT_SPREAD = 0.35;
// How much of that stagger follows radius rather than being random. Centre
// cells leave first, so the break-up travels outward as a front.
const EXIT_RADIAL_BIAS = 0.55;
// Background static clears a touch ahead of the wordmark.
const EXIT_STATIC_LEAD = 0.25;

// ── Dock ────────────────────────────────────────────────────────────────────
// The other exit: the field is mapped onto the navbar's logo rect and the whole
// map is walked in, so the mark scales down and travels to the corner as one
// piece. Deliberately rigid - a per-cell stagger here would smear the wordmark
// on the way over and it has to arrive still reading as itself, sitting on the
// svg that replaces it.
//
// Easing lives on the scalar this reads (see LoaderV3), so nothing here has to
// know how the travel is paced.
//
// The mark does not churn on its way to the navbar. Every cell keeps the woven
// glyph it settled on, so the only thing changing during the travel is the
// transform itself - the wordmark moves and scales as one fixed piece of
// artwork. Churning here (at any strength, over any window) reads as the mark
// scrambling or sparkling while it docks, which is precisely what it must not
// do at the moment it merges with the solid svg underneath it.
//
// Extra ink feather while the dither hardens. As `harden` pulls the Bayer
// threshold away, held-back cells cross into view mid-travel; through the
// narrow resting feather that crossing is a pop, and a screen full of pops is
// the flicker. This widens the ramp in step with the hardening so each cell
// fades in over many frames instead.
const DOCK_INK_FEATHER = 0.42;
//
// A glyph's ink is a fraction of its cell, so shrinking the field costs ink as
// the *square* of the scale: transform the mark down to logo size untouched and
// it arrives as a dim grey stipple, nothing like the solid svg it is supposed to
// merge with. Two things put that back, both easing in over the travel:
//
// Glyphs stay larger than the cell they sit in, so neighbours overlap into
// continuous strokes rather than a dot screen.
const DOCK_GLYPH_SWELL = 1.6;
// And the dither threshold is eased away, so the cells the Bayer matrix was
// holding back fill in and the mark hardens toward a solid shape - which is
// also what makes the swap to the real svg read as the same mark sharpening
// rather than one thing being replaced by another.
const DOCK_HARDEN = 1;
//
// The background static has its own scalar (`state.clear`) and goes first,
// before the mark moves at all. Clearing it during the travel instead leaves
// grey noise sliding across the screen behind the wordmark, which reads as the
// whole page shrinking rather than the mark leaving the field behind - the
// screen empties, and then one thing crosses it.

// Glyph scale is quantised to this many steps, so a whole size's worth of
// cells is drawn under one `ctx.font`. At rest every cell is at full size and
// they all land in the same bucket, so this costs nothing until exit starts.
const SCALE_STEPS = 8;

// ── SVG wordmark source ─────────────────────────────────────────────────────
const WORDMARK_SRC = "/hyperiux-wordmark.svg";
const SVG_WIDTH = 351;
const SVG_HEIGHT = 43;
const SVG_RATIO = SVG_HEIGHT / SVG_WIDTH;

// ── Layout ──────────────────────────────────────────────────────────────────
const MOBILE_BREAKPOINT = 768;
const WORD_WIDTH_FACTOR = 0.82;
// The mark is 8:1, so its height - and with it the number of rows of glyphs the
// letterforms get to be drawn out of - is set entirely by how wide the box is.
// A phone has so little width to give that the wordmark lands on a handful of
// rows, which is below what it takes to resolve a counter or a crossbar: the
// letters stop being letters and the mark reads as a band of noise. Give it
// more of the viewport there. Still inset enough to read as a centred mark.
const WORD_WIDTH_FACTOR_MOBILE = 0.92;
const WORD_MAX_WIDTH = 1600;

// 8×8 Bayer ordered-dither matrix
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];

const KIND_STATIC = 0;
const KIND_FLASH = 1;
// Wordmark cells occupy a *ramp* of kinds rather than one. KIND_REVEAL is the
// mark's own orange; each step above it is further toward BURST_COLOR, so a
// cell cools as it bursts. Nothing else has to know the ramp exists - it is
// still just an index into KIND_COLORS.
const KIND_REVEAL = 2;

// Alpha is quantised to this many steps so cells can be batched by colour.
const ALPHA_STEPS = 12;

/** Linear blend between two `#rrggbb` strings. */
function mixHex(from, to, t) {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift) =>
    Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `#${[16, 8, 0]
    .map((shift) => channel(shift).toString(16).padStart(2, "0"))
    .join("")}`;
}

const KIND_COLORS = [
  STATIC_COLOR,
  FLASH_COLOR,
  ...Array.from({ length: BURST_STEPS }, (_, step) =>
    mixHex(REVEAL_COLOR, BURST_COLOR, step / (BURST_STEPS - 1))
  ),
];

// Draw-list key layout: scale is the most significant field, so the sorted
// list walks each font size exactly once and only re-sets fillStyle within it.
const FILL_BUCKETS = KIND_COLORS.length * ALPHA_STEPS;
const DRAW_BUCKETS = SCALE_STEPS * FILL_BUCKETS;

/** rgba() strings for every (kind, alpha step) pair - built once. */
const FILL_STYLES = KIND_COLORS.flatMap((hex) => {
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return Array.from(
    { length: ALPHA_STEPS },
    (_, step) => `rgba(${r},${g},${b},${((step + 1) / ALPHA_STEPS).toFixed(3)})`
  );
});

function hash(x, y, t) {
  const v = Math.sin(x * 127.1 + y * 311.7 + t * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Which glyph-swap tick a cell is on. The per-cell phase offset stops the whole
 * grid flipping in lockstep, and `agitation` (0→1) speeds the swaps up as the
 * cell dissolves.
 */
function churnBucket(now, cellPhase, agitation) {
  const period = CHURN_MS / (1 + agitation * CHURN_EXIT_BOOST);
  return Math.floor((now + cellPhase * CHURN_MS * CHURN_SPREAD) / period);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Which `scaleFonts` bucket a cell that is `spread` (0→1) into its own burst
 * belongs in. Scale falls linearly from full size to EXIT_SCALE_MIN, so this is
 * just that ramp read backwards onto the step index - a resting cell (spread 0)
 * always lands on the last step, which is the untouched font size.
 */
function scaleStepOf(spread) {
  const step = Math.round((1 - spread) * (SCALE_STEPS - 1));
  return step < 0 ? 0 : step > SCALE_STEPS - 1 ? SCALE_STEPS - 1 : step;
}

function monoFamily() {
  const variable = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-avenir")
    .trim();
  return variable
    ? `${variable}, system-ui, sans-serif`
    : "system-ui, sans-serif";
}

/**
 * The wordmark's resting box in viewport pixels - centred, and the frame the
 * dock transform maps out of.
 */
function wordmarkBox(viewW, viewH) {
  const factor =
    viewW < MOBILE_BREAKPOINT ? WORD_WIDTH_FACTOR_MOBILE : WORD_WIDTH_FACTOR;
  const w = Math.min(viewW * factor, WORD_MAX_WIDTH);
  const h = w * SVG_RATIO;
  return { x: (viewW - w) / 2, y: (viewH - h) / 2, w, h };
}

/**
 * Rasterise the wordmark into a coverage buffer at grid resolution.
 */
function buildCoverage(cols, rows, cellW, cellH, viewW, viewH, image) {
  const coverage = new Float32Array(cols * rows);

  if (!cols || !rows) return coverage;

  const box = wordmarkBox(viewW, viewH);
  const targetW = box.w;
  const targetH = box.h;
  const offsetX = box.x;
  const offsetY = box.y;

  // Draw the SVG into a temporary canvas at grid resolution
  const source = document.createElement("canvas");
  const srcW = Math.max(1, Math.round(targetW));
  const srcH = Math.max(1, Math.round(targetH));
  source.width = srcW;
  source.height = srcH;

  const sctx = source.getContext("2d", { willReadFrequently: true });

  if (image) {
    sctx.drawImage(image, 0, 0, srcW, srcH);
  } else {
    // Fallback: draw "HYPERIUX" as text if the SVG hasn't loaded yet
    sctx.fillStyle = "#ffffff";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.font = `700 ${srcH * 0.9}px ui-monospace, monospace`;
    sctx.fillText("HYPERIUX", srcW / 2, srcH / 2);
  }

  const { data } = sctx.getImageData(0, 0, srcW, srcH);

  // Sample into the grid
  const colStart = Math.max(0, Math.floor(offsetX / cellW));
  const colEnd = Math.min(cols - 1, Math.ceil((offsetX + targetW) / cellW));
  const rowStart = Math.max(0, Math.floor(offsetY / cellH));
  const rowEnd = Math.min(rows - 1, Math.ceil((offsetY + targetH) / cellH));

  for (let row = rowStart; row <= rowEnd; row++) {
    // Map grid cell centre to source pixel coordinates
    const srcPxY = ((row * cellH + cellH / 2 - offsetY) / targetH) * srcH;
    const sy = Math.floor(srcPxY);
    if (sy < 0 || sy >= srcH) continue;

    for (let col = colStart; col <= colEnd; col++) {
      const srcPxX = ((col * cellW + cellW / 2 - offsetX) / targetW) * srcW;
      const sx = Math.floor(srcPxX);
      if (sx < 0 || sx >= srcW) continue;

      const alpha = data[(sy * srcW + sx) * 4 + 3] / 255;
      if (alpha > 0.01) coverage[row * cols + col] = alpha;
    }
  }

  return coverage;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} state - mutated from outside: `progress` 0→1, `exit` 0→1
 * @param {object} [options]
 * @param {"dock"|"burst"} [options.mode] How the field leaves. `dock` needs a
 *   target and falls back to `burst` when there is nothing to dock onto.
 * @param {() => {x:number,y:number,w:number,h:number}|null} [options.dockTarget]
 *   Rect the mark lands on, re-read whenever the grid is measured.
 */
export function createAsciiLoaderField(canvas, state, options = {}) {
  const {
    mode = "burst",
    dockTarget = null,
    staticCharSet = "symbols",
    staticChars = "",
    wordmarkChars = "HYPERIUX",
  } = options;
  const markGlyphs = Array.from(wordmarkChars).filter((c) => c !== " ");
  const wordGlyphs = markGlyphs.length ? markGlyphs : WORDMARK_GLYPHS;
  const staticGlyphs = (staticChars
    ? Array.from(staticChars)
    : resolveCharSet(staticCharSet)
  ).filter((c) => c !== " ");
  const noiseGlyphs = staticGlyphs.length ? staticGlyphs : wordGlyphs;
  const ctx = canvas.getContext("2d", { alpha: true });

  let cols = 0;
  let rows = 0;
  let cellW = 0;
  let cellH = 0;
  let fontSize = 0;
  let fontFamily = "";

  let coverage = null;

  // Dock geometry, resolved with the grid. `dock` stays null when the mode is
  // burst or the navbar's logo can't be found, and that null is what every
  // dock branch below tests - the field simply bursts instead.
  let box = null;
  let dock = null;
  let dockScale = 1;

  // Per-cell constants - stable for the lifetime of a grid size, which is what
  // keeps the field from re-rolling itself (and flickering) every frame.
  let rank = null; // static density rank
  let phase = null; // churn offset + breathing phase
  let delay = null; // exit start time
  let dirX = null; // unit burst direction
  let dirY = null;
  let reach = null; // burst distance, in viewport half-diagonals

  // One font string per scale step, rebuilt with the grid.
  let scaleFonts = null;

  // Draw list, rebuilt each frame and sorted by (kind, alpha step).
  let listKey = null;
  let listGlyph = null;
  let listX = null;
  let listY = null;
  let order = null;
  const bucketCounts = new Int32Array(DRAW_BUCKETS);
  const bucketStart = new Int32Array(DRAW_BUCKETS);

  let svgImage = null;
  let frame = 0;
  let lastPaint = 0;
  // Drives the background static's glyph swaps. Tracks `now` until the mark
  // starts docking, then holds - see the static branch in `paint`.
  let staticChurnClock = 0;

  const rebuild = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!cols || !rows || !w || !h) return;

    coverage = buildCoverage(cols, rows, cellW, cellH, w, h, svgImage);

    const total = cols * rows;
    rank = new Float32Array(total);
    phase = new Float32Array(total);
    delay = new Float32Array(total);
    dirX = new Float32Array(total);
    dirY = new Float32Array(total);
    reach = new Float32Array(total);

    // Every cell's burst vector is fixed by the grid, so it is solved once here
    // rather than per frame - exit costs the paint loop two multiplies a cell.
    for (let row = 0; row < rows; row++) {
      // Offset from the centre of the viewport, normalised so each axis runs
      // -1..1 over its own extent. Working in this square space rather than in
      // pixels tilts the rays of a wide grid toward vertical, which is half of
      // what stops the burst running flat along the wordmark's own band.
      const ny = ((row * cellH + cellH / 2) / h - 0.5) * 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        rank[idx] = hash(col, row, 1.7);
        phase[idx] = hash(col + 31, row + 11, 5.3);

        const nx = ((col * cellW + cellW / 2) / w - 0.5) * 2;
        const spanFromCentre = Math.hypot(nx, ny);
        const radius = Math.min(1, spanFromCentre / Math.SQRT2);

        // Centre cells release first, so the break-up reads as a front moving
        // outward. The random half keeps that front ragged rather than a clean
        // expanding ring.
        const random = hash(col + 7, row + 23, 9.1);
        delay[idx] =
          random * (1 - EXIT_RADIAL_BIAS) + radius * EXIT_RADIAL_BIAS;

        // Radial ray, pulled toward a stable random direction. A cell sitting
        // exactly on the origin has no ray at all and comes out of this as pure
        // scatter, which is the behaviour we want there anyway.
        const rayX = spanFromCentre > 0 ? nx / spanFromCentre : 0;
        const rayY = spanFromCentre > 0 ? ny / spanFromCentre : 0;
        const angle = hash(col + 53, row + 41, 2.9) * Math.PI * 2;
        const mixX =
          rayX * (1 - EXIT_SCATTER) + Math.cos(angle) * EXIT_SCATTER;
        const mixY =
          rayY * (1 - EXIT_SCATTER) + Math.sin(angle) * EXIT_SCATTER;
        const mixLen = Math.hypot(mixX, mixY) || 1;
        dirX[idx] = mixX / mixLen;
        dirY[idx] = mixY / mixLen;

        // Per-cell speed spread, so the field doesn't travel as one shell.
        reach[idx] =
          (EXIT_LAUNCH + radius * EXIT_REACH) *
          (0.75 + hash(col + 3, row + 67, 6.1) * 0.5);
      }
    }

    listKey = new Uint16Array(total);
    listGlyph = new Uint8Array(total);
    listX = new Float32Array(total);
    listY = new Float32Array(total);
    order = new Int32Array(total);
  };

  const measure = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);

    // Mobile is the constrained case: the cell has to be small enough that the
    // wordmark's own height is worth a usable number of rows. At 9px the mark
    // resolved onto four of them and read as static; this roughly doubles that.
    // The whole grid is derived from this one number, so the static, the
    // counter and the dock transform all follow it down together.
    fontSize = w < MOBILE_BREAKPOINT ? 6 : w < 1280 ? 11 : 12;
    cellW = fontSize * 0.62;
    cellH = fontSize * 1.06;
    cols = Math.ceil(w / cellW);
    rows = Math.ceil(h / cellH);

    fontFamily = monoFamily();

    box = wordmarkBox(w, h);
    dock = mode === "dock" && dockTarget ? dockTarget() : null;
    // Both rects are the same artwork, so this one number is the whole dock:
    // the ratio of the two boxes scales the glyphs and carries the cells.
    dockScale = dock ? dock.w / box.w : 1;

    // Step 0 is the smallest a cell ever gets - the far end of the burst, or
    // logo size when docking - and the last step is resting size. See
    // `scaleStepOf`, which is the inverse of this.
    const minScale = dock
      ? Math.min(dockScale * DOCK_GLYPH_SWELL, 1)
      : EXIT_SCALE_MIN;
    scaleFonts = Array.from({ length: SCALE_STEPS }, (_, step) => {
      const t = step / (SCALE_STEPS - 1);
      const scale = minScale + (1 - minScale) * t;
      return `${(fontSize * scale).toFixed(2)}px ${fontFamily}`;
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    rebuild();
  };

  const paintCounter = (w, h, alpha) => {
    const pct = String(Math.round(state.progress * 100)).padStart(3, "0");
    const counterSize = w < MOBILE_BREAKPOINT ? 12 : 14;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${counterSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = COUNTER_COLOR;
    ctx.fillText(pct, w / 2, h - 30);
    ctx.restore();
    // Reset main font
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
  };

  const paint = (now) => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!coverage || !listKey) return;

    ctx.clearRect(0, 0, w, h);

    const seconds = now / 1000;
    const progress = clamp01(state.progress || 0);
    const exit = clamp01(state.exit || 0);
    // Docking only: the background static's own fade, run to completion before
    // `exit` starts moving the mark.
    const clear = clamp01(state.clear || 0);
    const exitSpan = 1 - EXIT_SPREAD;
    const reveal = progress * (1 + SWEEP) * 1.12;
    const density = STATIC_DENSITY * (1 - progress * 0.62);
    // Burst distances are stored in half-diagonals; this is what turns them
    // back into pixels for the viewport we're actually painting.
    const span = Math.hypot(w, h) / 2;

    // Docking is one similarity transform of the whole field, walked in by
    // `exit`: every cell reads the same two numbers, so the mark holds its
    // shape exactly and every cell shares a font bucket on the way down.
    //
    //   x = lerp(x, dock.x + (x - box.x) * dockScale, exit)
    //
    // expanded into scale-and-offset form so a cell costs one multiply-add.
    const docking = dock !== null;
    // How far the mark has hardened out of the dither. Squared: the ink only
    // starts falling away once the thing is genuinely small, so filling in any
    // earlier just fattens the wordmark while it is still full size.
    const harden = docking ? exit * exit * DOCK_HARDEN : 0;
    const dockZoom = docking ? 1 + (dockScale - 1) * exit : 1;
    const dockX = docking ? exit * (dock.x - box.x * dockScale) : 0;
    const dockY = docking ? exit * (dock.y - box.y * dockScale) : 0;
    // The glyphs shrink with the field itself rather than through the burst's
    // step ladder. `scaleStepOf` quantises to SCALE_STEPS buckets, which over a
    // full-screen-to-logo shrink is eight visible size jumps - fine for a burst
    // where cells are scattering anyway, plainly a stair-step when the mark is
    // one rigid shape being scaled. Docking gets its own font, set once for the
    // whole frame: every cell shares the same size, so it costs one `ctx.font`
    // either way and the shrink is continuous.
    const dockFontScale = docking
      ? Math.max(dockZoom * DOCK_GLYPH_SWELL, dockZoom)
      : 1;
    const dockFont = docking
      ? `${(fontSize * Math.min(dockFontScale, 1)).toFixed(2)}px ${fontFamily}`
      : null;
    const dockStep = SCALE_STEPS - 1;
    // Frozen the instant the mark starts travelling (see the static branch).
    // Held on the last pre-exit value rather than snapped to zero, so cells
    // keep whatever glyph they were showing instead of all re-rolling at once.
    if (!docking || exit === 0) staticChurnClock = now;

    let count = 0;

    for (let row = 0; row < rows; row++) {
      const cellY = row * cellH + cellH / 2;

      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const cell = phase[idx];
        const cover = coverage[idx];

        // Per-cell exit window: starts at `delay`, then bursts over `exitSpan`.
        // Left linear on purpose - every downstream use of it (travel, scale,
        // alpha) is a straight ramp, so a cell leaves at constant velocity from
        // the instant its window opens, the way a thrown particle does. Easing
        // here is what would turn this back into a dissolve.
        //
        // Docking has no per-cell window for the mark - the whole thing travels
        // together - so `wordExit` there is just the scalar, and only drives the
        // churn. The static keeps its stagger either way, so it thins out
        // raggedly rather than dimming as one sheet; docking just runs it off
        // `clear`, which is finished before the mark starts moving.
        const cellDelay = delay[idx];
        const staticClock = docking ? clear : exit * (1 + EXIT_STATIC_LEAD);
        const wordExit = exit === 0
          ? 0
          : docking
            ? exit
            : clamp01((exit - cellDelay * EXIT_SPREAD) / exitSpan);
        const staticExit =
          staticClock === 0
            ? 0
            : clamp01((staticClock - cellDelay * EXIT_SPREAD) / exitSpan);

        let kind = -1;
        let alpha = 0;
        let glyph = 0;

        if (cover > 0.01) {
          // Wordmark cell - dithered in by the Bayer threshold, swept L→R
          const threshold = (BAYER_8[(row % 8) * 8 + (col % 8)] / 64) * (1 - harden);
          const edge =
            cover * (reveal - (col / cols) * SWEEP * 1.12) - threshold;

          if (edge > 0) {
            kind =
              exit === 0 && edge < FLASH_BAND ? KIND_FLASH : KIND_REVEAL;
            // `harden` sweeps the dither threshold away as the mark docks, so
            // cells the Bayer matrix was holding back cross into view during
            // the travel. Through the narrow resting feather that crossing is
            // a snap from nothing to solid - a cell popping on, which is the
            // flicker that reads as the mark sparkling on its way to the
            // navbar. Widening the feather as it hardens turns each of those
            // into a fade instead, so the mark fills in smoothly.
            alpha = Math.min(1, edge / (INK_FEATHER + harden * DOCK_INK_FEATHER));
            // Stable woven glyphs inside the letter
            glyph = (col + row) % wordGlyphs.length;

            if (wordExit > 0) {
              if (docking) {
                // The mark is landing on the navbar's logo, which is this same
                // orange - so it neither cools nor thins on the way. It arrives
                // at full strength and the svg takes over from there.
                //
                // Nothing else happens to a docking cell. The glyph it is
                // holding is the glyph it keeps: no churn, no re-roll. The mark
                // is a fixed piece of artwork being scaled and moved, so the
                // only thing changing on screen is the transform - which is
                // what makes it read as the wordmark travelling to the navbar
                // rather than a field of characters that happens to shrink.
              } else {
                alpha *= 1 - wordExit;
                // Cool off the mark's orange as the cell travels, so what
                // crosses the hero is grey particles rather than a second
                // accent colour.
                kind =
                  KIND_REVEAL +
                  Math.min(
                    BURST_STEPS - 1,
                    Math.round(wordExit * (BURST_STEPS - 1))
                  );
                // Past a beat the letter stops holding its shape and the cell
                // churns free - this is the "scatter" half of the dissolve.
                if (wordExit > 0.1) {
                  glyph =
                    (hash(col + 17, row + 5, churnBucket(now, cell, wordExit)) *
                      wordGlyphs.length) |
                    0;
                }
              }
            }
          }
        }

        if (kind < 0) {
          // Background static - a stable rank per cell, so cells fade with the
          // density instead of being re-rolled (and strobing) every tick.
          const ceiling = density * (1 - cover * 0.85);

          // `breathe` only ever dims, so cells under the ceiling can't light -
          // skip the sin for the ~80% of the grid that is dark anyway.
          if (ceiling > rank[idx]) {
            const breathe =
              0.72 +
              0.28 * Math.sin(seconds * STATIC_BREATH + cell * Math.PI * 2);
            const lit = (ceiling * breathe - rank[idx]) / STATIC_FEATHER;

            if (lit > 0) {
              kind = KIND_STATIC;
              // Exit dims the cell rather than pulling the density ceiling out
              // from under it: dropping the ceiling would take cells off the
              // draw list outright, and a cell that has stopped being drawn
              // cannot travel. Fading the alpha instead lets the static burst
              // outward with the mark.
              alpha = Math.min(1, lit) * (1 - staticExit);
              // The static is carried by the same dock transform as the mark
              // and is not quite gone when the travel begins, so anything still
              // churning here flickers *while the whole field is moving* - read
              // as the wordmark sparkling, even though it is the noise behind
              // it. `staticChurnClock` stops advancing once the mark is on the
              // move, so the last of the static fades out frozen instead.
              glyph =
                (hash(
                  col + 17,
                  row + 5,
                  churnBucket(staticChurnClock, cell, staticExit)
                ) *
                  noiseGlyphs.length) |
                0;
            }
          }
        }

        if (kind < 0) continue;

        const step = Math.round(alpha * ALPHA_STEPS) - 1;
        if (step < 0) continue;

        let x = col * cellW + cellW / 2;
        let y = cellY;

        const spread = kind === KIND_STATIC ? staticExit : wordExit;
        let scaleStep = SCALE_STEPS - 1;

        if (docking) {
          // Same transform for every cell, static included: the field collapses
          // as one, and the static dims out of it rather than peeling away.
          x = x * dockZoom + dockX;
          y = y * dockZoom + dockY;
          scaleStep = dockStep;
        } else if (spread > 0) {
          // Straight line, constant velocity, along the direction this cell was
          // handed at rebuild.
          const travel = reach[idx] * spread * span;
          x += dirX[idx] * travel;
          y += dirY[idx] * travel;
          scaleStep = scaleStepOf(spread);
        }

        listKey[count] =
          scaleStep * FILL_BUCKETS +
          kind * ALPHA_STEPS +
          Math.min(ALPHA_STEPS - 1, step);
        listGlyph[count] = glyph;
        listX[count] = x;
        listY[count] = y;
        count++;
      }
    }

    // Counting sort by (scale step, kind, alpha step), so each font is set once
    // and each fillStyle once within it.
    bucketCounts.fill(0);
    for (let i = 0; i < count; i++) bucketCounts[listKey[i]]++;

    let running = 0;
    for (let b = 0; b < bucketCounts.length; b++) {
      bucketStart[b] = running;
      running += bucketCounts[b];
    }
    for (let i = 0; i < count; i++) order[bucketStart[listKey[i]]++] = i;

    let current = -1;
    let currentScale = -1;
    for (let i = 0; i < count; i++) {
      const item = order[i];
      const key = listKey[item];
      if (key !== current) {
        const scaleStep = (key / FILL_BUCKETS) | 0;
        if (scaleStep !== currentScale) {
          // Docking sizes every cell off one continuous scale rather than the
          // step ladder, so the shrink has no visible quantisation in it.
          ctx.font = dockFont ?? scaleFonts[scaleStep];
          currentScale = scaleStep;
        }
        ctx.fillStyle = FILL_STYLES[key % FILL_BUCKETS];
        current = key;
      }
      const kind = ((key % FILL_BUCKETS) / ALPHA_STEPS) | 0;
      const glyphs = kind === KIND_STATIC ? noiseGlyphs : wordGlyphs;
      ctx.fillText(glyphs[listGlyph[item]], listX[item], listY[item]);
    }

    // Subtle progress counter at the bottom - first thing to go on exit, and it
    // leaves with the static when docking: it belongs to the loading screen, so
    // it can't still be sitting there once the screen has emptied.
    const counterAlpha = 1 - clamp01(Math.max(exit / 0.3, clear));
    if (counterAlpha > 0) paintCounter(w, h, counterAlpha);
  };

  const tick = (now) => {
    frame = requestAnimationFrame(tick);
    // The throttle exists to keep high-refresh displays from repainting the
    // whole grid at 120fps+, not to pace a 60Hz one. Comparing against a flat
    // FRAME_MS does both: rAF on a 60Hz screen delivers frames a hair under
    // 16.67ms apart as often as not, and every one of those was being dropped
    // outright - a stutter in the middle of the travel, exactly where the mark
    // is moving fastest. The margin lets a nominally-on-time frame through, so
    // 60Hz paints every frame and faster panels still halve.
    if (now - lastPaint < FRAME_MS - 2) return;
    lastPaint = now;
    paint(now);
  };

  const onResize = () => {
    measure();
    paint(performance.now());
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  measure();
  frame = requestAnimationFrame(tick);
  window.addEventListener("resize", onResize);

  // Load the wordmark SVG - rebuild coverage once it arrives.
  const image = new Image();
  image.onload = () => {
    svgImage = image;
    rebuild();
  };
  image.src = WORDMARK_SRC;

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", onResize);
    image.onload = null;
  };
}
