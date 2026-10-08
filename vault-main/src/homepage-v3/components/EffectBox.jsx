"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { prefersReducedMotion } from "@/lib/motion";
import { shouldSkipRealtimeGPU } from "@/lib/audit";
import { resolveCharSet } from "./char-sets";
import { createFluid } from "./ascii-fluid";

const ArrowUpRight = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full h-full ${className}`}
    aria-hidden
  >
    <path
      d="M8 16L16 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 8H16V14.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/*
 * Constants lifted from the hero (CubeBackgroundAscii) so the trail behaves the
 * same here: same point lifetime and spacing, same fluid forces, same dither
 * and tint. The glyph ramp is the card's own (see TRAIL_CHAR_SET), and the
 * fluid grid differs only because it is sized in pixels rather than in cells -
 * see FLUID_CELL.
 */
/** Key into CHAR_SETS. The hero spells HYPERIUX; the cards draw their trail in
 *  symbols instead, so a card's stroke never reads as stray brand lettering. */
const TRAIL_CHAR_SET = "symbols";

const TRAIL_LIFE = 320;
const TRAIL_STEP = 10;
const TRAIL_MAX = 72;

/** Hero glyph density: 180 columns across the viewport. Matching the *pixel*
 *  size, not the column count, keeps glyphs the same size inside a card. */
const CHAR_COLUMNS = 180;
const CHAR_ZOOM = 1.25;
const DITHER = 0.6;

/** The hero's 80×60 grid works out to roughly this many pixels a cell on a
 *  desktop viewport, and a fluid cell's pixel size is what sets the width of
 *  the stroke - so the card matches cell size and derives its own counts. */
const FLUID_CELL = 18;
const FLUID_MIN = 8;
const FLUID_MAX = 64;

/* Hero fluid tuning (CUBE_ASCII_DEFAULTS). */
const FORCE_BASE = 0.08;
const SPEED_SAT = 18;
const FORCE_MULTIPLIER = 0.15;
const INNER_RADIUS = 0.2;
const RADIUS_LIFE = 1.0;

/** Hero's 4×4 ordered dither, nudging the ramp index by up to half a step. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Flat white, so the trail reads at full contrast against the card's media
 *  once mix-blend-difference inverts whatever is underneath it. The hero's
 *  flow-driven tint toward fluidColor is deliberately not carried over - a
 *  single colour is what keeps the stroke legible over arbitrary artwork. */
const GLYPH_RGB = [255, 255, 255];

/**
 * Measures each glyph's ink coverage and returns the set sorted lightest-first,
 * so brightness → index mapping produces a smooth tonal ramp. Without this the
 * ramp picks glyphs in whatever order they were written down and the trail
 * reads as noise instead of shading.
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

/**
 * The hero's ASCII trail, over the card's media instead of the cube clip.
 *
 * The hero draws a full ASCII field and lets the fluid invert its tone, so the
 * trail is a disturbance in glyphs that are already there. There is no field to
 * disturb here, so the same ramp runs against a black source: cells with no
 * flow land on the ramp's blank slots and draw nothing, and the stroke is
 * whatever the fluid lifts above them. Everything downstream of that - glyph
 * choice, dither, tint - is the hero's, which is what makes the two match.
 */
function DitherTrailCanvas({ blend = "mix-blend-difference" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion() || shouldSkipRealtimeGPU()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ramp order is measured once, off a probe big enough to compare inks; the
    // atlas below is redrawn at whatever the current cell size is.
    const ramp = orderCharsByDensity(resolveCharSet(TRAIL_CHAR_SET), 64, 8);
    const charCount = ramp.length;
    const firstInked = ramp.findIndex((char) => char.trim() !== "");

    const atlasCanvas = document.createElement("canvas");
    const atlasCtx = atlasCanvas.getContext("2d");

    let atlasCell = 0;
    let cellSize = 0;
    let width = 0;
    let height = 0;
    let fluid = null;

    /** Drawn 1:1 into the grid, so glyph strokes stay crisp at these sizes
     *  rather than being smoothed away by a downscale. */
    function buildAtlas() {
      atlasCell = Math.max(6, Math.round(cellSize * CHAR_ZOOM));
      atlasCanvas.width = atlasCell * charCount;
      atlasCanvas.height = atlasCell;
      if (!atlasCtx) return;

      atlasCtx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
      atlasCtx.font = `${Math.round(atlasCell * 0.75)}px monospace`;
      atlasCtx.textAlign = "center";
      atlasCtx.textBaseline = "middle";
      atlasCtx.fillStyle = `rgb(${GLYPH_RGB[0]}, ${GLYPH_RGB[1]}, ${GLYPH_RGB[2]})`;

      ramp.forEach((char, index) => {
        atlasCtx.fillText(char, atlasCell * (index + 0.5), atlasCell * 0.5);
      });
    }

    function resize() {
      const rect = parent.getBoundingClientRect();
      width = canvas.width = Math.max(1, Math.floor(rect.width));
      height = canvas.height = Math.max(1, Math.floor(rect.height));

      const nextCell = Math.max(6, window.innerWidth / CHAR_COLUMNS);
      if (nextCell !== cellSize) {
        cellSize = nextCell;
        buildAtlas();
      }

      const cols = Math.min(
        FLUID_MAX,
        Math.max(FLUID_MIN, Math.round(width / FLUID_CELL)),
      );
      const rows = Math.min(
        FLUID_MAX,
        Math.max(FLUID_MIN, Math.round(height / FLUID_CELL)),
      );
      if (!fluid || fluid.cols !== cols || fluid.rows !== rows) {
        fluid = createFluid(cols, rows);
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const trail = [];
    const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    let animationFrameId = null;
    let running = false;

    // Same guard as the hero: the trail is a cursor effect, so a touch drag
    // should not drag a stroke around behind the finger.
    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;

    function handlePointerMove(event) {
      if (isMobile()) return;

      const rect = parent.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;

      const previousX = mouse.x;
      const previousY = mouse.y;
      mouse.vx = localX - previousX;
      mouse.vy = localY - previousY;
      mouse.x = localX;
      mouse.y = localY;

      const birth = performance.now();

      if (previousX < 0 || previousY < 0) {
        trail.unshift({ x: mouse.x, y: mouse.y, vx: 0, vy: 0, b: birth });
        start();
        return;
      }

      const distance = Math.hypot(mouse.vx, mouse.vy);
      if (distance < 0.5) return;

      // Points are spaced along the segment so a fast flick lays a continuous
      // stroke instead of a dotted line.
      const steps = Math.max(1, Math.ceil(distance / TRAIL_STEP));

      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        trail.unshift({
          x: previousX + mouse.vx * t,
          y: previousY + mouse.vy * t,
          vx: mouse.vx / steps,
          vy: mouse.vy / steps,
          b: birth,
        });
        if (trail.length > TRAIL_MAX) trail.length = TRAIL_MAX;
      }

      start();
    }

    function handlePointerLeave() {
      // Only the cursor's position is forgotten - the fluid keeps running so
      // the stroke settles instead of vanishing at the card's edge.
      mouse.x = -9999;
      mouse.y = -9999;
    }

    parent.addEventListener("pointermove", handlePointerMove);
    parent.addEventListener("pointerleave", handlePointerLeave);

    function render() {
      animationFrameId = null;
      if (!fluid) return;

      const timestamp = performance.now();

      for (let i = trail.length - 1; i >= 0; i -= 1) {
        const point = trail[i];
        const age = timestamp - point.b;

        if (age >= TRAIL_LIFE) {
          trail.splice(i, 1);
          continue;
        }

        const life = 1 - age / TRAIL_LIFE;
        const radius = INNER_RADIUS + life * RADIUS_LIFE;
        const gridRadius = Math.ceil(radius);
        const speed = Math.hypot(point.vx, point.vy);
        const force = (FORCE_BASE + Math.min(speed, SPEED_SAT) / SPEED_SAT) * life;
        const cx = ((point.x / width) * fluid.cols) | 0;
        const cy = ((point.y / height) * fluid.rows) | 0;

        for (let dy = -gridRadius; dy <= gridRadius; dy += 1) {
          for (let dx = -gridRadius; dx <= gridRadius; dx += 1) {
            const dist = Math.hypot(dx, dy);
            if (dist > radius) continue;
            const f = (1 - dist / radius) ** 2;
            const fluidIndex = fluid.fi(cx + dx, cy + dy);
            fluid.vx[fluidIndex] += point.vx * f * force * FORCE_MULTIPLIER;
            fluid.vy[fluidIndex] += point.vy * f * force * FORCE_MULTIPLIER;
          }
        }
      }

      fluid.step();

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / cellSize);
      const rows = Math.ceil(height / cellSize);
      const offset = (atlasCell - cellSize) / 2;
      let peak = 0;

      for (let row = 0; row < rows; row += 1) {
        const fy = Math.min(
          fluid.rows - 1,
          ((row / rows) * fluid.rows) | 0,
        );

        for (let col = 0; col < cols; col += 1) {
          const fx = Math.min(
            fluid.cols - 1,
            ((col / cols) * fluid.cols) | 0,
          );
          const fluidIndex = fy * fluid.cols + fx;

          // The hero's `hm`: how strongly the fluid is moving through this
          // cell. Here it only picks the glyph - the colour no longer varies.
          const flow = Math.hypot(fluid.vx[fluidIndex], fluid.vy[fluidIndex]);
          const hm = Math.min(1, flow * 1.1);
          if (hm > peak) peak = hm;
          if (hm <= 0) continue;

          const threshold = BAYER[(row & 3) * 4 + (col & 3)] / 16;
          const dithered = hm + (threshold - 0.5) * (DITHER / charCount);
          const charIndex = Math.min(
            charCount - 1,
            Math.max(0, (Math.min(dithered, 0.9999) * charCount) | 0),
          );
          // Blank ramp slots are what thins the stroke out at its edges.
          if (charIndex < firstInked) continue;

          ctx.drawImage(
            atlasCanvas,
            charIndex * atlasCell,
            0,
            atlasCell,
            atlasCell,
            col * cellSize - offset,
            row * cellSize - offset,
            atlasCell,
            atlasCell,
          );
        }
      }

      // The fluid damps out a beat after the last point expires, and a cell
      // needs roughly a fifth of the ramp before it inks at all - so once the
      // peak drops this far there is nothing left to draw and the loop parks,
      // keeping idle cards off the frame budget.
      if (trail.length === 0 && peak < 0.05) {
        running = false;
        ctx.clearRect(0, 0, width, height);
        return;
      }

      animationFrameId = requestAnimationFrame(render);
    }

    function start() {
      if (running) return;
      running = true;
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (animationFrameId != null) cancelAnimationFrame(animationFrameId);
      running = false;
      ro.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 z-20 h-full w-full ${blend}`}
    />
  );
}

const MEDIA_SIZES =
  "(max-width: 768px) 92vw, (max-width: 1025px) 44vw, 26vw";

export default function EffectBox({
  title,
  tag,
  href = "#",
  media,
  video = false,
  poster,
  action = "View Effect",
  aspect = "aspect-[3/2]",
  className = "",
  mediaClassName = "",
  priority = false,
  enableDitherTrail = true,
  ditherBlend = "mix-blend-difference",
}) {
  const videoRef = useRef(null);
  const hoveredRef = useRef(false);
  const unloadTimerRef = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoSrc = video ? media : null;
  const coverSrc = video ? poster : media;
  const showVideo = Boolean(videoSrc && hovered && videoReady);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !videoSrc || !hovered) return;

    if (node.getAttribute("src") !== videoSrc) {
      node.src = videoSrc;
      node.load();
    }
    node.play().catch(() => {});
  }, [hovered, videoSrc]);

  useEffect(
    () => () => window.clearTimeout(unloadTimerRef.current),
    [],
  );

  const playOnHover = () => {
    if (!videoSrc) return;
    hoveredRef.current = true;
    window.clearTimeout(unloadTimerRef.current);
    setHovered(true);
  };

  const stopOnLeave = () => {
    hoveredRef.current = false;
    setHovered(false);
    // Freeze the last frame for the fade; ripping `src` out here is what
    // flashed a blank canvas under the poster.
    videoRef.current?.pause();
    unloadTimerRef.current = window.setTimeout(() => {
      const node = videoRef.current;
      if (!node || hoveredRef.current) return;
      node.removeAttribute("src");
      node.load();
    }, 700);
  };

  const mark =
    "pointer-events-none absolute size-[0.3vw] border-grey transition-all duration-300 group-hover:border-primary max-lg:size-1.5 max-md:size-2 max-sm:size-1.5";

  return (
    <Link
      prefetch={false}
      href={href}
      aria-label={`${title}${tag ? ` - ${tag}` : ""}`}
      className={`group block w-full cursor-pointer text-white ${className}`}
      onMouseEnter={playOnHover}
      onMouseLeave={stopOnLeave}
    >
      <div
        className={`relative isolate w-full overflow-hidden bg-[#0e0e0e] ${aspect} ${mediaClassName}`}
      >
        <div className="absolute inset-0 origin-center will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={title}
              fill
              sizes={MEDIA_SIZES}
              priority={priority}
              className={`object-cover transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showVideo ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <span className="absolute inset-0 bg-[linear-gradient(135deg,#1a1a1a,#0e0e0e)]" />
          )}

          {videoSrc ? (
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="none"
              onLoadedData={() => setVideoReady(true)}
              onEmptied={() => setVideoReady(false)}
              onError={() => setVideoReady(false)}
              className={`pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                showVideo ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : null}
        </div>

        {enableDitherTrail ? <DitherTrailCanvas blend={ditherBlend} /> : null}

        {tag ? (
          <span className="absolute left-[0.7vw] top-[0.7vw] z-30 bg-[#404040] px-[0.55vw] py-[0.45vw] font-mono text-[0.72vw] leading-none tracking-wide text-white backdrop-blur-sm max-lg:left-[1.2vw] max-lg:top-[1.2vw] max-lg:px-[1vw] max-lg:py-[0.8vw] max-lg:text-[1.3vw] max-md:left-2 max-md:top-2 max-md:px-3 max-md:py-1.5 max-md:text-[1.5vw] max-sm:text-[2.6vw]">
            {tag}
          </span>
        ) : null}
      </div>

      <div className="relative flex items-end justify-between gap-[1vw] max-lg:gap-[2vw] max-lg:px-[1.5vw] max-lg:py-[1.5vw] max-lg:mt-[2vw] max-md:px-[3vw] max-md:py-[2vw] py-[1vw] px-[1vw] max-md:mt-[3vw] mt-[1vw]">
        <span className={`${mark} -top-px -left-px border-t border-l`} />
        <span className={`${mark} -top-px -right-px border-t border-r`} />
        <span className={`${mark} -bottom-px -left-px border-b border-l`} />
        <span className={`${mark} -bottom-px -right-px border-b border-r`} />

        <p className="text22 font-avenir leading-none text-white max-md:text-[2.4vw] max-sm:text-[4vw]">
          {title}
        </p>

        <span className="flex items-center gap-[0.35vw] text18 leading-none text-light-grey transition-colors duration-500 max-lg:gap-[0.8vw] max-lg:text-[1.5vw] max-md:text-foreground! group-hover:text-white motion-reduce:transition-none max-md:gap-1 max-md:text-[1.7vw] max-sm:text-[3vw]">
          {action}
          {/* Two arrows on a diagonal rail: the resting one leaves through the
              top-right as its replacement arrives from the bottom-left. */}
          <span className="relative inline-block overflow-hidden max-lg:size-[2.5vw] max-md:size-[5vw] size-[1.8vw]">
            <ArrowUpRight className="transition-transform duration-500 ease-out motion-safe:group-hover:translate-x-full motion-safe:group-hover:-translate-y-full motion-reduce:transition-none" />
            <ArrowUpRight className="absolute inset-0 -translate-x-full translate-y-full transition-transform duration-500 ease-out motion-safe:group-hover:translate-x-0 motion-safe:group-hover:translate-y-0 motion-reduce:transition-none" />
          </span>
        </span>
      </div>
    </Link>
  );
}
