// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

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

interface MousePosition {
  x: number | null;
  y: number | null;
}

function useMousePosition(): MousePosition {
 const [mousePosition, setMousePosition] = useState<MousePosition>({ x: null, y: null });

 useEffect(() => {
 const updateMousePosition = (e: MouseEvent) => {
 setMousePosition({ x: e.clientX, y: e.clientY });
 };
 window.addEventListener('mousemove', updateMousePosition);
 return () => window.removeEventListener('mousemove', updateMousePosition);
 }, []);

 return mousePosition;
}

function useIsPointerFine() {
 const [isPointerFine, setIsPointerFine] = useState(
 () => typeof window !== 'undefined'
 && window.matchMedia('(pointer: fine)').matches
 );

 useEffect(() => {
 const mq = window.matchMedia('(pointer: fine)');
 const handler = (e: MediaQueryListEvent) => setIsPointerFine(e.matches);
 mq.addEventListener('change', handler);
 return () => mq.removeEventListener('change', handler);
 }, []);

 return isPointerFine;
}

function usePrefersReducedMotion() {
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(
 () => typeof window !== 'undefined'
 && window.matchMedia('(prefers-reduced-motion: reduce)').matches
 );

 useEffect(() => {
 const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
 const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
 mq.addEventListener('change', handler);
 return () => mq.removeEventListener('change', handler);
 }, []);

 return prefersReducedMotion;
}

interface CircleTextRevealProps {
  textColor?: string;
  circleColorBg?: string;
  RevealedTextColor?: string;
  lerp?: number;
  smoothness?: number;
  circleSize?: number;
}

export default function CircleTextReveal({
 textColor ='#111',
 circleColorBg ='#ff5f00',
 RevealedTextColor ='#fefefe',
 lerp = 0.15,
 smoothness = 0.5,
 circleSize = 500,
}: CircleTextRevealProps) {
 const sectionRef = useRef<HTMLElement | null>(null);
 const [isHovered, setIsHovered] = useState(false);
 const { x, y } = useMousePosition();
 const isPointerFine = useIsPointerFine();
 const prefersReducedMotion = usePrefersReducedMotion();

 const [smoothPos, setSmoothPos] = useState<{ x: number, y: number } | null>(null);

 const baseCircleSize = Math.max(24, Number(circleSize) || 500);
 const size = isHovered ? baseCircleSize : Math.max(24, baseCircleSize * 0.08);
 const lerpFactor = prefersReducedMotion ? 1 : Math.min(1, Math.max(0.01, Number(lerp) || 0.15));
 const safeSmoothness = prefersReducedMotion ? 0 : Math.max(0, Number(smoothness) || 0.5);

 useEffect(() => {
 if (!isPointerFine) return;

 const mix = (start: number, end: number, factor: number): number => start + (end - start) * factor;

 const loop = createSuspendedRaf({
 root: sectionRef.current,
 onFrame: () => {
 setSmoothPos((prev) => {
 if (x === null || y === null) return prev;
 if (prev === null) return { x, y };
 return {
 x: mix(prev.x, x, lerpFactor),
 y: mix(prev.y, y, lerpFactor),
 };
 });
 },
 });

 loop.start();

 return () => loop.destroy();
 }, [x, y, isPointerFine, prefersReducedMotion, lerpFactor]);

 return (
 <section ref={sectionRef} className="w-screen h-screen flex items-center justify-center text-[7vw] text-center px-[5vw] bg-[#fefefe] relative overflow-hidden">

 {(!isPointerFine) && (
 <div className="absolute hidden max-lg:flex max-md:flex inset-0 z-20 top-[30%]  items-center justify-center px-8 text-center pointer-events-none">
 <div className="flex max-w-sm flex-col items-center gap-3">
 <p className="text-[4vw] leading-[1.2]!" style={{ color: `${textColor}` }}>
 Open on desktop to reveal the text underneath.
 </p>
 </div>
 </div>
 )}

 {/* ── Masked layer - desktop/mouse only, hidden until first mouse move ── */}
 {isPointerFine && smoothPos !== null && (
 <motion.div
 className="absolute inset-0 flex items-center justify-center z-10"
 style={{
 WebkitMaskImage:'radial-gradient(circle at center, black 50%, transparent 51%)',
 WebkitMaskRepeat:'no-repeat',
 }}
 animate={{
 WebkitMaskPosition: `${smoothPos.x - size / 2}px ${smoothPos.y - size / 2}px`,
 WebkitMaskSize: `${size}px ${size}px`,
 } as any}
 transition={
 prefersReducedMotion
 ? { type:'tween', ease:'linear', duration: 0 }
 : { type:'tween', ease:'backOut', duration: safeSmoothness }
 }
 >
 <div className="absolute inset-0" style={{ backgroundColor: circleColorBg }} />

 <h2
 className="relative z-10 leading-tight cursor-default select-none"
 style={{ color: RevealedTextColor }}
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 >
 The hidden layer has been waiting for your cursor.
 </h2>
 </motion.div>
 )}

 <div className="relative z-0">
 <h1
 className="leading-tight select-none"
 style={{ color: textColor }}
 >
 Some ideas only bloom when you move toward them.
 </h1>
 </div>
 </section>
 );
}
