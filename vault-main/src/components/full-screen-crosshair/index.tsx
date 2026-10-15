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

const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

interface UseMouseOptions {
 smooth?: boolean;
 lerpFactor?: number;
}

export const useMouse = ({
 smooth = true,
 lerpFactor = 0.1,
}: UseMouseOptions = {}) => {
 const mouse = useRef({ x: 0, y: 0 });
 const lastMouse = useRef({ x: 0, y: 0 });
 const smoothMouse = useRef({ x: 0, y: 0 });

 // Optional state (only if you want re-renders)
 const [state, setState] = useState({
 x: 0,
 y: 0,
 smoothX: 0,
 smoothY: 0,
 dx: 0,
 dy: 0,
 distance: 0,
 });

 useEffect(() => {
 const handleMouseMove = (e: MouseEvent) => {
 mouse.current = {
 x: e.clientX,
 y: e.clientY,
 };
 };

 const loop = createSuspendedRaf({
 root: null,
 observeOffscreen: false,
 onFrame: () => {
 const { x, y } = mouse.current;
 const { x: lx, y: ly } = lastMouse.current;

 const dx = x - lx;
 const dy = y - ly;
 const distance = Math.hypot(dx, dy);

 // Smooth interpolation
 if (smooth) {
 smoothMouse.current.x = lerp(smoothMouse.current.x, x, lerpFactor);
 smoothMouse.current.y = lerp(smoothMouse.current.y, y, lerpFactor);
 } else {
 smoothMouse.current.x = x;
 smoothMouse.current.y = y;
 }

 // Update state (if used)
 setState({
 x,
 y,
 smoothX: smoothMouse.current.x,
 smoothY: smoothMouse.current.y,
 dx,
 dy,
 distance,
 });

 lastMouse.current = { x, y };
 },
 });

 window.addEventListener("mousemove", handleMouseMove);
 loop.start();

 return () => {
 window.removeEventListener("mousemove", handleMouseMove);
 loop.destroy();
 };
 }, [lerpFactor, smooth]);

 return {
 // RAW values
 x: state.x,
 y: state.y,

 // SMOOTH values (important for animations)
 smoothX: state.smoothX,
 smoothY: state.smoothY,

 // MOVEMENT
 dx: state.dx,
 dy: state.dy,
 distance: state.distance,

 // REFS (for performance-heavy GSAP usage)
 mouse,
 smoothMouse,
 };
};

interface FullScreenCrosshairProps {
  color?: string;
  centerContent?: string;
  hideNativeCursor?: boolean;
  lineSize?: number;
  gap?: number;
  thickness?: number;
  centerSize?: number;
  smooth?: boolean;
  lerpFactor?: number;
  blendMode?: string;
  className?: string;
}

const FullScreenCrosshair = ({
  color = "#000000",
  centerContent = "•",
  hideNativeCursor = true,
  gap = 20,
  thickness = 1,
  centerSize = 24,
  smooth = true,
  lerpFactor = 0.14,
  className = "",
}: FullScreenCrosshairProps) => {
  const crosshairArmLength = 1500;
  const { smoothMouse } = useMouse({
    smooth,
    lerpFactor,
  });

  useEffect(() => {
    if (!hideNativeCursor) return undefined;

    const { body, documentElement } = document;
    const previousCursor = body.style.cursor;
    const previousRootCursor = documentElement.style.cursor;
    const style = document.createElement("style");
    style.setAttribute("data-crosshair-cursor-style", "true");
    style.textContent = `
      html[data-crosshair-hide-cursor="true"],
      html[data-crosshair-hide-cursor="true"] body,
      html[data-crosshair-hide-cursor="true"] * {
        cursor: none !important;
      }

      html[data-crosshair-hide-cursor="true"] button,
      html[data-crosshair-hide-cursor="true"] input,
      html[data-crosshair-hide-cursor="true"] textarea,
      html[data-crosshair-hide-cursor="true"] select,
      html[data-crosshair-hide-cursor="true"] a,
      html[data-crosshair-hide-cursor="true"] label,
      html[data-crosshair-hide-cursor="true"] [role="button"],
      html[data-crosshair-hide-cursor="true"] [contenteditable="true"] {
        cursor: auto !important;
      }
    `;

    documentElement.dataset.crosshairHideCursor = "true";
    documentElement.style.cursor = "none";
    body.style.cursor = "none";
    document.head.appendChild(style);

    return () => {
      body.style.cursor = previousCursor;
      documentElement.style.cursor = previousRootCursor;
      delete documentElement.dataset.crosshairHideCursor;
      style.remove();
    };
  }, [hideNativeCursor]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-70 ${className}`}
      style={{
        "--crosshair-color": color,
        "--crosshair-line-size": `${crosshairArmLength}px`,
        "--crosshair-gap": `${gap}px`,
        "--crosshair-thickness": `${thickness}px`,
        "--crosshair-center-size": `${centerSize}px`,
      } as React.CSSProperties & Record<string, string | number>}
    >
      <div
        className="absolute left-0 top-0 h-0 w-0 will-change-transform"
        style={{
          transform: `translate3d(${smoothMouse.current.x}px, ${smoothMouse.current.y}px, 0)`,
        }}
      >
        <span className="absolute left-1/2 -top-[(var(--crosshair-gap)+var(--crosshair-line-size))] block h-(--crosshair-line-size) w-(--crosshair-thickness) -translate-x-1/2 bg-(--crosshair-color)" />
        <span className="absolute left-(--crosshair-gap) top-1/2 block h-(--crosshair-thickness) w-(--crosshair-line-size) -translate-y-1/2 bg-(--crosshair-color)" />
        <span className="absolute left-1/2 top-(--crosshair-gap) block h-(--crosshair-line-size) w-(--crosshair-thickness) -translate-x-1/2 bg-(--crosshair-color)" />
        <span className="absolute right-(--crosshair-gap) top-1/2 block h-(--crosshair-thickness) w-(--crosshair-line-size) -translate-y-1/2 bg-(--crosshair-color)" />

        <div className="absolute left-1/2 top-1/2 flex min-h-(--crosshair-center-size) min-w-(--crosshair-center-size) -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center whitespace-nowrap leading-none text-(length:--crosshair-center-size) text-(--crosshair-color) max-lg:text-[calc(var(--crosshair-center-size)*0.9)] max-md:text-[calc(var(--crosshair-center-size)*0.9)]">
          {centerContent}
        </div>
      </div>
    </div>
  );
};

export default FullScreenCrosshair;
