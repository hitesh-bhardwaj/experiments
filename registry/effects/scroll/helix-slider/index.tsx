// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

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

const COUNT = 30; // at base extent; scales with it

// Below this width the spiral gets fewer turns and larger cards, so it stays
// readable on a narrow screen instead of shrinking everything down.
const COMPACT_BREAKPOINT = 1025;
const COMPACT_TURNS = 3.4;
const COMPACT_PLANE_SCALE = 1.8;
const COMPACT_GAP = 0.75; // slot height per card height, compact views
const COMPACT_Y_SPACING = 1.2; // extra vertical breathing room
const HEIGHT = 11; // base extent, grows to fill tall views
const PLANE_W = 1.6;
const PLANE_H = 1.1;

const SCROLL_SENSITIVITY = 0.001;
const INERTIA_MAX = 6;

// Share of the frame width the ring spans: desktop's value, easing up toward
// WIDE on portrait screens where a fixed share would leave the ring stranded.
const RING_WIDTH_RATIO = 0.64;
const RING_WIDTH_NARROW = 0.92;

const FOV = 40;
const MIN_CAMERA_Z = 9.9;
const TEXTURE_WIDTH = 720;
const FADE_DURATION = 700;
const FADE_STAGGER = 30;

const GRAB_CLASS = "cursor-grab";
const GRABBING_CLASS = "cursor-grabbing";

export const DEFAULT_IMAGES = [
  "https://picsum.photos/seed/h01/1600/1200",
  "https://picsum.photos/seed/h02/1600/1200",
  "https://picsum.photos/seed/h03/1600/1200",
  "https://picsum.photos/seed/h05/1600/1200",
  "https://picsum.photos/seed/h06/1600/1200",
  "https://picsum.photos/seed/h07/1600/1200",
  "https://picsum.photos/seed/h08/1600/1200",
  "https://picsum.photos/seed/h09/1600/1200",
  "https://picsum.photos/seed/h10/1600/1200",
  "https://picsum.photos/seed/h11/1600/1200",
  "https://picsum.photos/seed/h12/1600/1200",
  "https://picsum.photos/seed/h13/1600/1200",
  "https://picsum.photos/seed/h14/1600/1200",
  "https://picsum.photos/seed/h15/1600/1200",
];

type Motion = {
  offset: number; // in slots
  velocity: number; // slots/sec
  pending: number; // px since last frame
  dragging: boolean;
};

const createMotion = (): Motion => ({
  offset: 0,
  velocity: 0,
  pending: 0,
  dragging: false,
});

// Wraps endlessly both directions
function placeSlot(
  slot: number,
  offset: number,
  extent: number,
  count: number,
  turns: number
) {
  let n = (slot + offset) % count;
  if (n < 0) n += count;
  const t = n / count;
  return {
    // Pitch stays fixed as the strand lengthens
    angle: t * turns * Math.PI * 2,
    y: t * extent - extent / 2,
  };
}

// Cover-fit, cropping overflow
function coverFit(
  texture: THREE.Texture,
  width: number,
  height: number,
  planeAspect: number
) {
  const imageAspect = width / height;
  if (imageAspect > planeAspect) {
    const r = planeAspect / imageAspect;
    texture.repeat.set(r, 1);
    texture.offset.set((1 - r) / 2, 0);
  } else {
    const r = imageAspect / planeAspect;
    texture.repeat.set(1, r);
    texture.offset.set(0, (1 - r) / 2);
  }
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
}

type Layout = {
  turns: number;
  planeW: number;
  planeH: number;
  gap: number;
  ySpacing: number;
};

function resolveLayout(
  width: number,
  turns: number,
  cardScale: number
): Layout {
  const compact = width > 0 && width < COMPACT_BREAKPOINT;
  const scale = (compact ? COMPACT_PLANE_SCALE : 1) * cardScale;
  return {
    // Compact views hold their own twist count so the strand stays readable.
    turns: compact ? COMPACT_TURNS : turns,
    planeW: PLANE_W * scale,
    planeH: PLANE_H * scale,
    gap: compact ? COMPACT_GAP : 0,
    ySpacing: compact ? COMPACT_Y_SPACING : 1,
  };
}

// Pull back so the helix fits
function framingDistance(aspect: number, layout: Layout, radius: number) {
  const vFov = (FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  // Hold the ring at the same share of the frame width it has on desktop, so
  // narrow views read as the same composition rather than a zoomed-in one.
  const ratio = THREE.MathUtils.lerp(
    RING_WIDTH_NARROW,
    RING_WIDTH_RATIO,
    THREE.MathUtils.clamp((aspect - 0.5) / 1.0, 0, 1)
  );
  const fitWidth = (radius + layout.planeW / 2) / ratio / Math.tan(hFov / 2);
  return Math.max(MIN_CAMERA_Z, fitWidth);
}

// Keep planes-per-unit constant
function strandCount(extent: number, layout: Layout) {
  // Compact views space planes by card height, so the gap holds no matter how
  // long the strand grows. Wide views keep the authored density.
  if (layout.gap > 0) {
    return Math.max(6, Math.round(extent / (layout.planeH * layout.gap)));
  }
  return Math.round(COUNT * (extent / HEIGHT));
}

// Overflow the view so ends never show
function strandExtent(distance: number, layout: Layout, radius: number) {
  const vFov = (FOV * Math.PI) / 180;
  const visible = 2 * Math.tan(vFov / 2) * (distance + radius);
  return Math.max(HEIGHT, visible + layout.planeH * 2) * layout.ySpacing;
}

function Strand({
  images,
  reduced,
  extent,
  count,
  layout,
  radius,
  autoplaySpeed,
  dragSensitivity,
  scrollIntensity,
  inertiaDecay,
}: {
  images: string[];
  reduced: boolean;
  extent: number;
  count: number;
  layout: Layout;
  radius: number;
  autoplaySpeed: number;
  dragSensitivity: number;
  scrollIntensity: number;
  inertiaDecay: number;
}) {
  const { gl } = useThree();
  const motion = useRef<Motion>(createMotion());
  const meshes = useRef<THREE.Mesh[]>([]);

  // Read live in the frame loop so slider changes apply without a remount.
  const tuning = useRef({ autoplaySpeed, dragSensitivity, scrollIntensity, inertiaDecay });
  tuning.current = { autoplaySpeed, dragSensitivity, scrollIntensity, inertiaDecay };

  // Bitmaps decoded once per URL, reused when materials get recreated (e.g.
  // count changing because a remixer prop like radius/turns/cardScale nudges
  // the layout) so cards don't flash black and refetch on every tweak.
  const bitmapCache = useRef<Map<string, ImageBitmap>>(new Map());

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(layout.planeW, layout.planeH),
    [layout.planeW, layout.planeH]
  );

  // Start black until decoded, unless we already have a cached bitmap for
  // this slot's image - then show it immediately instead of flashing black.
  const materials = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        const url = images[i % images.length];
        const cached = url ? bitmapCache.current.get(url) : undefined;
        if (cached) {
          const texture = new THREE.Texture(cached);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          coverFit(texture, cached.width, cached.height, layout.planeW / layout.planeH);
          m.map = texture;
          m.needsUpdate = true;
          m.color.setScalar(1);
        } else {
          m.color.setScalar(0);
        }
        return m;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      for (const m of materials) {
        m.map?.dispose();
        m.dispose();
      }
    };
  }, [geometry, materials]);

  // Close cached bitmaps only when the Strand itself unmounts, not when
  // materials are recreated due to a prop-driven count change.
  useEffect(() => {
    const cache = bitmapCache.current;
    return () => {
      for (const bitmap of cache.values()) bitmap.close();
      cache.clear();
    };
  }, []);

  useEffect(() => {
    if (!images.length) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const started = performance.now();

    materials.forEach((material, i) => {
      const url = images[i % images.length];
      // Far planes reveal first
      const order = count - 1 - i;

      const cachedBitmap = url ? bitmapCache.current.get(url) : undefined;
      if (cachedBitmap) {
        // Already decoded (e.g. materials were recreated because a remixer
        // prop shifted the card count) - reuse it instead of refetching, and
        // show the card immediately instead of fading in from black.
        const mesh = meshes.current[i];
        if (mesh) mesh.visible = true;
        material.color.setScalar(1);
        return;
      }

      // Revalidate images previously cached by non-CORS <img> requests.
      fetch(url, { mode: "cors", credentials: "omit", cache: "reload" })
        .then((r) => {
          if (!r.ok) throw new Error(`fetch failed ${r.status}`);
          return r.blob();
        })
        .then((blob) =>
          createImageBitmap(blob, {
            imageOrientation: "flipY",
            resizeWidth: TEXTURE_WIDTH,
            resizeQuality: "high",
          })
        )
        .then((bitmap) => {
          if (cancelled) {
            bitmap.close();
            return;
          }
          bitmapCache.current.set(url, bitmap);
          const texture = new THREE.Texture(bitmap);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          coverFit(
            texture,
            bitmap.width,
            bitmap.height,
            layout.planeW / layout.planeH
          );
          material.map = texture;
          material.needsUpdate = true;

          const mesh = meshes.current[i];
          if (reduced) {
            material.color.setScalar(1);
            if (mesh) mesh.visible = true;
            return;
          }

          const elapsed = performance.now() - started;
          const delay = Math.max(0, order * FADE_STAGGER - elapsed);
          timers.push(
            setTimeout(() => {
              if (cancelled) return;
              if (mesh) mesh.visible = true;
              const from = performance.now();
              const step = () => {
                if (cancelled) return;
                const k = Math.min(
                  (performance.now() - from) / FADE_DURATION,
                  1
                );
                material.color.setScalar(1 - Math.pow(1 - k, 3)); // power3.out
                if (k < 1) requestAnimationFrame(step);
              };
              step();
            }, delay)
          );
        })
        .catch((error) => {
          if (!cancelled) {
            console.error(`HelixSlider: failed to load image ${url}`, error);
          }
        });
    });

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
    };
  }, [images, materials, reduced, count, layout.planeW, layout.planeH]);

  useEffect(() => {
    const el: HTMLCanvasElement = gl.domElement;
    const state = motion.current;

    let lastX = 0;
    let pointerId: number | null = null;

    const down = (e: PointerEvent) => {
      pointerId = e.pointerId;
      state.dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
      el.classList.remove(GRAB_CLASS);
      el.classList.add(GRABBING_CLASS);
    };

    const move = (e: PointerEvent) => {
      if (!state.dragging || e.pointerId !== pointerId) return;
      state.pending += e.clientX - lastX;
      lastX = e.clientX;
    };

    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      state.dragging = false;
      pointerId = null;
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      el.classList.remove(GRABBING_CLASS);
      el.classList.add(GRAB_CLASS);
    };

    const wheel = (e: WheelEvent) => {
      if (reduced) return;
      state.velocity = THREE.MathUtils.clamp(
        state.velocity + e.deltaY * SCROLL_SENSITIVITY * tuning.current.scrollIntensity,
        -INERTIA_MAX,
        INERTIA_MAX
      );
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
      el.classList.remove(GRABBING_CLASS);
      el.classList.add(GRAB_CLASS);
    };
  }, [gl, motion, reduced]);

  useFrame((_, delta) => {
    const state = motion.current;
    const dt = Math.min(delta, 0.1);
    const { autoplaySpeed: speed, dragSensitivity: sens, inertiaDecay: decay } =
      tuning.current;

    const dragged = state.pending * sens;
    state.pending = 0;

    if (state.dragging) {
      // Track drag for throw
      state.velocity =
        dt > 0
          ? THREE.MathUtils.clamp(dragged / dt, -INERTIA_MAX, INERTIA_MAX)
          : 0;
    } else {
      state.velocity *= Math.exp(-decay * dt);
    }

    state.offset += dragged;
    if (!state.dragging) state.offset += state.velocity * dt;
    if (!reduced) state.offset += speed * dt;

    for (let i = 0; i < meshes.current.length; i += 1) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const { angle, y } = placeSlot(
        i,
        state.offset,
        extent,
        count,
        layout.turns
      );
      mesh.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      mesh.rotation.y = angle;
    }
  });

  return (
    <>
      {materials.map((material, i) => (
        <mesh
          key={i}
          ref={(node) => {
            if (node) meshes.current[i] = node;
          }}
          geometry={geometry}
          material={material}
          visible={false}
        />
      ))}
    </>
  );
}

export interface HelixSliderProps {
  images?: string[];
  autoplaySpeed?: number;
  radius?: number;
  turns?: number;
  cardScale?: number;
  dragSensitivity?: number;
  /** Multiplier for how far each wheel/trackpad scroll spins the helix. */
  scrollIntensity?: number;
  inertiaDecay?: number;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function HelixSlider({
  images = DEFAULT_IMAGES,
  autoplaySpeed = 0.12,
  radius = 2.8,
  turns = 3.3,
  cardScale = 1,
  dragSensitivity = 0.006,
  scrollIntensity = 1,
  inertiaDecay = 2.2,
  background = "#0d0d0d",
  className,
  style,
}: HelixSliderProps) {
  const [reduced, setReduced] = useState(false);
  const [aspect, setAspect] = useState(16 / 9);
  const [viewWidth, setViewWidth] = useState(1440);
  const wrapper = useRef<HTMLDivElement>(null);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");

  // Suspend the render loop while the tab is hidden or the strand is
  // scrolled offscreen - the spiral autoplays continuously, so without this
  // it keeps drawing WebGL frames the viewer can't see.
  useEffect(() => {
    const gate = createVisibilityGate({
      root: wrapper,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) {
        setAspect(width / height);
        setViewWidth(width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const list = images.length ? images : DEFAULT_IMAGES;
  const layout = resolveLayout(viewWidth, turns, cardScale);
  const cameraZ = framingDistance(aspect, layout, radius);
  const extent = strandExtent(cameraZ, layout, radius);
  const count = strandCount(extent, layout);

  return (
    <div
      ref={wrapper}
      className={`relative h-[100svh] w-full overflow-hidden${
        className ? ` ${className}` : ""
      }`}
      style={{ background, ...style }}
    >
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, cameraZ] }}
        className="block h-full w-full cursor-grab touch-pan-y"
      >
        <Suspense fallback={null}>
          <Strand
            images={list}
            reduced={reduced}
            extent={extent}
            count={count}
            layout={layout}
            radius={radius}
            autoplaySpeed={autoplaySpeed}
            dragSensitivity={dragSensitivity}
            scrollIntensity={scrollIntensity}
            inertiaDecay={inertiaDecay}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
