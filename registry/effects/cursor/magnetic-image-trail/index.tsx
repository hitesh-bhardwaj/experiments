// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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

// Images load straight from the Vault asset bucket. It serves
// Access-Control-Allow-Origin: *, so they work as WebGL textures with
// crossOrigin="anonymous" - no proxy route or next.config needed.

const imageUrls = [
  "https://picsum.photos/seed/h07/1600/1200",
  "https://picsum.photos/seed/h08/1600/1200",
  "https://picsum.photos/seed/v01/1600/1200",
  "https://picsum.photos/seed/h10/1600/1200",
  "https://picsum.photos/seed/h11/1600/1200",
  "https://picsum.photos/seed/h12/1600/1200",
  "https://picsum.photos/seed/h13/1600/1200",
  "https://picsum.photos/seed/h14/1600/1200",
  "https://picsum.photos/seed/h15/1600/1200",
  "https://picsum.photos/seed/h02/1600/1200",
  "https://picsum.photos/seed/h01/1600/1200",
];

const SLOTS = [
 { y: 0, size: 1.19, w: 206, h: 167 }, // mid - just a bit bigger
 { y: -30, size: 1.10, w: 214, h: 167 }, // 2nd closest - little bigger, spread more
 { y: 30, size: 1.20, w: 214, h: 167 },
 { y: -60, size: 1.06, w: 186, h: 144 }, // spread more
 { y: 60, size: 1.06, w: 186, h: 144 },

 { y: -94, size: 0.91, w: 157, h: 122 }, // spread more
 { y: 94, size: 0.91, w: 157, h: 122 },
 { y: -122, size: 0.80, w: 139, h: 109 },
 { y: 122, size: 0.80, w: 139, h: 109 },

 { y: -18, size: 1.04, w: 166, h: 129 }, // very little more than before
 { y: 18, size: 1.02, w: 161, h: 126 },
 { y: -52, size: 0.97, w: 153, h: 118 },
 { y: 52, size: 0.97, w: 153, h: 118 },

 { y: -78, size: 0.87, w: 137, h: 108 },
 { y: 78, size: 0.87, w: 137, h: 108 },
 { y: -134, size: 0.70, w: 111, h: 83 }, // spread a bit more at edges
 { y: 134, size: 0.70, w: 111, h: 83 },
 { y: 10, size: 0.91, w: 140, h: 108 }, // very little
];

// Faster + tighter motion.
const SPEED = 0.0003;
const MAX_SPEED = 0.0015; // Added max speed limit for generation
const FOLLOW = 0.22;
const SPREAD_X = 250; // Slightly more spread since sizes increased

// Interaction Config
const MOUSE_SPEED_BOOST = 0.003;
const FORWARD_PUSH_AMOUNT = 40;
const UPWARD_PUSH_AMOUNT = 30;
const LERP_AMOUNT = 0.18;
const SCALE_OUT_MIN = 0.68;
const SCALE_OUT_MAX = 1.48;

function clamp(v: number, min: number, max: number) {
 return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
 return a + (b - a) * t;
}

function drawRoundedImage(
 ctx: CanvasRenderingContext2D,
 img: HTMLImageElement,
 x: number,
 y: number,
 w: number,
 h: number,
 r: number = 0
) {
 if (!img?.complete || img.naturalWidth <= 0) return;

 const imgAspect = img.naturalWidth / img.naturalHeight;
 const boxAspect = w / h;

 let sx, sy, sw, sh;

 if (imgAspect > boxAspect) {
 sh = img.naturalHeight;
 sw = sh * boxAspect;
 sx = (img.naturalWidth - sw) / 2;
 sy = 0;
 } else {
 sw = img.naturalWidth;
 sh = sw / boxAspect;
 sx = 0;
 sy = (img.naturalHeight - sh) / 2;
 }

 if (r > 0) {
 ctx.save();
 ctx.beginPath();
 ctx.roundRect(x, y, w, h, r);
 ctx.clip();
 ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
 ctx.restore();
 return;
 }

 // No rounded corners.
 ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

interface ImageTrailProps {
 trailLength?: number;
 magnetStrength?: number;
 scaleIn?: number;
 scaleOut?: number;
 lerp?: number;
 size?: number;
}

function ImageTrail({
 trailLength = SLOTS.length,
 magnetStrength = 1,
 scaleIn = 0.06,
 scaleOut = 1.48,
 lerp: lerpAmount = LERP_AMOUNT,
 size = 1
}: ImageTrailProps) {
 const wrapRef = useRef<HTMLElement | null>(null);
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const imagesRef = useRef<HTMLImageElement[]>([]);
 const resolvedTrailLength = clamp(Math.round(Number(trailLength) || SLOTS.length), 1, SLOTS.length);
 const resolvedMagnetStrength = Math.max(0, Number(magnetStrength) || 0);
 const resolvedScaleIn = Math.max(0, Number(scaleIn) || 0);
 const resolvedScaleOut = Math.max(resolvedScaleIn, Number(scaleOut) || resolvedScaleIn);
 const resolvedLerp = clamp(Number(lerpAmount) || LERP_AMOUNT, 0.01, 1);
 const resolvedSize = Math.max(0.1, Number(size) || 1);

 const pointer = useRef({ x: 0, y: 0 });
 const lerpedPointer = useRef({ x: 0, y: 0 }); // lerped pointer position
 const smooth = useRef({ x: 0, y: 0 });
 const dirRef = useRef({ x: 1, y: 0 });
 const lastMoveAt = useRef(0);
 const phase = useRef(0);
 const lastTime = useRef(0);

 useEffect(() => {
 const slots = SLOTS.slice(0, resolvedTrailLength);
 const imgs = slots.map((_, i) => {
 const img = new Image();
 img.crossOrigin ="anonymous";
 img.src = imageUrls[i % imageUrls.length];
 return img;
 });

 imagesRef.current = imgs;

 const canvas = canvasRef.current as HTMLCanvasElement;
 const wrap = wrapRef.current as HTMLElement;
 const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

 function resize() {
 const dpr = Math.min(window.devicePixelRatio || 1, 2);
 const w = wrap.clientWidth;
 const h = wrap.clientHeight;

 canvas.width = Math.round(w * dpr);
 canvas.height = Math.round(h * dpr);
 canvas.style.width = `${w}px`;
 canvas.style.height = `${h}px`;

 ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

 pointer.current = { x: w / 2, y: h / 2 };
 lerpedPointer.current = { x: w / 2, y: h / 2 };
 smooth.current = { x: w / 2, y: h / 2 };
 }

 resize();
 window.addEventListener("resize", resize);

 function frame(now: number) {
 const W = wrap.clientWidth;
 const H = wrap.clientHeight;
 ctx.clearRect(0, 0, W, H);

 const dt = Math.min(32, now - (lastTime.current || now));
 lastTime.current = now;

 lerpedPointer.current.x = lerp(lerpedPointer.current.x, pointer.current.x, resolvedLerp);
 lerpedPointer.current.y = lerp(lerpedPointer.current.y, pointer.current.y, resolvedLerp);

 // Phase increment will be calculated after mouse speed is determined

 const prevSX = smooth.current.x;
 const prevSY = smooth.current.y;

 // use lerpedPointer instead of pointer directly for the trailing smooth position
 smooth.current.x += (lerpedPointer.current.x - smooth.current.x) * FOLLOW;
 smooth.current.y += (lerpedPointer.current.y - smooth.current.y) * FOLLOW;

 const cx = smooth.current.x;
 const cy = smooth.current.y;

 const vx = cx - prevSX;
 const vy = cy - prevSY;
 const vmag = Math.hypot(vx, vy);
 if (vmag > 0.35) {
 const tx = vx / vmag;
 const ty = vy / vmag;
 dirRef.current.x = dirRef.current.x + (tx - dirRef.current.x) * 0.2;
 dirRef.current.y = dirRef.current.y + (ty - dirRef.current.y) * 0.2;
 const m = Math.hypot(dirRef.current.x, dirRef.current.y) || 1;
 dirRef.current.x /= m;
 dirRef.current.y /= m;
 lastMoveAt.current = now;
 } else if (!lastMoveAt.current) {
 lastMoveAt.current = now;
 }

 const speed01 = clamp(vmag / 18, 0, 1);
  // INCREASE GENERATING SPEED BASED ON MOUSE MOVEMENT, CLAMPED TO MAX_SPEED
 const currentSpeed = clamp(SPEED + speed01 * MOUSE_SPEED_BOOST * resolvedMagnetStrength, SPEED, MAX_SPEED);
 phase.current += dt * currentSpeed;
 const dir = dirRef.current;

 const cards = slots.map((slot, i) => {
 const n = slots.length;

 // Animation progress per image.
 const t = (phase.current + i / n) % 1;

 // -1 → 0 → 1
 // This controls the movement along the diagonal path.
 const pathNorm = t * 2 - 1;

 // Diagonal movement direction.
 // Start: bottom-right
 // Center: middle
 // End: top-left
 // Bottom-left → top-right, but less steep.
 const moveX = pathNorm;
 const moveY = -pathNorm;

 // Keep the circular cluster shape.
 const yOffset = clamp(slot.y, -SPREAD_X * 0.82, SPREAD_X * 0.82);

 const circleWidthAtY =
 Math.sqrt(Math.max(0, SPREAD_X * SPREAD_X - yOffset * yOffset)) * 0.74;

 // Lower number = flatter/slanting movement.
 // 0.38 was too steep.
 const diagonalPush = SPREAD_X * 0.15;

 // Move the whole diagonal slightly upward,
 // so it starts a little above bottom-left
 // and ends a little below top-right.
 const verticalLift = -SPREAD_X * 0.06;

 const x = cx + moveX * circleWidthAtY;
 const y = cy + yOffset + moveY * diagonalPush + verticalLift;

 // Scale follows the same diagonal movement:
 // small → big at center → small
 const rawCenterScale = Math.max(0, 1 - Math.abs(pathNorm));
 const easedCenterScale =
 rawCenterScale * rawCenterScale * (3 - 2 * rawCenterScale);
 const centerScale = lerp(resolvedScaleIn, 0.9, easedCenterScale);

 // Scale images up in the direction of mouse movement.
 // Images ahead of the mouse direction get larger.
 // Images behind the mouse direction get smaller.
 const dx = x - cx;
 const dy = y - cy;

 const directionalProjection = clamp(
 (dx * dir.x + dy * dir.y) / Math.max(1, SPREAD_X),
 -1,
 1
 );

 // Scaling out works on OPPOSITE direction.
 // Images behind the mouse direction get larger (scale out).
 const oppositeProjection = -directionalProjection;
 const backwardAmount = (oppositeProjection + 1) * 0.5;

 const movementBoost = lerp(1, 1.18, speed01 * resolvedMagnetStrength);
 const directionalScale = lerp(SCALE_OUT_MIN, resolvedScaleOut, backwardAmount) * movementBoost;
 const scale = centerScale * directionalScale * 1.14 * resolvedSize;

 // Image translate effect on mouse move direction.
 // Images ahead of the mouse are pushed forward.
 const forwardPush = Math.max(0, directionalProjection) * speed01 * FORWARD_PUSH_AMOUNT * resolvedMagnetStrength;

 // Images scaling out (behind) translate a little up
 const upwardPush = Math.max(0, oppositeProjection) * speed01 * UPWARD_PUSH_AMOUNT * resolvedMagnetStrength;

 return {
 i,
 img: imgs[i % imgs.length],

 x: x + dir.x * forwardPush,
 y: y + dir.y * forwardPush - upwardPush,

 w: slot.w * slot.size * scale,
 h: slot.h * slot.size * scale,

 rot: 0,
 alpha: 1,
 order: i,
 };
 });

 // Stable stacking: never sort by `depth` (which changes during animation).
 cards.sort((a, b) => a.i - b.i);

 for (const card of cards) {
 if (card.w < 2 || card.h < 2) continue;

 ctx.save();
 ctx.translate(card.x, card.y);
 ctx.globalAlpha = 1;
 ctx.shadowColor ="rgba(0,0,0,0.14)";
 ctx.shadowBlur = 12;
 ctx.shadowOffsetY = 5;

 drawRoundedImage(ctx, card.img, -card.w / 2, -card.h / 2, card.w, card.h, 0);

 ctx.restore();
 }
 }

 const loop = createSuspendedRaf({
 root: wrap,
 onFrame: frame,
 });
 loop.start();

 return () => {
 loop.destroy();
 window.removeEventListener("resize", resize);
 };
 }, [
 resolvedTrailLength,
 resolvedMagnetStrength,
 resolvedScaleIn,
 resolvedScaleOut,
 resolvedLerp,
 resolvedSize
 ]);

 const updatePointer = useCallback((e: ReactPointerEvent<HTMLElement>) => {
 const rect = wrapRef.current?.getBoundingClientRect();
 if (!rect) return;
 // On mouse move, we set pointer to the actual event location (no lerp here).
 pointer.current = {
 x: e.clientX - rect.left,
 y: e.clientY - rect.top,
 };
 }, []);

 return (
 <section
 ref={wrapRef}
 onPointerMove={updatePointer}
 onPointerEnter={updatePointer}
 className="relative w-full h-screen bg-[#EDEBE6] overflow-hidden"
 >
 <div className="absolute inset-0 w-[70%] mx-auto flex items-center justify-center pointer-events-none select-none z-1 text-[#111] text-[3vw] tracking-[-0.03em] leading-[1.05] text-center px-5">
 Interfaces people remember.
 <br />
 Components developers love.
 </div>
 <canvas
 ref={canvasRef}
 className="absolute inset-0 w-full h-full pointer-events-none z-2"
 />
 </section>
 );
}

interface MagneticImageTrailProps {
  trailLength?: number
  magnetStrength?: number
  scaleIn?: number
  scaleOut?: number
  lerp?: number
  size?: number
}

const Content = () => (
  <main className="relative min-h-screen max-md:h-screen w-full overflow-hidden bg-[#f4f4f1] text-black">

    <div className="absolute top-[30%] left-1/2 w-[50%] hidden max-lg:flex -translate-x-1/2 -translate-y-1/2 h-fit max-md:w-[70%] px-6 text-center">
      <p className="rounded-xl bg-black/10 px-5 py-3 leading-[1.2] text-base text-black backdrop-blur-sm">
        Follow the motion. <br />
        Open on desktop for the full magnetic effect
      </p>
    </div>

    {/* content */}
    <section className="flex min-h-screen items-end px-8 pb-8">
      <div>
        <h1 className="font-mono text-[8vh] max-md:text-[15vw] leading-none w-[30vw] font-black uppercase">
          Magnetic
          <br />
          Image Trail
        </h1>

        <p className="mt-6 font-mono text-sm uppercase tracking-[0.25em] text-black/40">
          Cursor · Images · Momentum
        </p>
      </div>
    </section>

  </main>
)

export default function MagneticImageTrail(props: MagneticImageTrailProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1025)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  // prevent desktop component flash during hydration
  if (isMobile === null) return null

  return isMobile ? (
    <Content />
  ) : (
    <>
      <ImageTrail {...props} />
    </>
  )
}
