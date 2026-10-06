"use client";

import { TransitionRouter } from "next-transition-router";
import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";

const DURATION_LEAVE = 0.6;
const DURATION_ENTER = 0.4;
const COLOR = "#111111";

function generatePixelOrder(cols, rows, seed = 42) {
  const total = cols * rows;
  const indices = Array.from({ length: total }, (_, i) => i);

  let s = seed;

  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutQuart(t) {
  return 1 - --t * t * t * t;
}

const getCols = () => {
  if (window.innerWidth < 640) return 12;
  if (window.innerWidth < 1025) return 24;
  return 30;
};

const getRows = () => {
  if (window.innerWidth < 640) return 22;

  if (window.innerWidth < 1025) {
    const cols = getCols();
    return Math.round(window.innerHeight / (window.innerWidth / cols));
  }

  return 20;
};

export default function PixelRandomTransition({
  children,
  color = COLOR,
  durationLeave = DURATION_LEAVE,
  durationEnter = DURATION_ENTER,
}) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const tweenRef = useRef(null);
  const stateRef = useRef({ progress: 0 });
  const pixelOrderRef = useRef(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cols = getCols();
    const rows = getRows();

    pixelOrderRef.current = generatePixelOrder(cols, rows);
  }, []);

  const drawPixels = useCallback(
    (canvas, progress, isEnter) => {
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cols = getCols();
      const rows = getRows();
      const total = cols * rows;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;

      /**
       * Hard states.
       * These prevent the transition from stopping at 90–95% coverage.
       */
      if (!isEnter && progress >= 0.999) {
        ctx.fillRect(0, 0, w, h);
        return;
      }

      if (isEnter && progress <= 0.001) {
        ctx.fillRect(0, 0, w, h);
        return;
      }

      if (
        !pixelOrderRef.current ||
        pixelOrderRef.current.length !== total
      ) {
        pixelOrderRef.current = generatePixelOrder(cols, rows);
      }

      const order = pixelOrderRef.current;

      const cellW = w / cols;
      const cellH = h / rows;

      for (let i = 0; i < total; i++) {
        const idx = order[i];
        const c = idx % cols;
        const r = Math.floor(idx / cols);

        const normalizedPos = total <= 1 ? 0 : i / (total - 1);
        const posHash = ((c * 7 + r * 13) % 23) / 23;

        /**
         * Important:
         * staggerStart + staggerWindow must never exceed 1.
         * This guarantees every pixel reaches full opacity at progress 1.
         */
        const staggerWindow = 0.12;
        const staggerStart =
          normalizedPos * (1 - staggerWindow) + posHash * 0.015;
        const safeStaggerStart = Math.min(staggerStart, 1 - staggerWindow);
        const staggerEnd = safeStaggerStart + staggerWindow;

        let local =
          (progress - safeStaggerStart) / (staggerEnd - safeStaggerStart);

        local = Math.max(0, Math.min(1, local));

        const easedLocal = isEnter ? easeOutQuart(local) : easeInOutQuad(local);
        const opacity = isEnter ? 1 - easedLocal : easedLocal;

        if (opacity < 0.01) continue;

        const x1 = Math.floor(c * cellW);
        const x2 = Math.ceil((c + 1) * cellW);
        const y1 = Math.floor(r * cellH);
        const y2 = Math.ceil((r + 1) * cellH);

        ctx.globalAlpha = opacity;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      }

      ctx.globalAlpha = 1;
    },
    [color]
  );

  const animatePixels = useCallback(
    ({ from, to, duration, isEnter, onComplete }) => {
      const canvas = canvasRef.current;

      if (!canvas) {
        onComplete?.();
        return null;
      }

      canvas.style.opacity = "1";
      stateRef.current.progress = from;

      drawPixels(canvas, from, isEnter);

      tweenRef.current?.kill();

      const tween = gsap.to(stateRef.current, {
        progress: to,
        duration,
        ease: "none",
        onUpdate: () => {
          drawPixels(canvas, stateRef.current.progress, isEnter);
        },
        onComplete: () => {
          stateRef.current.progress = to;
          drawPixels(canvas, to, isEnter);

          if (isEnter) {
            canvas.style.opacity = "0";
          } else {
            canvas.style.opacity = "1";
          }

          onComplete?.();
        },
      });

      tweenRef.current = tween;

      return tween;
    },
    [drawPixels]
  );

  useEffect(() => {
    resizeCanvas();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      tweenRef.current?.kill();
    };
  }, [resizeCanvas]);

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        const timeline = gsap.timeline({ onComplete: next });

        timeline.fromTo(
          wrapperRef.current,
          {
            opacity: 1,
            y: 0,
          },
          {
            opacity: 0,
            duration: durationLeave,
            y: -50,
            ease: "power2.inOut",
          },
          0
        );

        const tween = animatePixels({
          from: 0,
          to: 1,
          duration: durationLeave,
          isEnter: false,
          onComplete: () => {},
        });

        return () => {
          timeline.kill();
          tween?.kill();
        };
      }}
      enter={(next) => {
        const timeline = gsap.timeline({ onComplete: next });

        timeline.fromTo(
          wrapperRef.current,
          {
            opacity: 0,
            y: 50,
          },
          {
            opacity: 1,
            duration: durationEnter,
            delay: durationLeave,
            y: 0,
            ease: "power2.out",
            clearProps: "all",
          },
          0
        );

        const tween = animatePixels({
          from: 0,
          to: 1,
          duration: durationEnter,
          isEnter: true,
          onComplete: () => {},
        });

        return () => {
          timeline.kill();
          tween?.kill();
        };
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed left-0 top-0 z-999 h-screen w-screen opacity-0"
      />

      <div className="relative z-2 h-full w-full">
        <div ref={wrapperRef} className="h-full w-full">
          {children}
        </div>
      </div>
    </TransitionRouter>
  );
}