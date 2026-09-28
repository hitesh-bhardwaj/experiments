"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_CHAR_SET, resolveCharSet } from "./char-sets";
import { shouldSkipRealtimeGPU } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";

export const VIDEO_SRC = "/cube.mp4";

export const CUBE_ASCII_DEFAULTS = {
  /** Key into CHAR_SETS - which glyphs the ramp is built from. */
  charSet: DEFAULT_CHAR_SET,
  /**
   * Framing of the source clip inside the canvas. The video is stretched to fill
   * by default; these re-frame it without touching the glyph grid, so cell size
   * and density stay put. Below 1 shrinks the subject; the offset is in canvas
   * widths/heights from center, positive x moving it right, positive y down.
   * Areas the clip no longer covers repeat its edge pixels (flat background in
   * cube.mp4), which is why the empty margin still reads as empty.
   */
  videoScale: 0.8,
  videoOffsetX: 0.25,
  videoOffsetY: 0,
  /**
   * Off, the clip is stretched to fill the canvas - fine while the canvas is
   * roughly as wide as the 16:9 source. On, it is fitted to cover instead, so
   * the subject keeps its proportions whatever the canvas shape and the overflow
   * is cropped; videoScale then reads as a zoom on top of that fit.
   */
  fitAspect: false,
  charColumns: 180,
  /**
   * Column count derived from a target cell size in CSS pixels instead, so the
   * glyphs stay the same size as the canvas changes width. Overrides
   * charColumns when set; null leaves the fixed count in charge.
   */
  charCellPx: null,
  charZoom: 1.25,
  /** Gap between characters (0 = no gap, 1 = max gap). */
  charGap: 0,
  fluidEnabled: true,
  fluidColor: "#ff6a00",
  /** How hard flow replaces glyph gray with fluidColor (0 = off, 1 = default). */
  fluidTint: 3.0,
  /** Brightness multiplier on fluidColor so trails stay hot orange. */
  fluidBoost: 1.0,
  fluidForceBase: 0.1,
  fluidSpeedSat: 18,
  fluidForceMultiplier: 0.2,
  fluidInnerRadius: 0.15,
  fluidRadiusLife: .30,
  /**
   * Click wave. The hover trail is the fluid above; this is the other half of
   * the interaction - a ring of scrambled glyphs that expands from the click
   * and dies out, leaving the field exactly as it found it.
   */
  waveEnabled: true,
  /**
   * How far the ring travels, as a fraction of the canvas diagonal.
   *
   * Past 1.0 because the click decides where the ring starts and a click near
   * a corner has the whole diagonal to cross before the far corner is covered
   * - at 0.6 such a ring died most of a screen short, finishing while a chunk
   * of the field had never been touched. Sized for the worst case so the wave
   * always runs off every edge, wherever it was born.
   */
  waveReach: 1.25,
  /**
   * Thickness of the lit band at birth, in canvas pixels. Wide - the ring is a
   * broad wall of churning glyphs rather than a thin outline, and a narrow
   * band reads as a ripple rather than a blast. The band grows as the ring
   * travels, so this is its width at the moment of the click.
   */
  waveWidth: 210,
  /** Share of crest cells that churn through random glyphs (0 = none, 1 = all). */
  waveScramble: 1.0,
  /**
   * Seconds from click to the ring finishing. Lower is a faster, snappier
   * blast; higher lets it drift out. Paired with waveReach - that sets how far
   * the ring goes, this sets how long it takes to get there, so raising one
   * without the other changes the speed it travels at.
   */
  waveDuration: 2,
  /**
   * How much brighter a glyph gets at the centre of the band (0 = no lift, the
   * ring shows only as scrambled characters; 1.35 = default).
   */
  waveGlow: 0,
  /**
   * Tint on the click ring. White + tint 0 leaves the current look (the band
   * only brightens); raise tint and pick a colour to paint the crest.
   */
  waveColor: "#ff6a00",
  waveTint: 3,
  brightness: 0,
  contrast: 0,
  saturation: -100,
  gamma: 1.0,

  /**
   * Input levels. cube.mp4 is high-key - 90% of its pixels sit between 0.74 and
   * 0.87 - so the band has to be stretched across 0..1 or every cell lands on
   * the same ramp step. Widen these for footage with real blacks.
   */
  levelsLow: 0.7,
  levelsHigh: 0.92,
  /**
   * Curve applied after levels. Also sets how sparse the output is: below 1 it
   * pushes more cells onto the blank ramp slots. 0.4 ≈ 40% empty, 0.35 ≈ 52%,
   * 1.0 ≈ 3% (every cell filled).
   */
  brightnessMap: 0.4,
  /**
   * Output levels - the slice of the post-curve tone the glyph ramp is spread
   * across. brightnessMap and the invert leave cube.mp4 sitting in roughly
   * 0.11..0.55, so without this window the ramp is only ever indexed over its
   * bottom third and one letter carries the frame. Widening it back to 0..1
   * restores the raw mapping for footage that already fills the range.
   */
  rampLow: 0.1125,
  rampHigh: 0.55,
  colorIntensity: 1.0,
  /** Flat glyph brightness. Tone is carried by glyph choice, not by color. */
  charBrightness: 0.85,
  /** How much cell luminance shades the glyph color on top of the ramp (0..1). */
  colorFromVideo: 0.25,
  /** Compensates the atlas mipmap thinning small glyphs out. */
  glyphGain: 1.5,
  /** Ordered-dither strength on the ramp index (0 = hard bands, 1 = full step). */
  dither: 0.6,
  invert: true,
  grain: false,
  grainIntensity: 37,
  grainSize: 0,
  grainSpeed: 0,
  /** Grain on empty cells (0 = pure black gaps, 1 = noise across the frame). */
  grainOnEmpty: 1.0,
};

/** Viewport the phone framing below takes over at - Tailwind's `md` edge. */
const MOBILE_QUERY = "(max-width: 1025px)";

/**
 * Phone framing. A portrait canvas is nowhere near the 16:9 clip's shape, so the
 * default stretch-to-fill drags the cube into vertical streaks, and the desktop
 * offset - which parks it right of the copy, where there is room - pushes most
 * of what is left off the edge. Fitting to cover keeps it square; pulling back
 * off that fit and lifting it puts the cube over the top of the screen and the
 * copy on clean background below, which is the desktop split turned upright.
 * The grid is sized in pixels rather than columns to match: 180 columns across a
 * phone is a ~2px cell, which reads as noise rather than as glyphs.
 */
export const CUBE_ASCII_MOBILE = {
  fitAspect: true,
  videoScale: 0.6,
  videoOffsetX: 0,
  videoOffsetY: -0.1,
  charCellPx: 6,
};

function hexToRgb(color) {
  if (color == null) return null;

  // Leva color pickers can return `{ r, g, b }` in 0–1 or 0–255.
  if (typeof color === "object") {
    const r = color.r ?? color.red;
    const g = color.g ?? color.green;
    const b = color.b ?? color.blue;
    if (r == null || g == null || b == null) return null;
    const scale = r > 1 || g > 1 || b > 1 ? 1 / 255 : 1;
    return [r * scale, g * scale, b * scale];
  }

  if (typeof color !== "string") return null;
  const raw = color.trim().replace("#", "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return [
      parseInt(raw[0] + raw[0], 16) / 255,
      parseInt(raw[1] + raw[1], 16) / 255,
      parseInt(raw[2] + raw[2], 16) / 255,
    ];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
}

/* ── fluid grid ── */
const FC = 80;
const FR = 60;
const FN = FC * FR;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Source samples per cell axis (grainrad's `samplesPerAxis`): 2, 3 or 4.
 * Costs SAMPLES² texture fetches per *pixel* here, where grainrad pays it once
 * per *cell* in a compute pass - keep this low.
 */
const SAMPLES = 2;

/**
 * Measures each glyph's ink coverage and returns the set sorted lightest-first,
 * so brightness → index mapping produces a smooth tonal ramp.
 */
function orderCharsByDensity(chars, cell, padding) {
  const probe = document.createElement("canvas");
  probe.width = cell;
  probe.height = cell;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  ctx.font = `${cell - padding * 2}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";

  return chars
    .map((char) => {
      ctx.clearRect(0, 0, cell, cell);
      ctx.fillText(char, cell / 2, cell / 2);
      const { data } = ctx.getImageData(0, 0, cell, cell);
      let ink = 0;
      for (let i = 3; i < data.length; i += 4) ink += data[i];
      return { char, ink };
    })
    .sort((a, b) => a.ink - b.ink)
    .map((entry) => entry.char);
}

const TL = 320;
const TS = 10;
const TM = 72;

/**
 * How many click waves can be in flight at once. Clicking again before a ring
 * has finished starts a second one alongside it rather than restarting the
 * first, so an impatient visitor gets overlapping rings instead of a stutter.
 * Past this the oldest ring is recycled - by then it is the faintest on screen.
 */
const WAVE_N = 4;
/**
 * Gap between the two rings a single click starts. Long enough that they
 * read as a double pulse rather than one thicker band; short enough that the
 * second still feels like part of the same tap.
 */
const WAVE_ECHO_DELAY = 300;
/**
 * The echo covers the same reach as the first ring but takes 10% longer,
 * so the second pulse trails instead of stacking as a thicker band.
 */
const WAVE_ECHO_LIFE = 1.2;
/**
 * Seconds a ring stays alive. Past this its slot frees up.
 *
 * Paired with waveReach below: the ring reaches the furthest corner of a
 * typical viewport at roughly the same moment the void starts filling back in
 * (~1.4s of this 1.8s). Stretching one without the other is what leaves the
 * screen sitting blank with the ring already gone - dead air, not an effect.
 */
const WAVE_LIFE = 1.8;

/* ── shaders ── */
const VS = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * The ramp length is a compile-time constant here (it sizes the brightness →
 * glyph index mapping), so picking a different glyph set relinks the program.
 */
const buildFS = (charCount) => `#version 300 es
precision highp float;

uniform sampler2D uVideo;
uniform sampler2D uFluid;
uniform sampler2D uAtlas;

uniform vec2 uRes;
uniform float uTime;
uniform float uCharColumns;
uniform float uCharZoom;
uniform float uCharGap;
uniform float uVideoScale;
uniform vec2 uVideoOffset;
uniform int uFitAspect;
uniform float uVideoAspect;

uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uGamma;
uniform float uBrightnessMap;
uniform float uColorIntensity;
uniform float uLevelsLow;
uniform float uLevelsHigh;
uniform float uRampLow;
uniform float uRampHigh;
uniform float uCharBrightness;
uniform float uColorFromVideo;
uniform float uGlyphGain;
uniform float uDither;
uniform int uInvert;

/** Entry reveal, 0 (nothing drawn) → 1 (full field). See INTRO_FEATHER. */
uniform float uIntro;

uniform int uGrain;
uniform float uGrainIntensity;
uniform float uGrainSize;
uniform float uGrainSpeed;
uniform float uGrainOnEmpty;

uniform int uTrailN;
uniform int uFluidEnabled;
uniform int uFluidColorEnabled;
uniform vec3 uFluidColor;
uniform float uFluidTint;
uniform float uFluidBoost;
uniform vec4 uTP[${TM}];
uniform float uTL[${TM}];

/**
 * Click waves. Each entry is one ring in flight: xy is the click point in
 * canvas pixels, z is its age in seconds. uWA is that ring's lifetime in
 * seconds (0 for a free slot), so the echo can run slower than the first
 * pulse without a second uniform.
 */
uniform vec3 uWP[${WAVE_N}];
uniform float uWA[${WAVE_N}];
uniform int uWaveN;
uniform float uWaveSpeed;
uniform float uWaveWidth;
uniform float uWaveScramble;
uniform float uWaveLife;
uniform float uWaveGlow;
uniform int uWaveColorEnabled;
uniform vec3 uWaveColor;
uniform float uWaveTint;

out vec4 O;

const float FC = ${FC}.0;
const float FR = ${FR}.0;
const int BAYER[16] = int[16](${BAYER.map((v) =>
  Math.round((v / 16) * 255)
).join(",")});
const int CHAR_N = ${charCount};
const int SAMPLES = ${SAMPLES};

/**
 * Entry. The field arrives on a front sweeping right → left, so the cube - which
 * the default framing parks right of the copy - resolves first and the empty
 * margin last.
 *
 * Width of that front as a fraction of the sweep. Cells inside the band are
 * mid-arrival; outside it they are fully on or fully off.
 */
const float INTRO_FEATHER = 0.45;
/**
 * How much of a cell's arrival within the band is decided by its Bayer value.
 * This is what makes cells scatter in as the same ordered-dither texture the
 * ramp already uses, rather than sweeping in on a clean ring.
 */
const float INTRO_DITHER = 0.55;
/** Glyph size at the moment a cell starts arriving; it grows to full from there. */
const float INTRO_SCALE = 0.5;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

/**
 * Canvas uv → source uv. Scales about the center and slides the result, so the
 * subject can be re-framed independently of the character grid. Clamping leans
 * on the texture's flat borders to fill whatever the clip no longer covers.
 */
vec2 rawFrameUv(vec2 uv) {
  vec2 scale = vec2(max(uVideoScale, 0.01));

  // Cover fit. Both axes are driven off whichever one would otherwise leave a
  // gap, so the clip still fills the canvas but keeps its proportions and the
  // overflow is cropped instead of squashed into frame. videoScale then reads as
  // a zoom on top of that fit; below 1 it pulls back off the edges.
  if (uFitAspect == 1) {
    float canvasAspect = uRes.x / max(uRes.y, 1.0);
    float ratio = uVideoAspect / max(canvasAspect, 0.001);
    scale *= vec2(max(ratio, 1.0), max(1.0 / ratio, 1.0));
  }

  return (uv - 0.5 - uVideoOffset) / scale + 0.5;
}

vec2 frameUv(vec2 uv) {
  return clamp(rawFrameUv(uv), 0.0, 1.0);
}

vec3 applyAdjustments(vec3 c) {
  // Saturation (-100 → fully grey)
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturation / 100.0, -1.0, 1.0);
  c = mix(vec3(lum), c, sat + 1.0);

  // Brightness (-100..100)
  c += uBrightness / 100.0;

  // Contrast
  float contrast = uContrast / 100.0;
  c = (c - 0.5) * (1.0 + contrast) + 0.5;

  // Gamma
  c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.001)));

  // Input levels - stretch the source's real range across 0..1. Without this a
  // high-key clip occupies a sliver of the ramp and every cell picks one glyph.
  c = clamp((c - uLevelsLow) / max(uLevelsHigh - uLevelsLow, 0.001), 0.0, 1.0);

  // Selection curve. A pow on an already-clamped 0..1 value, so unlike a
  // multiply it can never push tones out of range and clip against the invert.
  c = pow(c, vec3(max(uBrightnessMap, 0.001)));

  if (uInvert == 1) c = 1.0 - c;

  return clamp(c, 0.0, 1.0);
}

void main() {
  // Grain is computed up front so empty cells carry it too - noise is graded
  // across the whole frame, not only where a glyph lands.
  float grain = 0.0;
  if (uGrain == 1) {
    float gs = max(uGrainSize, 0.5);
    // Use slower time step so grain doesn't strobe
    vec2 gp = floor(gl_FragCoord.xy / gs) + floor(uTime * uGrainSpeed * 0.02);
    grain = (hash(gp) - 0.5) * (uGrainIntensity / 100.0) * 0.8;
  }

  // Background: black lifted only by the positive lobe of the grain
  vec4 bg = vec4(vec3(max(grain, 0.0) * uGrainOnEmpty), 1.0);

  float cw = uRes.x / uCharColumns;
  float rows = ceil(uRes.y / cw) + 1.0;

  float gx = floor(gl_FragCoord.x / cw);
  float gy = floor((uRes.y - gl_FragCoord.y) / cw);

  if (gx >= uCharColumns || gy >= rows) {
    O = bg;
    return;
  }

  vec2 cp = vec2(
    fract(gl_FragCoord.x / cw),
    fract((uRes.y - gl_FragCoord.y) / cw)
  );

  vec2 bp = vec2((gx + 0.5) * cw, (gy + 0.5) * cw);

  // The clip's own edge pixels fill whatever the framing no longer covers, which
  // reads as empty only where those edges are flat. Aspect fit overshoots top and
  // bottom, where they are not - that would streak the frame's first and last row
  // down the canvas - so cells off the source are dropped to background instead.
  if (uFitAspect == 1) {
    vec2 fuv = rawFrameUv(bp / uRes);
    if (fuv.x < 0.0 || fuv.x > 1.0 || fuv.y < 0.0 || fuv.y > 1.0) {
      O = bg;
      return;
    }
  }

  // Per-cell arrival - see INTRO_FEATHER. The axis runs 0 at the right edge to
  // 1 at the left, so the front crosses right → left; the Bayer offset
  // breaks that edge up, scattering cells in around it instead of switching
  // them on column by column.
  float cellIntro = 1.0;
  if (uIntro < 1.0) {
    float axis = 1.0 - bp.x / uRes.x;
    float front = uIntro * (1.0 + INTRO_FEATHER) - axis;

    float introThr = float(BAYER[(int(gy) & 3) * 4 + (int(gx) & 3)]) / 255.0;
    cellIntro = clamp(
      (front / INTRO_FEATHER - introThr * INTRO_DITHER) / (1.0 - INTRO_DITHER),
      0.0,
      1.0
    );

    if (cellIntro <= 0.0) {
      O = bg;
      return;
    }
  }

  ivec2 fc = ivec2(gx / uCharColumns * FC, gy / rows * FR);
  fc = clamp(fc, ivec2(0), ivec2(int(FC) - 1, int(FR) - 1));

  vec2 flow = vec2(0.0);
  vec2 disp = vec2(0.0);

  if (uFluidEnabled == 1) {
    flow = texelFetch(uFluid, fc, 0).rg;

    for (int i = 0; i < uTrailN; i++) {
      float life = uTL[i];
      if (life <= 0.0) continue;

      vec2 d = bp - uTP[i].xy;
      float dist = length(d);
      float r = 5.0 + life * 3.0;
      if (dist == 0.0 || dist > r) continue;

      float f = pow(1.0 - dist / r, 2.0);
      disp += (d / dist) * f * life * 3.0 + uTP[i].zw * f * 0.04;
    }
  }

  // Average a SAMPLES×SAMPLES grid across the cell so the glyph reflects the
  // whole cell's tone, not a single texel at its center.
  vec2 base = bp + disp + flow * 6.0;
  float invS = 1.0 / float(SAMPLES);
  float lum = 0.0;

  for (int sy = 0; sy < SAMPLES; sy++) {
    for (int sx = 0; sx < SAMPLES; sx++) {
      vec2 off = (vec2(float(sx) + 0.5, float(sy) + 0.5) * invS - 0.5) * cw;
      vec2 uv = frameUv((base + off) / uRes);
      vec3 vc = applyAdjustments(texture(uVideo, uv).rgb);
      lum += dot(vc, vec3(0.299, 0.587, 0.114));
    }
  }

  lum *= invS * invS;

  // Output levels - the slice of the adjusted tone the glyph ramp spans.
  //
  // Input levels stretch the *source* across 0..1, but brightnessMap then curves
  // that range and the invert flips the curved result back down, so what finally
  // reaches the ramp occupies a band near the bottom (roughly 0.1..0.55 for
  // cube.mp4) rather than all of 0..1. Indexing the ramp with that directly
  // spends the whole glyph set on its first two or three slots - half the inked
  // cells land on one glyph and the heavy end of the set never draws at all.
  // Re-normalising here separates *which* slot a cell gets from *how many* cells
  // are blank, so brightnessMap keeps owning sparseness on its own.
  float toned = clamp(
    (lum - uRampLow) / max(uRampHigh - uRampLow, 0.001),
    0.0,
    1.0
  );

  // Fluid flow inverts local tone, so trails shift the ramp instead of popping
  // glyphs in. Mirroring in this normalised space rather than in the raw tone
  // keeps the trails spread over the ramp too.
  float hm = min(1.0, length(flow) * 1.1);
  float gray = mix(toned, 1.0 - toned, hm);

  // ── Click wave ──
  //
  // Each ring is a band centred on a radius that grows with its age. "ring" is
  // how deep this cell sits inside that band - 0 outside it, 1 on the crest -
  // and it is the wave's only output: the band lights cells up and scrambles
  // them, and everything outside it is left exactly as the video drew it. The
  // ring is symmetric about the crest, so its inner and outer edges fall off
  // identically and the field is untouched on both sides of it.
  float ring = 0.0;

  for (int i = 0; i < uWaveN; i++) {
    float age = uWP[i].z;
    float life = uWA[i];
    if (life <= 0.0) continue;

    // Ring radius in pixels. Only slightly eased - a strong ease-out spends
    // most of the ring's life almost stationary at the far edge, which is what
    // made the first pass feel like it was over before it started. Close to
    // linear keeps it travelling at a readable speed the whole way.
    float t = clamp(age / max(life, 0.05), 0.0, 1.0);
    float radius = uWaveSpeed * (1.0 - pow(1.0 - t, 1.25));

    // The crest holds full strength almost the whole way out and lets go only
    // at the very end, so the ring stays solid across the screen rather than
    // washing out halfway through its travel.
    float fade = 1.0 - smoothstep(0.85, 1.0, t);
    float dist = length(bp - uWP[i].xy);

    // Band around the crest. Widening with age keeps the ring's *screen* width
    // roughly constant as it stretches around an ever-longer circumference.
    float w = uWaveWidth * (1.0 + t * 1.5);
    ring = max(ring, (1.0 - smoothstep(0.0, w, abs(dist - radius))) * fade);
  }

  // The crest lifts cells up the ramp, but only partway and only for the ones
  // that were already going to be inked. Pushing the whole band to the top of
  // the ramp fills it into a solid slab - the ring has to stay a scatter of
  // individual bright glyphs on background, which is what reads as text
  // churning rather than as a white shape passing over.
  gray = mix(gray, min(1.0, gray * 1.35 + 0.28), ring);

  // Ordered-dither nudge (±half a ramp step) breaks banding between levels
  float thr = float(BAYER[(int(gy) & 3) * 4 + (int(gx) & 3)]) / 255.0;
  float dithered = gray + (thr - 0.5) * uDither / float(CHAR_N);

  // Brightness → ramp index. Low slots may be blank; see CHAR_SETS.
  int ci = int(clamp(dithered, 0.0, 0.9999) * float(CHAR_N));

  // On the crest, swap the tone-derived glyph for a random one off the ramp.
  // This is what makes a passing ring read as *data*, not as the same picture
  // brightened: the cells stop spelling out the video and churn. Re-rolled on
  // a coarse time step so a cell flickers through a few glyphs while the band
  // covers it, rather than holding one character all the way past.
  //
  // Cells fall into the scramble by lottery rather than all at once, so the
  // band's inner and outer edges fray into the untouched field instead of
  // ending on a clean circle.
  float scrambleOdds = ring * clamp(uWaveScramble, 0.0, 1.0);
  if (hash(vec2(gx, gy) * 1.37) < scrambleOdds) {
    float roll = hash(vec2(gx, gy) + floor(uTime * 18.0) * 37.7);
    // Bias the roll high so scrambled cells land on inked slots - the blank
    // ones at the bottom of the ramp would punch holes in the crest.
    ci = int(clamp(mix(0.35, 1.0, roll), 0.0, 0.9999) * float(CHAR_N));
  }

  // Glyphs grow into their cell as they arrive - the mirror of the loader's
  // glyphs shrinking as they leave, and what makes each one read as arriving
  // rather than just brightening.
  float zoom = max(uCharZoom, 0.01) * (1.0 - clamp(uCharGap, 0.0, 0.95))
    * mix(INTRO_SCALE, 1.0, cellIntro);
  vec2 zcp = (cp - 0.5) / max(zoom, 0.01) + 0.5;
  if (zcp.x < 0.0 || zcp.x > 1.0 || zcp.y < 0.0 || zcp.y > 1.0) {
    O = bg;
    return;
  }

  float au = (float(ci) + zcp.x) / float(CHAR_N);
  // Mipmapping the 256px atlas cell down to ~13px thins glyphs out, and col*ca
  // then dims every character; gain it back so strokes read solid.
  float ca = clamp(texture(uAtlas, vec2(au, zcp.y)).a * uGlyphGain, 0.0, 1.0);
  // Also the path taken by blank ramp slots, whose atlas column has no ink
  if (ca < 0.05) {
    O = bg;
    return;
  }

  // Tone is already carried by *which* glyph was picked. Shading the color by
  // lum as well would darken exactly the cells that got the lightest glyph,
  // double-attenuating them into invisibility - so keep color near-flat.
  float shade = mix(1.0, lum, clamp(uColorFromVideo, 0.0, 1.0));
  vec3 col = vec3(uCharBrightness * shade) * uColorIntensity;

  // The wave only ever touches colour, never which glyph a cell was given.
  //
  // This is the whole contract: the field is decided by the video and nothing
  // the wave does can remove it. It only ever brightens, and only inside the
  // band - so the clip is never dimmed, cut, or hidden anywhere on the canvas.
  col *= 1.0 + ring * uWaveGlow;

  // Optional wave tint (off when uWaveColorEnabled == 0 or tint is 0).
  // The ring still only ever brightens by default; colour is a leva overlay
  // on the crest, same coverage idea as the fluid trail.
  if (uWaveColorEnabled == 1) {
    float t = clamp(uWaveTint, 0.0, 3.0);
    float waveMix = ring * clamp(t / 2.0, 0.0, 1.0);
    col = mix(col, uWaveColor, waveMix);
  }

  // Optional fluid letter tint (off when uFluidColorEnabled == 0).
  //
  // uFluidTint  - how easily flow paints orange (coverage / sensitivity)
  // uFluidBoost - how hot that orange reads (1 = hex as-is, >1 neon lift)
  if (uFluidColorEnabled == 1) {
    float t = clamp(uFluidTint, 0.0, 3.0);
    float b = clamp(uFluidBoost, 0.0, 3.0);

    // Higher tint → weak flow still colours glyphs; lower → only strong trails.
    float mixEnd = mix(0.42, 0.07, clamp(t / 2.0, 0.0, 1.0));
    float fluidMix = smoothstep(0.001, max(mixEnd, 0.02), hm);
    fluidMix = clamp(fluidMix * (0.25 + t * 0.75), 0.0, 1.0);

    // Boost slides toward a hotter orange and adds a bit of emissive lift so
    // values above 1 keep doing something even when R is already maxed.
    vec3 hot = vec3(1.0, 0.42, 0.0);
    vec3 fluidCol = mix(uFluidColor, hot, clamp((b - 1.0) * 0.65, 0.0, 1.0));
    fluidCol *= mix(0.75, 1.2, clamp(b / 2.0, 0.0, 1.0));
    fluidCol = clamp(fluidCol, 0.0, 1.0);

    col = mix(col, fluidCol, fluidMix);
    col += fluidCol * fluidMix * max(b - 1.0, 0.0) * 0.45;
  }

  // Film grain - color only, never character selection
  col += grain;

  col = clamp(col, 0.0, 1.0);
  O = vec4(col * ca * cellIntro, 1.0);
}
`;

/* ── helpers ── */
function mkShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(error || "Shader compile failed");
  }

  return shader;
}

function mkProg(gl, charCount) {
  const program = gl.createProgram();
  gl.attachShader(program, mkShader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(program, mkShader(gl, gl.FRAGMENT_SHADER, buildFS(charCount)));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(error || "Program link failed");
  }

  return program;
}

function mkTex(gl, unit) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createFluid() {
  const vx = new Float32Array(FN);
  const vy = new Float32Array(FN);
  const vx0 = new Float32Array(FN);
  const vy0 = new Float32Array(FN);
  const p = new Float32Array(FN);
  const div = new Float32Array(FN);

  const fi = (x, y) =>
    Math.max(0, Math.min(FR - 1, y)) * FC + Math.max(0, Math.min(FC - 1, x));

  const bnd = (b, a) => {
    for (let x = 1; x < FC - 1; x += 1) {
      a[fi(x, 0)] = b === 2 ? -a[fi(x, 1)] : a[fi(x, 1)];
      a[fi(x, FR - 1)] = b === 2 ? -a[fi(x, FR - 2)] : a[fi(x, FR - 2)];
    }
    for (let y = 1; y < FR - 1; y += 1) {
      a[fi(0, y)] = b === 1 ? -a[fi(1, y)] : a[fi(1, y)];
      a[fi(FC - 1, y)] = b === 1 ? -a[fi(FC - 2, y)] : a[fi(FC - 2, y)];
    }
  };

  const diffuse = (b, d, s, diff, dt) => {
    const a = dt * diff * FN;
    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < FR - 1; y += 1) {
        for (let x = 1; x < FC - 1; x += 1) {
          d[fi(x, y)] =
            (s[fi(x, y)] +
              a *
              (d[fi(x - 1, y)] +
                d[fi(x + 1, y)] +
                d[fi(x, y - 1)] +
                d[fi(x, y + 1)])) /
            (1 + 4 * a);
        }
      }
      bnd(b, d);
    }
  };

  const advect = (b, d, d0, ux, uy, dt) => {
    const dtx = dt * FC * 1.4;
    const dty = dt * FR * 1.4;

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        const px = Math.max(0.5, Math.min(FC - 1.5, x - dtx * ux[fi(x, y)]));
        const py = Math.max(0.5, Math.min(FR - 1.5, y - dty * uy[fi(x, y)]));
        const x0 = Math.floor(px);
        const y0 = Math.floor(py);
        const s1 = px - x0;
        const s0 = 1 - s1;
        const t1 = py - y0;
        const t0 = 1 - t1;

        d[fi(x, y)] =
          s0 * (t0 * d0[fi(x0, y0)] + t1 * d0[fi(x0, y0 + 1)]) +
          s1 * (t0 * d0[fi(x0 + 1, y0)] + t1 * d0[fi(x0 + 1, y0 + 1)]);
      }
    }
    bnd(b, d);
  };

  const project = (ux, uy) => {
    const hx = 1 / FC;
    const hy = 1 / FR;

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        div[fi(x, y)] =
          -0.5 *
          (hx * (ux[fi(x + 1, y)] - ux[fi(x - 1, y)]) +
            hy * (uy[fi(x, y + 1)] - uy[fi(x, y - 1)]));
        p[fi(x, y)] = 0;
      }
    }

    bnd(0, div);
    bnd(0, p);

    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < FR - 1; y += 1) {
        for (let x = 1; x < FC - 1; x += 1) {
          p[fi(x, y)] =
            (div[fi(x, y)] +
              p[fi(x - 1, y)] +
              p[fi(x + 1, y)] +
              p[fi(x, y - 1)] +
              p[fi(x, y + 1)]) /
            4;
        }
      }
      bnd(0, p);
    }

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        ux[fi(x, y)] -= (0.5 * (p[fi(x + 1, y)] - p[fi(x - 1, y)])) / hx;
        uy[fi(x, y)] -= (0.5 * (p[fi(x, y + 1)] - p[fi(x, y - 1)])) / hy;
      }
    }

    bnd(1, ux);
    bnd(2, uy);
  };

  return {
    vx,
    vy,
    fi,
    step() {
      diffuse(1, vx0, vx, 0.00002, 0.016);
      diffuse(2, vy0, vy, 0.00002, 0.016);
      project(vx0, vy0);
      advect(1, vx, vx0, vx0, vy0, 0.016);
      advect(2, vy, vy0, vx0, vy0, 0.016);
      project(vx, vy);
      for (let i = 0; i < FN; i += 1) {
        vx[i] *= 0.94;
        vy[i] *= 0.94;
      }
    },
  };
}

function createSuspendedRaf({ onFrame, root = null }) {
  let rafId = null;
  let running = false;
  let destroyed = false;
  let tabVisible = typeof document === "undefined" ? true : !document.hidden;
  let onscreen = true;
  let observer = null;

  const isActive = () => {
    if (destroyed) return false;
    if (!tabVisible) return false;
    if (root && !onscreen) return false;
    return true;
  };

  const stopRaf = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (time) => {
    rafId = null;
    if (destroyed || !running || !isActive()) return;
    onFrame(time);
    if (!destroyed && running && isActive()) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const sync = () => {
    if (destroyed) return;
    if (running && isActive()) {
      if (rafId == null) rafId = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
  };

  const onVisibilityChange = () => {
    tabVisible = !document.hidden;
    sync();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  if (root && typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onscreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "256px", threshold: 0 },
    );
    observer.observe(root);
  }

  return {
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      stopRaf();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

/**
 * The canvas itself. Takes a fully-resolved config and reads it through a ref
 * every frame, so a control change never tears down the GL context.
 *
 * Bump SHADER_REV when fragment uniforms/source change so Fast Refresh remounts
 * the GL program (otherwise new uniform locations stay null until a hard reload).
 */
const SHADER_REV = 9;

function CubeAsciiCanvas({ config, intro, src, className }) {
  const [skipGPU, setSkipGPU] = useState(true);
  const ref = useRef(null);
  const configRef = useRef(config);

  // Held behind a ref of its own so the render loop can read whatever `intro`
  // currently is without the prop being a GL-setup dependency - it is mutated
  // from outside (by GSAP) many times a second, and rebuilding the context for
  // that would be absurd. Absent, the field just draws fully.
  const introRef = useRef(intro);

  useLayoutEffect(() => {
    // GPU capability detection reads WebGL context / renderer info that only
    // exists client-side - can't be a lazy useState initializer without
    // risking a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkipGPU(shouldSkipRealtimeGPU());
  }, []);

  // The one config value the render loop cannot pick up from the ref: it sizes
  // the shader's ramp and the atlas, so changing it re-runs the GL setup below.
  const charSetName = config.charSet ?? DEFAULT_CHAR_SET;

  // The render loop reads configRef each frame; keeping it current is all that
  // is needed for new values to take effect - no GL teardown involved. The ref
  // is seeded with the first config, so the loop never reads a stale one.
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    introRef.current = intro;
  }, [intro]);

  useEffect(() => {
    if (skipGPU) return undefined;

    const canvas = ref.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
    });
    if (!gl) return undefined;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.src = src;
    video.load();
    video.play().catch(() => { });

    const chars = resolveCharSet(charSetName);

    let program;
    try {
      program = mkProg(gl, chars.length);
    } catch (error) {
      console.error(error);
      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    gl.useProgram(program);
    const loc = (name) => gl.getUniformLocation(program, name);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const videoTex = mkTex(gl, 0);
    const fluidTex = mkTex(gl, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const CELL = 256;
    const PADDING = 32;
    // Atlas columns are laid out lightest → heaviest, so the shader's brightness
    // index doubles as the atlas column with no extra lookup.
    const rampChars = orderCharsByDensity(chars, CELL, PADDING);
    const atlasCanvas = document.createElement("canvas");
    atlasCanvas.width = CELL * rampChars.length;
    atlasCanvas.height = CELL;
    const atlasContext = atlasCanvas.getContext("2d");
    atlasContext.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
    atlasContext.font = `${CELL - PADDING * 2}px monospace`;
    atlasContext.textAlign = "center";
    atlasContext.textBaseline = "middle";
    atlasContext.fillStyle = "#fff";
    rampChars.forEach((char, index) => {
      atlasContext.fillText(char, CELL * index + CELL / 2, CELL / 2);
    });

    const atlasTex = mkTex(gl, 2);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlasCanvas,
    );
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(loc("uVideo"), 0);
    gl.uniform1i(loc("uFluid"), 1);
    gl.uniform1i(loc("uAtlas"), 2);

    const uBrightness = loc("uBrightness");
    const uContrast = loc("uContrast");
    const uSaturation = loc("uSaturation");
    const uGamma = loc("uGamma");
    const uBrightnessMap = loc("uBrightnessMap");
    const uColorIntensity = loc("uColorIntensity");
    const uLevelsLow = loc("uLevelsLow");
    const uLevelsHigh = loc("uLevelsHigh");
    const uRampLow = loc("uRampLow");
    const uRampHigh = loc("uRampHigh");
    const uCharBrightness = loc("uCharBrightness");
    const uColorFromVideo = loc("uColorFromVideo");
    const uGlyphGain = loc("uGlyphGain");
    const uDither = loc("uDither");
    const uInvert = loc("uInvert");
    const uIntro = loc("uIntro");
    const uGrain = loc("uGrain");
    const uGrainIntensity = loc("uGrainIntensity");
    const uGrainSize = loc("uGrainSize");
    const uGrainSpeed = loc("uGrainSpeed");
    const uGrainOnEmpty = loc("uGrainOnEmpty");
    const uCharZoom = loc("uCharZoom");
    const uCharGap = loc("uCharGap");
    const uVideoScale = loc("uVideoScale");
    const uVideoOffset = loc("uVideoOffset");
    const uFitAspect = loc("uFitAspect");
    const uVideoAspect = loc("uVideoAspect");
    const uCharColumnsLoc = loc("uCharColumns");
    const uFluidEnabled = loc("uFluidEnabled");
    const uFluidColorEnabled = loc("uFluidColorEnabled");
    const uFluidColor = loc("uFluidColor");
    const uFluidTint = loc("uFluidTint");
    const uFluidBoost = loc("uFluidBoost");

    const fluid = createFluid();
    const fluidData = new Float32Array(FN * 2);

    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    const trail = [];
    const now = () => performance.now();
    const isMobile = () => window.matchMedia("(max-width: 1025px)").matches;

    const onMove = (event) => {
      if (isMobile()) return;

      // Measured against the canvas, not the viewport - as a component this can
      // sit anywhere on the page, and viewport coords would offset the trail.
      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const previousX = mouse.x;
      const previousY = mouse.y;
      mouse.vx = localX - previousX;
      mouse.vy = localY - previousY;
      mouse.x = localX;
      mouse.y = localY;

      if (previousX < 0 || previousY < 0) {
        trail.unshift({ x: mouse.x, y: mouse.y, vx: 0, vy: 0, b: now() });
        return;
      }

      const distance = Math.hypot(mouse.vx, mouse.vy);
      if (distance < 0.5) return;

      const steps = Math.max(1, Math.ceil(distance / TS));
      const birth = now();

      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        trail.unshift({
          x: previousX + mouse.vx * t,
          y: previousY + mouse.vy * t,
          vx: mouse.vx / steps,
          vy: mouse.vy / steps,
          b: birth,
        });
        if (trail.length > TM) trail.length = TM;
      }
    };

    window.addEventListener("mousemove", onMove);

    // Rings in flight. Fixed-length so the uniform arrays never resize; a slot
    // with `born` null is free.
    const waves = Array.from({ length: WAVE_N }, () => ({
      x: 0,
      y: 0,
      born: null,
      lifeScale: 1,
    }));

    const spawnWave = (localX, localY, lifeScale = 1) => {
      // Free slot if there is one, otherwise the oldest ring - by then it is
      // the faintest thing on screen, so recycling it is invisible.
      let slot = waves.findIndex((wave) => wave.born === null);
      if (slot === -1) {
        slot = waves.reduce(
          (oldest, wave, i) =>
            wave.born < waves[oldest].born ? i : oldest,
          0,
        );
      }

      waves[slot].x = localX;
      waves[slot].y = localY;
      waves[slot].born = now();
      waves[slot].lifeScale = lifeScale;
    };

    const echoTimers = [];

    const onClick = (event) => {
      if (isMobile()) return;
      if (configRef.current.waveEnabled === false) return;
      // A ring sweeping the whole viewport is a large, unprompted motion -
      // exactly what the preference is asking us not to do. Read live rather
      // than captured at mount so toggling it in the OS takes effect without
      // a remount; the ambient field keeps drawing either way.
      if (prefersReducedMotion()) return;

      const rect = canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      // Clicks landing on the copy and buttons stacked over the canvas still
      // belong to the page, but the ring is background dressing and reads fine
      // under them - what it must not do is fire for a click somewhere else on
      // the page entirely, hence the bounds test.
      if (
        localX < 0 ||
        localY < 0 ||
        localX > rect.width ||
        localY > rect.height
      ) {
        return;
      }

      spawnWave(localX, localY);
      const echo = window.setTimeout(() => {
        const i = echoTimers.indexOf(echo);
        if (i !== -1) echoTimers.splice(i, 1);
        spawnWave(localX, localY, WAVE_ECHO_LIFE);
      }, WAVE_ECHO_DELAY);
      echoTimers.push(echo);
    };

    window.addEventListener("pointerdown", onClick);

    let width = 0;
    let height = 0;

    // Sized from the element rather than the window, so the component is not
    // required to be fullscreen.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = canvas.width = Math.max(1, Math.round(rect.width));
      height = canvas.height = Math.max(1, Math.round(rect.height));
      gl.viewport(0, 0, width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
    }

    gl.disable(gl.BLEND);

    const uTP = loc("uTP");
    const uTLoc = loc("uTL");
    const uRes = loc("uRes");
    const uTrailN = loc("uTrailN");
    const uTime = loc("uTime");

    const uWP = loc("uWP");
    const uWA = loc("uWA");
    const uWaveN = loc("uWaveN");
    const uWaveSpeed = loc("uWaveSpeed");
    const uWaveWidth = loc("uWaveWidth");
    const uWaveScramble = loc("uWaveScramble");
    const uWaveLife = loc("uWaveLife");
    const uWaveGlow = loc("uWaveGlow");
    const uWaveColorEnabled = loc("uWaveColorEnabled");
    const uWaveColor = loc("uWaveColor");
    const uWaveTint = loc("uWaveTint");

    const tpBuf = new Float32Array(TM * 4);
    const tlBuf = new Float32Array(TM);
    const wpBuf = new Float32Array(WAVE_N * 3);
    const waBuf = new Float32Array(WAVE_N);
    const start = performance.now();

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: () => {
        if (video.readyState < 2) return;

        const timestamp = now();
        const fluidOn = configRef.current.fluidEnabled !== false;

        if (fluidOn) {
          const cfg = configRef.current;
          const fb = cfg.fluidForceBase ?? 0.08;
          const fss = cfg.fluidSpeedSat ?? 18;
          const ffm = cfg.fluidForceMultiplier ?? 0.15;
          const fir = cfg.fluidInnerRadius ?? 0.8;
          const firl = cfg.fluidRadiusLife ?? 1.0;

          for (let i = trail.length - 1; i >= 0; i -= 1) {
            const point = trail[i];
            const age = timestamp - point.b;

            if (age >= TL) {
              trail.splice(i, 1);
              continue;
            }

            const life = 1 - age / TL;
            const radius = fir + life * firl;
            const gridRadius = Math.ceil(radius);
            const speed = Math.hypot(point.vx, point.vy);
            const force = (fb + Math.min(speed, fss) / fss) * life;
            const cx = ((point.x / width) * FC) | 0;
            const cy = ((point.y / height) * FR) | 0;

            for (let dy = -gridRadius; dy <= gridRadius; dy += 1) {
              for (let dx = -gridRadius; dx <= gridRadius; dx += 1) {
                const dist = Math.hypot(dx, dy);
                if (dist > radius) continue;
                const f = (1 - dist / radius) ** 2;
                const fluidIndex = fluid.fi(cx + dx, cy + dy);
                fluid.vx[fluidIndex] += point.vx * f * force * ffm;
                fluid.vy[fluidIndex] += point.vy * f * force * ffm;
              }
            }
          }

          fluid.step();
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );

        for (let i = 0; i < FN; i += 1) {
          fluidData[i * 2] = fluid.vx[i];
          fluidData[i * 2 + 1] = fluid.vy[i];
        }

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fluidTex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RG32F,
          FC,
          FR,
          0,
          gl.RG,
          gl.FLOAT,
          fluidData,
        );

        tpBuf.fill(0);
        tlBuf.fill(0);

        for (let i = 0; i < trail.length; i += 1) {
          const point = trail[i];
          tpBuf[i * 4] = point.x;
          tpBuf[i * 4 + 1] = point.y;
          tpBuf[i * 4 + 2] = point.vx;
          tpBuf[i * 4 + 3] = point.vy;
          tlBuf[i] = 1 - (timestamp - point.b) / TL;
        }

        const cfg = configRef.current;

        // Age each ring and retire the ones past their life. The shader reads
        // age in seconds and derives radius from it, so nothing here has to
        // track position - a ring is just a point and a clock.
        //
        // The same duration is sent to the shader below, so a ring's slot is
        // freed on exactly the frame its radius finishes growing. Reading it
        // once here keeps the two in step: were they to disagree, rings would
        // either wink out mid-travel or linger invisibly holding a slot.
        const waveLife = Math.max(0.05, cfg.waveDuration ?? WAVE_LIFE);

        wpBuf.fill(0);
        waBuf.fill(0);

        for (let i = 0; i < WAVE_N; i += 1) {
          const wave = waves[i];
          if (wave.born === null) continue;

          const life = waveLife * (wave.lifeScale ?? 1);
          const age = (timestamp - wave.born) / 1000;
          if (age >= life) {
            wave.born = null;
            continue;
          }

          wpBuf[i * 3] = wave.x;
          wpBuf[i * 3 + 1] = wave.y;
          wpBuf[i * 3 + 2] = age;
          waBuf[i] = life;
        }

        gl.uniform3fv(uWP, wpBuf);
        gl.uniform1fv(uWA, waBuf);
        gl.uniform1i(uWaveN, cfg.waveEnabled === false ? 0 : WAVE_N);
        // Reach is a fraction of the diagonal so a ring clears the canvas in
        // the same time whatever its shape or size.
        gl.uniform1f(
          uWaveSpeed,
          Math.hypot(width, height) * (cfg.waveReach ?? 1.25),
        );
        gl.uniform1f(uWaveWidth, cfg.waveWidth ?? 210);
        gl.uniform1f(uWaveScramble, cfg.waveScramble ?? 1.0);
        gl.uniform1f(uWaveLife, waveLife);
        gl.uniform1f(uWaveGlow, cfg.waveGlow ?? 1.35);

        const waveRgb = hexToRgb(cfg.waveColor);
        gl.uniform1i(uWaveColorEnabled, waveRgb ? 1 : 0);
        if (waveRgb) {
          gl.uniform3f(uWaveColor, waveRgb[0], waveRgb[1], waveRgb[2]);
        }
        gl.uniform1f(uWaveTint, cfg.waveTint ?? 0);

        gl.uniform4fv(uTP, tpBuf);
        gl.uniform1fv(uTLoc, tlBuf);
        gl.uniform1i(uTrailN, trail.length);
        gl.uniform2f(uRes, width, height);
        gl.uniform1f(uTime, (timestamp - start) / 1000);

        gl.uniform1f(
          uCharColumnsLoc,
          cfg.charCellPx
            ? Math.max(8, Math.round(width / cfg.charCellPx))
            : cfg.charColumns ?? 120,
        );
        gl.uniform1f(uCharZoom, cfg.charZoom ?? 0.85);
        gl.uniform1f(uCharGap, cfg.charGap ?? 0);
        gl.uniform1f(uVideoScale, cfg.videoScale ?? 1);
        gl.uniform2f(
          uVideoOffset,
          cfg.videoOffsetX ?? 0,
          cfg.videoOffsetY ?? 0,
        );
        gl.uniform1i(uFitAspect, cfg.fitAspect ? 1 : 0);
        // Read off the decoded frame rather than assumed - readyState >= 2 above
        // means the dimensions are known by now.
        gl.uniform1f(
          uVideoAspect,
          video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 16 / 9,
        );
        gl.uniform1f(uBrightness, cfg.brightness ?? 0);
        gl.uniform1f(uContrast, cfg.contrast ?? 0);
        gl.uniform1f(uSaturation, cfg.saturation ?? -100);
        gl.uniform1f(uGamma, cfg.gamma ?? 1.0);
        gl.uniform1f(uBrightnessMap, cfg.brightnessMap ?? 0.4);
        gl.uniform1f(uColorIntensity, cfg.colorIntensity ?? 1.0);
        gl.uniform1f(uLevelsLow, cfg.levelsLow ?? 0.7);
        gl.uniform1f(uLevelsHigh, cfg.levelsHigh ?? 0.92);
        gl.uniform1f(uRampLow, cfg.rampLow ?? 0.1125);
        gl.uniform1f(uRampHigh, cfg.rampHigh ?? 0.55);
        gl.uniform1f(uCharBrightness, cfg.charBrightness ?? 0.85);
        gl.uniform1f(uColorFromVideo, cfg.colorFromVideo ?? 0.25);
        gl.uniform1f(uGlyphGain, cfg.glyphGain ?? 1.5);
        gl.uniform1f(uDither, cfg.dither ?? 0.6);
        gl.uniform1i(uInvert, cfg.invert ? 1 : 0);
        gl.uniform1f(uIntro, introRef.current?.current ?? 1);
        gl.uniform1i(uGrain, cfg.grain ? 1 : 0);
        gl.uniform1i(uFluidEnabled, cfg.fluidEnabled !== false ? 1 : 0);

        const fluidRgb = hexToRgb(cfg.fluidColor);
        gl.uniform1i(uFluidColorEnabled, fluidRgb ? 1 : 0);
        if (fluidRgb) {
          gl.uniform3f(uFluidColor, fluidRgb[0], fluidRgb[1], fluidRgb[2]);
        }
        gl.uniform1f(uFluidTint, cfg.fluidTint ?? 1.2);
        gl.uniform1f(uFluidBoost, cfg.fluidBoost ?? 1.35);

        gl.uniform1f(uGrainIntensity, cfg.grainIntensity ?? 37);
        gl.uniform1f(uGrainSize, cfg.grainSize ?? 2);
        gl.uniform1f(uGrainSpeed, cfg.grainSpeed ?? 50);
        gl.uniform1f(uGrainOnEmpty, cfg.grainOnEmpty ?? 1.0);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    });

    loop.start();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerdown", onClick);
      echoTimers.forEach((id) => window.clearTimeout(id));
      echoTimers.length = 0;
      if (resizeObserver) resizeObserver.disconnect();
      loop.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
      gl.deleteTexture(videoTex);
      gl.deleteTexture(fluidTex);
      gl.deleteTexture(atlasTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [src, charSetName, skipGPU]);

  if (skipGPU) {
    return <div className={className} aria-hidden />;
  }

  return <canvas ref={ref} className={className} />;
}

/*
 * Loaded on demand so leva stays out of the production bundle - it is only
 * pulled in for the branch that actually renders the panel. It reports values
 * upward rather than wrapping the canvas, which keeps the two modules from
 * importing each other.
 */
const CubeAsciiControls = dynamic(() => import("./with-leva"), { ssr: false });

/**
 * Starts false so the server render and the first client render agree; the
 * effect corrects it before paint, and a config swap costs nothing - the loop
 * reads it per frame and never rebuilds the GL context.
 */
function useMatchMedia(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);

    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/**
 * Fluid-reactive ASCII rendering of a looping video, for use as a background.
 *
 * Pass `debug` to mount a leva panel bound to this effect's config. The panel
 * drives only these controls - anything else on the page is untouched.
 *
 * @param {{ current: number }} [intro] - a mutable holder (a React ref works)
 *   read every frame, 0 (nothing drawn) → 1 (full field). Animate it to play
 *   the entry reveal; leave it off and the field simply draws.
 */
export default function CubeBackgroundAscii({
  config,
  debug = false,
  intro,
  src = VIDEO_SRC,
  className = "absolute inset-0 block h-full w-full bg-black",
}) {
  const isMobile = useMatchMedia(MOBILE_QUERY);

  const base = useMemo(
    () => ({ ...CUBE_ASCII_DEFAULTS, ...config }),
    [config],
  );

  // Whatever the panel last reported. Null until leva has mounted, and unused
  // entirely when debug is off, so the plain path renders straight from props.
  const [tweaked, setTweaked] = useState(null);
  const tuned = debug && tweaked ? tweaked : base;

  // Phone framing is applied last, over the panel too: leva seeds its sliders
  // from the base once on mount and would otherwise report the desktop framing
  // back on every viewport.
  const active = useMemo(
    () => (isMobile ? { ...tuned, ...CUBE_ASCII_MOBILE } : tuned),
    [tuned, isMobile],
  );

  return (
    <>
      {debug ? <CubeAsciiControls base={base} onChange={setTweaked} /> : null}
      <CubeAsciiCanvas
        config={active}
        intro={intro}
        src={src}
        className={className}
      />
    </>
  );
}
