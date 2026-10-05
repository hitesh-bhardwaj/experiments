'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { shouldSkipRealtimeGPU } from '@/lib/audit';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Bayer 8x8 ordered-dither matrix - drives the orange pixel edge only. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
];

function hashNoise(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Stable per-cell threshold for the orange dissolve edge.
 * Deterministic + evenly spread so the pixel front thins as a density ramp
 * instead of blotching or boiling frame-to-frame.
 */
function cellThreshold(x, y) {
  const ordered = (BAYER[(y & 7) * 8 + (x & 7)] + 0.5) / 64;

  return ordered * 0.75 + hashNoise(x, y) * 0.25;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep01(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * The single text node the paragraph renders, or null if the element holds
 * anything more complex. Measurement only makes sense against one flat run.
 */
function singleTextNode(element) {
  const node = element.firstChild;

  if (!node || node.nodeType !== Node.TEXT_NODE || node.nextSibling) {
    return null;
  }

  return node;
}

/**
 * Reads the paragraph's real glyph positions back out of the browser.
 *
 * A Range over one code point reports exactly where that glyph landed, so the
 * wrap, alignment, kerning and letter-spacing are whatever the paragraph
 * actually did. Nothing here re-wraps the text, which is what keeps the
 * painted copy aligned with the selectable text sitting underneath it.
 *
 * Boxes come back in reading order, rebased onto the wrapper's top-left
 * corner. Whitespace is skipped: every glyph is painted at its own origin, so
 * spaces carry nothing the canvas needs.
 */
function measureGlyphs(node, text, originX, originY) {
  const range = document.createRange();
  const glyphs = [];

  for (let i = 0; i < text.length; i++) {
    if (!text[i].trim()) continue;

    range.setStart(node, i);
    range.setEnd(node, i + 1);

    const rect = range.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) continue;

    glyphs.push({
      character: text[i],
      x: rect.left - originX,
      top: rect.top - originY,
      width: rect.width,
      height: rect.height,
    });
  }

  range.detach?.();

  return glyphs;
}

/**
 * Scroll-driven text fill: each character floods along an axis.
 *
 * Soft ordered-dither density (Bayer dissolve): solid behind the crest,
 * thinning scatter into dim ahead of it. `primaryColor` is the dithered fill;
 * `textColor` settles in smoothly behind. `direction` picks the axis -
 * `"up"` (bottom→top) or `"right"` (left→right, reading order still line by line).
 */
export default function TextFillPixelV3({
  text = "Design systems should feel effortless, not like you're fighting your own components every time you build.",
  textColor = '#ffffff',
  primaryColor = '#ff5f00',
  dimColor = '#272727',
  className = 'text64',
  wrapperClassName = 'w-[95%] sm:w-[88%] md:w-[90%]',
  containerClassName = '',
  id = 'text-fill-pixel-v3',
  start = '20% 80%',
  end = '85% 45%',
  pixelSize = 3,
  stagger = 12,
  /** Soft dither ramp as a fraction of the glyph along `direction`. */
  bandFraction = 0.65,
  /** How early textColor eases in behind the dither (0–1). */
  settleBlend = 0.45,
  /** Fill axis: `"up"` = bottom→top, `"right"` = left→right. */
  direction = 'up',
  as: Tag = 'p',
}) {
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);
  const textRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    let frame = null;
    let disposed = false;
    let scrollTrigger = null;
    let progress = 0;
    let layout = null;

    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    const textElement = textRef.current;

    const makeLayer = (width, height) => {
      const layer = document.createElement('canvas');

      layer.width = Math.max(1, Math.ceil(width));
      layer.height = Math.max(1, Math.ceil(height));

      return layer;
    };

    /** Rebuilds the wrap, the per-character boxes and the tinted layers. */
    const build = () => {
      if (!canvas || !wrapper || !textElement) return;

      const rect = wrapper.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width < 1 || height < 1) {
        layout = null;
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const styles = window.getComputedStyle(textElement);
      const fontSize = parseFloat(styles.fontSize) || 16;
      const font = `${styles.fontStyle} ${styles.fontWeight} ${fontSize}px ${styles.fontFamily}`;
      const letterSpacing = styles.letterSpacing;
      const hasLetterSpacing = letterSpacing && letterSpacing !== 'normal';

      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = font;

      if (hasLetterSpacing && 'letterSpacing' in ctx) {
        ctx.letterSpacing = letterSpacing;
      }

      const textNode = singleTextNode(textElement);

      if (!textNode) {
        layout = null;
        return;
      }

      const metrics = ctx.measureText('Hg');
      const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8;
      const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2;

      // Everything below comes from the live paragraph, rebased onto the
      // wrapper box the canvas is stretched over. No second wrap pass exists,
      // so the pixels cannot drift away from the selectable text.
      const measured = measureGlyphs(textNode, text, rect.left, rect.top);

      if (!measured.length) {
        layout = null;
        return;
      }

      // A Range rect spans the whole line box; the glyphs sit centered inside
      // it, so the baseline is the box center plus half the ink height.
      const baselineIn = (top, boxHeight) =>
        top + boxHeight / 2 + (ascent - descent) / 2;

      // Draw list and animation boxes share one pass over the measured glyphs.
      //
      // Each glyph is stamped at its own measured origin rather than letting
      // fillText advance through a whole line: canvas shaping and DOM shaping
      // can disagree by a fraction of a pixel per character, which compounds
      // into visible drift by the end of a long line. Per-glyph placement pins
      // the painted copy to the DOM positions exactly.
      const glyphs = [];
      const chars = [];

      for (const box of measured) {
        const baseline = baselineIn(box.top, box.height);

        glyphs.push({ character: box.character, x: box.x, baseline });

        // Tighten to the font's ink band. The Range rect covers the full
        // line-height, which would otherwise make the fill crawl through the
        // empty leading above and below the letter.
        const top = baseline - ascent - 1;
        const bottom = baseline + descent + 1;

        chars.push({
          x: box.x,
          width: box.width,
          top,
          bottom,
          height: bottom - top,
        });
      }

      const paint = (target, color) => {
        const tctx = target.getContext('2d');

        tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        tctx.clearRect(0, 0, width, height);
        tctx.font = font;
        tctx.textBaseline = 'alphabetic';
        tctx.fillStyle = color;

        if (hasLetterSpacing && 'letterSpacing' in tctx) {
          tctx.letterSpacing = letterSpacing;
        }

        for (const { character, x, baseline } of glyphs) {
          tctx.fillText(character, x, baseline);
        }
      };

      const crispDim = makeLayer(width * dpr, height * dpr);
      const crispFill = makeLayer(width * dpr, height * dpr);
      const crispAccent = makeLayer(width * dpr, height * dpr);
      const scratch = makeLayer(width * dpr, height * dpr);
      const mask = makeLayer(width * dpr, height * dpr);

      paint(crispDim, dimColor);
      paint(crispFill, textColor);
      paint(crispAccent, primaryColor);

      layout = {
        width,
        height,
        dpr,
        chars,
        crispDim,
        crispFill,
        crispAccent,
        scratch,
        mask,
      };
    };

    const draw = () => {
      frame = null;

      if (!layout || !canvas) return;

      const { width, height, dpr, chars } = layout;
      const ctx = canvas.getContext('2d');

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(layout.crispDim, 0, 0, width, height);

      const total = chars.length;

      if (!total) return;

      // Head runs past the last index by one stagger window so the final
      // character still gets a full fill instead of snapping at progress 1.
      const head = progress * (total + stagger);
      // Soft band must span enough cell rows/cols or the dither collapses to a line.
      const soft = Math.max(0.35, bandFraction);
      const settle = clamp01(settleBlend);
      const horizontal = direction === 'right';

      const dissolve = new Path2D();
      let hasDissolve = false;
      let hasWhite = false;

      const maskCanvas = layout.mask;
      const mctx = maskCanvas.getContext('2d');

      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.clearRect(0, 0, width, height);
      mctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < total; i++) {
        const local = (head - i) / stagger;

        if (local <= 0) continue;

        const char = chars[i];
        const axisSize = horizontal ? char.width : char.height;
        const invAxis = axisSize > 0 ? 1 / axisSize : 0;
        const right = char.x + char.width;

        // Primary crest (can run past 1 so the soft edge clears the far side).
        const front = Math.min(local, 1 + soft * 0.5);

        // White lags the dither, eases in smoothly, then clears past the glyph
        // so the letter finishes fully textColor.
        const whiteDelay = clamp01(0.22 + (1 - settle) * 0.28);
        const whiteT = smoothstep01(
          (local - whiteDelay) / Math.max(0.28, 1 - whiteDelay)
        );
        const fadePx = Math.max(axisSize * 0.42, soft * axisSize * 0.75);

        if (whiteT >= 0.999) {
          mctx.fillStyle = '#fff';
          mctx.fillRect(char.x, char.top, char.width, char.height);
          hasWhite = true;
        } else if (whiteT > 0.001) {
          if (horizontal) {
            // Crest travels left → right; fade clears past the right edge.
            const crestX =
              char.x + whiteT * (char.width + fadePx * 0.95);
            const gradLeft = crestX - fadePx;
            const gradRight = crestX + fadePx * 0.2;
            const grad = mctx.createLinearGradient(gradLeft, 0, gradRight, 0);

            grad.addColorStop(0, 'rgba(255,255,255,1)');
            grad.addColorStop(0.65, 'rgba(255,255,255,0.4)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');

            mctx.fillStyle = grad;
            mctx.fillRect(char.x, char.top, char.width, char.height);
          } else {
            const crestY =
              char.bottom - whiteT * (char.height + fadePx * 0.95);
            const gradTop = crestY - fadePx * 0.2;
            const gradBottom = crestY + fadePx;
            const grad = mctx.createLinearGradient(0, gradTop, 0, gradBottom);

            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.35, 'rgba(255,255,255,0.4)');
            grad.addColorStop(1, 'rgba(255,255,255,1)');

            mctx.fillStyle = grad;
            mctx.fillRect(
              char.x,
              Math.max(char.top, gradTop),
              char.width,
              char.bottom - Math.max(char.top, gradTop)
            );
          }
          hasWhite = true;
        }

        const firstRow = Math.floor(char.top / pixelSize);
        const lastRow = Math.ceil(char.bottom / pixelSize);
        const firstCol = Math.floor(char.x / pixelSize);
        const lastCol = Math.ceil(right / pixelSize);

        for (let row = firstRow; row < lastRow; row++) {
          const y = row * pixelSize;
          const cy = y + pixelSize * 0.5;
          const top = Math.max(y, char.top);
          const cellHeight = Math.min(y + pixelSize, char.bottom) - top;

          if (cellHeight <= 0) continue;

          for (let col = firstCol; col < lastCol; col++) {
            const x = Math.max(col * pixelSize, char.x);
            const cellWidth = Math.min((col + 1) * pixelSize, right) - x;

            if (cellWidth <= 0) continue;

            const cx = x + cellWidth * 0.5;
            // 0 at the start of the fill axis, 1 at the far side.
            const fromStart = horizontal
              ? (cx - char.x) * invAxis
              : (char.bottom - cy) * invAxis;
            const coverage = clamp01((front + soft * 0.5 - fromStart) / soft);

            if (coverage <= 0.001) continue;
            if (coverage <= cellThreshold(col, row)) continue;

            dissolve.rect(x, top, cellWidth, cellHeight);
            hasDissolve = true;
          }
        }
      }

      const stampMasked = (source, maskSource) => {
        const sctx = layout.scratch.getContext('2d');

        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sctx.globalCompositeOperation = 'source-over';
        sctx.clearRect(0, 0, width, height);
        sctx.drawImage(source, 0, 0, width, height);
        sctx.globalCompositeOperation = 'destination-in';
        sctx.drawImage(maskSource, 0, 0, width, height);
        sctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(layout.scratch, 0, 0, width, height);
      };

      const stampPath = (source, path) => {
        const sctx = layout.scratch.getContext('2d');

        sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sctx.globalCompositeOperation = 'source-over';
        sctx.clearRect(0, 0, width, height);
        sctx.drawImage(source, 0, 0, width, height);
        sctx.globalCompositeOperation = 'destination-in';
        sctx.fill(path);
        sctx.globalCompositeOperation = 'source-over';

        ctx.drawImage(layout.scratch, 0, 0, width, height);
      };

      // Soft primary dither first; white eases over it with a long feather.
      if (hasDissolve) stampPath(layout.crispAccent, dissolve);
      if (hasWhite) stampMasked(layout.crispFill, maskCanvas);
    };

    const schedule = () => {
      if (frame !== null || disposed) return;
      frame = requestAnimationFrame(draw);
    };

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const init = () => {
      if (disposed) return;

      build();

      if (prefersReducedMotion || shouldSkipRealtimeGPU()) {
        progress = 1;
        draw();
        return;
      }

      scrollTrigger = ScrollTrigger.create({
        trigger: sectionRef.current,
        start,
        end,
        onUpdate: (self) => {
          progress = self.progress;
          schedule();
        },
        onRefresh: (self) => {
          progress = self.progress;
          schedule();
        },
      });

      schedule();
    };

    // Measuring before the webfont resolves would wrap against the fallback
    // metrics and bake the wrong line breaks into every layer.
    if (document.fonts?.ready) {
      document.fonts.ready.then(init);
    } else {
      init();
    }

    const observer = new ResizeObserver(() => {
      build();
      schedule();
    });

    if (wrapper) observer.observe(wrapper);

    return () => {
      disposed = true;
      observer.disconnect();
      scrollTrigger?.kill();

      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [
    bandFraction,
    className,
    dimColor,
    direction,
    end,
    pixelSize,
    primaryColor,
    settleBlend,
    stagger,
    start,
    text,
    textColor,
    wrapperClassName,
  ]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative w-full overflow-x-hidden ${containerClassName}`}
    >
      <div
        ref={wrapperRef}
        className={`relative z-10 mx-auto text-center ${wrapperClassName}`}
      >
        <Tag ref={textRef} className={`text-transparent ${className}`}>
          {text}
        </Tag>

        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      </div>
    </section>
  );
}
