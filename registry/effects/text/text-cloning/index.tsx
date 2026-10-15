// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import React, { useEffect, useRef, useState } from "react";

const DEFAULT_ROOT_MARGIN = "256px";

type RafRoot = Element | null | { current: Element | null } | (() => Element | null);

function resolveElement(root: RafRoot): Element | null {
  if (!root) return null;
  if (typeof root === "function") return root() ?? null;
  if (typeof root === "object" && "current" in root) return root.current ?? null;
  return root;
}

interface VisibilityGateOptions {
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
  onChange?: (active: boolean) => void;
}

interface VisibilityGate {
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

function createVisibilityGate({
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
  onChange,
}: VisibilityGateOptions = {}): VisibilityGate {
  let tabVisible =
    typeof document === "undefined" ? true : !document.hidden;
  // Match border-beam: assume onscreen until the observer reports otherwise.
  let onscreen = true;
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  const isActive = () => {
    if (destroyed) return false;
    if (observeTab && !tabVisible) return false;
    if (observeOffscreen && resolveElement(root) && !onscreen) return false;
    return true;
  };

  let lastActive = isActive();

  const emit = () => {
    if (destroyed) return;
    const next = isActive();
    if (next === lastActive) return;
    lastActive = next;
    onChange?.(next);
  };

  const onVisibilityChange = () => {
    tabVisible = !document.hidden;
    emit();
  };

  if (observeTab && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const bindObserver = () => {
    if (!observeOffscreen || typeof IntersectionObserver === "undefined") {
      return;
    }

    const el = resolveElement(root);
    if (!el) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onscreen = entry.isIntersecting;
        }
        emit();
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
  };

  bindObserver();

  return {
    /** Whether the animation should currently run. */
    get isActive() {
      return isActive();
    },

    /**
     * Re-bind IntersectionObserver after the root element mounts late
     * (e.g. ref not ready on first call). Safe to call multiple times.
     */
    observe(nextRoot?: RafRoot) {
      if (destroyed) return;
      if (nextRoot != null) root = nextRoot;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      onscreen = true;
      bindObserver();
      emit();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observeTab && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

interface SuspendedRafOptions {
  onFrame: (time: number) => void;
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
}

interface SuspendedRaf {
  start: () => void;
  stop: () => void;
  readonly isRunning: boolean;
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

/**
 * Owns a requestAnimationFrame loop that auto-pauses when the tab is hidden
 * or the root element is offscreen.
 */
function createSuspendedRaf({
  onFrame,
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
}: SuspendedRafOptions): SuspendedRaf {
  if (typeof onFrame !== "function") {
    throw new TypeError("createSuspendedRaf: onFrame is required");
  }

  let rafId: number | null = null;
  let running = false;
  let destroyed = false;

  const stopRaf = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (time: number) => {
    rafId = null;
    if (destroyed || !running || !gate.isActive) return;
    onFrame(time);
    if (!destroyed && running && gate.isActive) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const sync = () => {
    if (destroyed) return;
    if (running && gate.isActive) {
      if (rafId == null) {
        rafId = requestAnimationFrame(tick);
      }
    } else {
      stopRaf();
    }
  };

  const gate = createVisibilityGate({
    root,
    rootMargin,
    threshold,
    observeTab,
    observeOffscreen,
    onChange: sync,
  });

  return {
    /** Start (or resume) the loop when visibility allows. */
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },

    /** Stop requesting frames (visibility listeners stay attached until destroy). */
    stop() {
      running = false;
      stopRaf();
    },

    /** Whether the caller has started the loop (may still be paused by visibility). */
    get isRunning() {
      return running;
    },

    /** Whether a frame is currently allowed to schedule. */
    get isActive() {
      return gate.isActive;
    },

    /** Re-attach offscreen observer to a (new) root element. */
    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },

    /** Tear down listeners and cancel any pending frame. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      stopRaf();
      gate.destroy();
    },
  };
}

export {
  createSuspendedRaf,
  createVisibilityGate,
  DEFAULT_ROOT_MARGIN,
};

interface TextCloningProps {
    cloneCount?: number;
    offset?: number;
    textColor?: string;
    textSize?: number;
}

export default function TextCloning({
    cloneCount = 9,
    offset = 220,
    textColor = "#f5f5f5",
    textSize = 1,
}: TextCloningProps) {
    const canvasRef = useRef<any>(null);
    const [text, setText] = useState("Hyperiux");

    useEffect(() => {
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        let w: number;
        let h: number;
        let dpr: number;

        let mouse = { x: 0, y: 0 };
        let target = { x: 0, y: 0 };

        const prefersReducedMotion =
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const positionLerpFactor = prefersReducedMotion ? 1 : 0.08;
        const layerCount = prefersReducedMotion ? Math.min(3, cloneCount) : Math.max(1, Number(cloneCount) || 9);
        const depthOffset = Math.max(0, Number(offset) || 0);
        const safeTextSize = Math.max(0.4, Number(textSize) || 1);

        const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

        const resize = () => {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;

            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            mouse.x = target.x = w / 2;
            mouse.y = target.y = h / 2;
        };

        const drawText = (value: string, x: number, y: number, size: number, alpha: number) => {
            ctx.font = `900 ${size}px Arial Black, Impact, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.lineWidth = 2;
            ctx.strokeStyle = textColor;
            ctx.globalAlpha = alpha;
            ctx.strokeText(value, x, y);
            ctx.globalAlpha = 1;
        };

        const drawClones = () => {
            const dx = (mouse.x - w / 2) / w;
            const dy = (mouse.y - h / 2) / h;

            const depthX = dx * depthOffset;
            const depthY = dy * depthOffset;

            const layers = layerCount;
            const size = Math.min(w / Math.max(text.length * 0.72, 3), h * 0.42) * safeTextSize;

            for (let i = layers; i >= 0; i--) {
                const p = i / layers;

                drawText(
                    text,
                    w / 2 - depthX * p,
                    h / 2 - depthY * p,
                    size * (1 - p * 0.12),
                    0.16 + (1 - p) * 0.78
                );
            }
        };

        const drawStars = () => {
            for (let i = 0; i < 100; i++) {
                const x = (i * 91.7) % w;
                const y = (i * 47.3) % h;

                ctx.beginPath();
                ctx.fillStyle = "rgba(255,255,255,0.28)";
                ctx.arc(x, y, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const loop = createSuspendedRaf({
            root: canvas,
            onFrame: () => {
                mouse.x = lerp(mouse.x, target.x, positionLerpFactor);
                mouse.y = lerp(mouse.y, target.y, positionLerpFactor);

                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = "#101010";
                ctx.fillRect(0, 0, w, h);

                drawStars();
                drawClones();
            },
        });

        const onMove = (e: PointerEvent) => {
            target.x = e.clientX;
            target.y = e.clientY;
        };

        const onTouch = (e: TouchEvent) => {
            const touch = e.touches?.[0];
            if (!touch) return;
            target.x = touch.clientX;
            target.y = touch.clientY;
        };

        resize();
        loop.start();

        window.addEventListener("resize", resize);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerdown", onMove);
        window.addEventListener("touchstart", onTouch, { passive: true });
        window.addEventListener("touchmove", onTouch, { passive: true });

        return () => {
            loop.destroy();
            window.removeEventListener("resize", resize);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerdown", onMove);
            window.removeEventListener("touchstart", onTouch);
            window.removeEventListener("touchmove", onTouch);
        };
    }, [cloneCount, offset, text, textColor, textSize]);

    return (
        <>
            <input
                value={text}
                onChange={(e) => setText(e.target.value || "")}
                placeholder="Type text"
                className="w-fit px-[2vw] py-[1vw] rounded-full border border-white/20 fixed bottom-[5%] z-10 left-1/2 -translate-x-1/2 focus:border-[#ff5f00] focus:outline-[#ff5f00] max-lg:px-[5vw] max-md:py-[3vw] max-lg:py-[2vw] max-lg:text-[3vw]! max-md:text-[4vw]! text-center"
            />

            <canvas
                ref={canvasRef}
                style={{
                    position: "fixed",
                    inset: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "#101010",
                    display: "block",
                }}
            />
        </>
    );
}
