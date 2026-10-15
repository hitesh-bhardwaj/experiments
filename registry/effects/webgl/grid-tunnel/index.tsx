// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { Preload, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

const TUNNEL_DEPTH = 90;
const TUNNEL_WIDTH = 18;
const TUNNEL_HEIGHT = 11;

const GRID_X = 8;
const GRID_Y = 5;
const GRID_Z = 36;

const VISIBLE_CHUNKS = 9;
const IMAGE_COUNT_PER_CHUNK = 50;

const CAMERA_START_Z = 18;
const TUNNEL_START_Z = 17;

const SCROLL_SPEED = 0.012;
const SCROLL_DAMPING = 7; // higher = stops sooner
const CAMERA_FOLLOW = 10; // higher = follows target more tightly
const MAX_SCROLL_VELOCITY = 2.0;

const DEFAULT_GRID_SIZE = 24;
const DEFAULT_DEPTH = 1000;
const DEFAULT_LINE_COLOR = "#9ca3af";
const DEFAULT_BACKGROUND_COLOR = "#ffffff";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return THREE.MathUtils.clamp(number, min, max);
}

function resolveTunnelConfig({
  gridSize = DEFAULT_GRID_SIZE,
  roundness = 0,
  speed = 1,
  depth = DEFAULT_DEPTH,
  lineColor = DEFAULT_LINE_COLOR,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: {
  gridSize?: number;
  roundness?: number;
  speed?: number;
  depth?: number;
  lineColor?: string;
  backgroundColor?: string;
}) {
  const resolvedGridSize = Math.round(
    clampNumber(gridSize, 6, 48, DEFAULT_GRID_SIZE)
  );
  const resolvedDepth = clampNumber(depth, 100, 3000, DEFAULT_DEPTH);

  return {
    gridX: Math.max(2, Math.round(resolvedGridSize / 3)),
    gridY: Math.max(2, Math.round(resolvedGridSize / 5)),
    gridZ: Math.max(8, Math.round(resolvedGridSize * 1.5)),
    tunnelDepth: TUNNEL_DEPTH,
    roundness: clampNumber(roundness, 0, 1, 0),
    scrollSpeed: SCROLL_SPEED * clampNumber(speed, 0, 5, 1),
    maxScrollVelocity: MAX_SCROLL_VELOCITY * Math.max(clampNumber(speed, 0, 5, 1), 0.2),
    lineColor: typeof lineColor === "string" && lineColor ? lineColor : DEFAULT_LINE_COLOR,
    backgroundColor:
      typeof backgroundColor === "string" && backgroundColor
        ? backgroundColor
        : DEFAULT_BACKGROUND_COLOR,
    fogFar: THREE.MathUtils.mapLinear(resolvedDepth, 100, 3000, 38, 180),
    cameraFar: Math.max(1000, resolvedDepth + 120),
  };
}

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

function Line({ points, color }: { points: [number, number, number][]; color: string }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints(points.map((p) => new THREE.Vector3(...p)));
    return g;
  }, [points]);

  // Geometry is created imperatively (not via JSX), so R3F won't auto-dispose
  // it. Release the GPU buffer on unmount to avoid leaking across remounts.
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <line {...({ geometry } as any)}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </line>
  );
}

// Only what the tunnel's geometry depends on. Kept separate from the camera
// config so changing speed/depth never rebuilds (and visibly re-lays out)
// the grid lines and image panels.
interface TunnelShape {
  gridX: number;
  gridY: number;
  gridZ: number;
  tunnelDepth: number;
  lineColor: string;
  roundness: number;
}

const RING_SEGMENTS = 96;
const PANEL_SEGMENTS = 12;
const PANEL_INSET = 0.035;

// Superellipse exponent for a roundness of 0-1: large = square corners,
// 2 = a full ellipse.
function roundnessExponent(roundness: number) {
  return THREE.MathUtils.lerp(30, 2, THREE.MathUtils.clamp(roundness, 0, 1));
}

// Radius of the fully rounded tunnel: a true circle (not an oval) with the
// same area as the rectangular cross-section.
const CIRCLE_RADIUS = Math.sqrt((TUNNEL_WIDTH / 2) * (TUNNEL_HEIGHT / 2));

// Half-extents blend from the rectangle's toward the circle's as roundness
// goes 0 -> 1, so full roundness is round in both axes.
function roundedExtents(roundness: number): [number, number] {
  const t = THREE.MathUtils.clamp(roundness, 0, 1);
  return [
    THREE.MathUtils.lerp(TUNNEL_WIDTH / 2, CIRCLE_RADIUS, t),
    THREE.MathUtils.lerp(TUNNEL_HEIGHT / 2, CIRCLE_RADIUS, t),
  ];
}

function superellipsePoint(theta: number, n: number, roundness: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const [hw, hh] = roundedExtents(roundness);
  return [
    Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * hw,
    Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * hh,
  ];
}

// Maps a point on the rectangular cross-section onto the rounded one (same
// direction from the centre), so grid lines and image panels bend together.
function roundPoint(x: number, y: number, roundness: number): [number, number] {
  if (roundness <= 0) return [x, y];
  const theta = Math.atan2(y / (TUNNEL_HEIGHT / 2), x / (TUNNEL_WIDTH / 2));
  return superellipsePoint(theta, roundnessExponent(roundness), roundness);
}

function GridChunkContent({ shape }: { shape: TunnelShape }) {
  const lines = useMemo(() => {
    const items: { points: [number, number, number][] }[] = [];

    const halfW = TUNNEL_WIDTH / 2;
    const halfH = TUNNEL_HEIGHT / 2;

    const cellW = TUNNEL_WIDTH / shape.gridX;
    const cellH = TUNNEL_HEIGHT / shape.gridY;
    const cellD = shape.tunnelDepth / shape.gridZ;
    const rounded = shape.roundness > 0;
    const n = roundnessExponent(shape.roundness);

    for (let zi = 0; zi <= shape.gridZ; zi++) {
      const z = -zi * cellD;

      if (rounded) {
        const ring: [number, number, number][] = [];
        for (let i = 0; i <= RING_SEGMENTS; i++) {
          const [x, y] = superellipsePoint((i / RING_SEGMENTS) * Math.PI * 2, n, shape.roundness);
          ring.push([x, y, z]);
        }
        items.push({ points: ring });
      } else {
        items.push(
          { points: [[-halfW, halfH, z], [halfW, halfH, z]] },
          { points: [[-halfW, -halfH, z], [halfW, -halfH, z]] },
          { points: [[-halfW, -halfH, z], [-halfW, halfH, z]] },
          { points: [[halfW, -halfH, z], [halfW, halfH, z]] }
        );
      }
    }

    const longitudinal = (x: number, y: number) => {
      const [rx, ry] = roundPoint(x, y, shape.roundness);
      items.push({ points: [[rx, ry, 0], [rx, ry, -TUNNEL_DEPTH]] });
    };

    for (let xi = 0; xi <= shape.gridX; xi++) {
      const x = -halfW + xi * cellW;
      longitudinal(x, halfH);
      longitudinal(x, -halfH);
    }

    for (let yi = 0; yi <= shape.gridY; yi++) {
      const y = -halfH + yi * cellH;
      longitudinal(-halfW, y);
      longitudinal(halfW, y);
    }

    return items;
  }, [shape]);

  return (
    <>
      {lines.map((line, index) => (
        <Line key={index} points={line.points} color={shape.lineColor} />
      ))}
    </>
  );
}

type PanelSide = 0 | 1 | 2 | 3; // left, right, bottom, top

interface PanelSpec {
  id: string;
  url: string;
  side: PanelSide;
  // Span across the cross-section (y for the side walls, x for floor/ceiling).
  a0: number;
  a1: number;
  zNear: number;
  zFar: number;
}

// A wall panel built directly in tunnel space (no rotation) so it can follow
// the rounded cross-section. UVs keep the same orientation the old flat
// drei <Image> planes had, and the texture is "cover"-fitted like they were.
function CurvedPanel({ panel, roundness }: { panel: PanelSpec; roundness: number }) {
  const source = useTexture(panel.url);

  const texture = useMemo(() => {
    const t = source.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;

    const img = source.image as { width?: number; height?: number } | undefined;
    const texAspect = img?.width && img?.height ? img.width / img.height : 1;
    const span = Math.abs(panel.a1 - panel.a0);
    const depth = Math.abs(panel.zNear - panel.zFar);
    const panelAspect = panel.side <= 1 ? depth / span : span / depth;

    if (texAspect > panelAspect) {
      t.repeat.set(panelAspect / texAspect, 1);
      t.offset.set((1 - t.repeat.x) / 2, 0);
    } else {
      t.repeat.set(1, texAspect / panelAspect);
      t.offset.set(0, (1 - t.repeat.y) / 2);
    }
    t.needsUpdate = true;
    return t;
  }, [source, panel]);

  const geometry = useMemo(() => {
    const halfW = TUNNEL_WIDTH / 2;
    const halfH = TUNNEL_HEIGHT / 2;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const cols = PANEL_SEGMENTS;

    for (let j = 0; j <= 1; j++) {
      const z = j === 0 ? panel.zNear : panel.zFar;
      for (let i = 0; i <= cols; i++) {
        const t = i / cols;
        const a = THREE.MathUtils.lerp(panel.a0, panel.a1, t);

        let x: number;
        let y: number;
        if (panel.side === 0) { x = -halfW; y = a; }
        else if (panel.side === 1) { x = halfW; y = a; }
        else if (panel.side === 2) { x = a; y = -halfH; }
        else { x = a; y = halfH; }

        let [rx, ry] = roundPoint(x, y, roundness);
        const len = Math.hypot(rx, ry) || 1;
        const k = 1 - PANEL_INSET / len;
        rx *= k;
        ry *= k;
        positions.push(rx, ry, z);

        const zt = j; // 0 = near, 1 = far
        let u: number;
        let v: number;
        if (panel.side === 0) { u = zt; v = t; }
        else if (panel.side === 1) { u = 1 - zt; v = t; }
        else if (panel.side === 2) { u = t; v = zt; }
        else { u = t; v = 1 - zt; }
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < cols; i++) {
      const a = i;
      const b = i + 1;
      const c = i + cols + 1;
      const d = i + cols + 2;
      indices.push(a, c, b, b, c, d);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    return g;
  }, [panel, roundness]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

// One image failing to load (network/proxy hiccup) must only drop that
// panel - without this, the loader error takes down the whole canvas.
class PanelErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ImageChunkContent({ images, slotIndex, shape }: { images: string[]; slotIndex: number; shape: TunnelShape }) {
  const { viewport, size } = useThree();
  const canvasWidth = size?.width ?? 0;
  const { gridX, gridY, gridZ, tunnelDepth } = shape;

  const panels = useMemo(() => {
    const random = seededRandom(200 + slotIndex * 13);

    const halfW = TUNNEL_WIDTH / 2;
    const halfH = TUNNEL_HEIGHT / 2;

    const cellW = TUNNEL_WIDTH / gridX;
    const cellH = TUNNEL_HEIGHT / gridY;
    const cellD = tunnelDepth / gridZ;

    const pxToWorld = canvasWidth ? viewport.width / canvasWidth : 0.01;

    // Reduce padding on smaller screens so images read larger on mobile.
    const paddingPx = canvasWidth
      ? canvasWidth < 640
        ? 4
        : canvasWidth < 1024
          ? 8
          : 10
      : 10;
    const pad = Math.min(pxToWorld * paddingPx, Math.min(cellW, cellH, cellD) * 0.3);

    return Array.from({ length: IMAGE_COUNT_PER_CHUNK }).map((_, i): PanelSpec => {
      const side = Math.floor(random() * 4) as PanelSide;
      const zi = Math.floor(random() * (gridZ - 2));
      const zNear = -zi * cellD - pad;
      const zFar = -(zi + 1) * cellD + pad;

      let a0: number;
      let a1: number;
      if (side <= 1) {
        const yi = Math.floor(random() * gridY);
        a0 = -halfH + yi * cellH + pad;
        a1 = -halfH + (yi + 1) * cellH - pad;
      } else {
        const xi = Math.floor(random() * gridX);
        a0 = -halfW + xi * cellW + pad;
        a1 = -halfW + (xi + 1) * cellW - pad;
      }

      return {
        id: `${slotIndex}-${i}`,
        url: images[(slotIndex * IMAGE_COUNT_PER_CHUNK + i) % images.length],
        side,
        a0,
        a1,
        zNear,
        zFar,
      };
    });
  }, [canvasWidth, gridX, gridY, gridZ, tunnelDepth, images, slotIndex, viewport.width]);

  return (
    <>
      {panels.map((panel) => (
        <PanelErrorBoundary key={panel.id}>
          <Suspense fallback={null}>
            <CurvedPanel panel={panel} roundness={shape.roundness} />
          </Suspense>
        </PanelErrorBoundary>
      ))}
    </>
  );
}

function TunnelChunk({ images, slotIndex, shape }: { images: string[]; slotIndex: number; shape: TunnelShape }) {
  const group = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  const initialZ = TUNNEL_START_Z - slotIndex * shape.tunnelDepth;
  const totalLoopDepth = shape.tunnelDepth * VISIBLE_CHUNKS;

  useFrame(() => {
    if (!group.current) return;

    const chunk = group.current;
    const cameraZ = camera.position.z;

    // Keep each chunk positioned near the camera using a stable wrap calculation.
    // This avoids visible"pops" when a chunk is recycled.
    const loops = Math.round((cameraZ - initialZ) / totalLoopDepth);
    const nextZ = initialZ + loops * totalLoopDepth;

    // Only apply when it meaningfully changes to avoid tiny float churn.
    if (Math.abs(chunk.position.z - nextZ) > 0.0001) {
      chunk.position.z = nextZ;
    }
  });

  return (
    <group ref={group} position={[0, 0, initialZ]}>
      <GridChunkContent shape={shape} />
      <ImageChunkContent images={images} slotIndex={slotIndex} shape={shape} />
    </group>
  );
}

function InfiniteTunnelWorld({ images, shape }: { images: string[]; shape: TunnelShape }) {
  const chunks = useMemo(() => {
    return Array.from({ length: VISIBLE_CHUNKS }, (_, i) => i);
  }, []);

  return (
    <>
      {chunks.map((slotIndex) => (
        <TunnelChunk key={slotIndex} images={images} slotIndex={slotIndex} shape={shape} />
      ))}
    </>
  );
}

function InfiniteScrollCamera({ config }: { config: ReturnType<typeof resolveTunnelConfig> }) {
  const { camera } = useThree();
  const cameraRef = useRef<THREE.Camera | null>(null);
  const targetZ = useRef(CAMERA_START_Z);
  const scrollVelocity = useRef(0);
  const reduceMotionRef = useRef(
    Boolean(
      typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    )
  );
  const touchState = useRef({
    active: false,
    lastY: 0,
  });

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    if (config.scrollSpeed > 0) return;
    scrollVelocity.current = 0;
    if (cameraRef.current) {
      targetZ.current = cameraRef.current.position.z;
    }
  }, [config.scrollSpeed]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
      if (event.matches) {
        scrollVelocity.current = 0;
      }
    };

    reduceMotionRef.current = mq.matches;
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const applyDelta = (delta: number) => {
      if (reduceMotionRef.current) {
        // Reduced-motion: move instantly - no velocity coast.
        scrollVelocity.current = 0;
        targetZ.current += delta;
      } else {
        scrollVelocity.current += delta;
        scrollVelocity.current = THREE.MathUtils.clamp(
          scrollVelocity.current,
          -config.maxScrollVelocity,
          config.maxScrollVelocity
        );
      }

      if (targetZ.current > CAMERA_START_Z) {
        targetZ.current = CAMERA_START_Z;
        scrollVelocity.current = 0;
      }
    };

    const preventPageScroll = (event: WheelEvent) => {
      event.preventDefault();
      applyDelta(-event.deltaY * config.scrollSpeed);
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches?.[0];
      if (!touch) return;
      touchState.current.active = true;
      touchState.current.lastY = touch.clientY;
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches?.[0];
      if (!touch || !touchState.current.active) return;

      event.preventDefault();

      const deltaY = touch.clientY - touchState.current.lastY;
      touchState.current.lastY = touch.clientY;

      applyDelta(deltaY * config.scrollSpeed);
    };

    const onTouchEnd = () => {
      touchState.current.active = false;
    };

    window.addEventListener("wheel", preventPageScroll, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("wheel", preventPageScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [config]);

  const [initialFrameTime] = useState(() =>
    typeof performance !== "undefined" ? performance.now() : 0
  );
  const lastFrameTimeRef = useRef(initialFrameTime);

  useFrame((_, delta) => {
    const cam = cameraRef.current;
    if (!cam) return;

    cam.position.x = 0;
    cam.position.y = 0;

    // The canvas' frameloop is suspended while the tab is hidden or the
    // effect is offscreen (see createVisibilityGate below), which pauses
    // this callback entirely. THREE's clock keeps real wall-clock time
    // while paused, so the first frame after resuming can report a delta
    // of several seconds. Detect that gap directly (independent of R3F's
    // own delta) and resync state instead of letting a stale/huge delta
    // feed into the lerp math below and displace the camera.
    const now = typeof performance !== "undefined" ? performance.now() : 0;
    const wallClockGap = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    const resumedFromPause = wallClockGap > 250;

    if (reduceMotionRef.current) {
      // Snap camera to target - no inertia / follow lerp.
      scrollVelocity.current = 0;
      if (resumedFromPause) {
        // Camera position didn't move while paused - keep the target in
        // sync with it so we don't re-apply any stale offset in one jump.
        targetZ.current = cam.position.z;
      }
      if (targetZ.current > CAMERA_START_Z) {
        targetZ.current = CAMERA_START_Z;
      }
      cam.position.z = targetZ.current;
      cam.lookAt(0, 0, cam.position.z - 12);
      return;
    }

    if (resumedFromPause) {
      scrollVelocity.current = 0;
      targetZ.current = cam.position.z;
      cam.lookAt(0, 0, cam.position.z - 12);
      return;
    }

    // Decay velocity so the tunnel eases out after scrolling stops.
    const damping = Math.exp(-SCROLL_DAMPING * delta);
    scrollVelocity.current *= damping;

    // Integrate velocity into the target.
    targetZ.current += scrollVelocity.current;

    // Clamp start (no"pulling" past the start).
    if (targetZ.current > CAMERA_START_Z) {
      targetZ.current = CAMERA_START_Z;
      scrollVelocity.current = 0;
    }

    // Frame-rate independent follow lerp.
    const follow = 1 - Math.exp(-CAMERA_FOLLOW * delta);
    cam.position.z = THREE.MathUtils.lerp(
      cam.position.z,
      targetZ.current,
      follow
    );

    cam.lookAt(0, 0, cam.position.z - 12);
  });

  return null;
}

function Scene({ images, config }: { images: string[]; config: ReturnType<typeof resolveTunnelConfig> }) {
  const { gridX, gridY, gridZ, tunnelDepth, lineColor, roundness } = config;
  const shape = useMemo<TunnelShape>(
    () => ({ gridX, gridY, gridZ, tunnelDepth, lineColor, roundness }),
    [gridX, gridY, gridZ, tunnelDepth, lineColor, roundness]
  );

  return (
    <>
      <color attach="background" args={[config.backgroundColor]} />
      <fog attach="fog" args={[config.backgroundColor, 22, config.fogFar]} />

      <ambientLight intensity={2.4} />

      <InfiniteScrollCamera config={config} />
      <InfiniteTunnelWorld images={images} shape={shape} />
    </>
  );
}

function FooterMark() {
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-20 text-xs font-medium text-neutral-400">
      © 2026 Hyperiux.
    </div>
  );
}

interface GridTunnelCompProps {
  images?: string[];
  /** Number of grid cells (density of the tunnel grid). */
  numberOfGrids?: number;
  /** Tunnel cross-section. "circle" curves the grid and the images with it. */
  shape?: "rectangle" | "circle";
  speed?: number;
  depth?: number;
  lineColor?: string;
  backgroundColor?: string;
}

const FALLBACK_IMAGES = [
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
    "https://picsum.photos/seed/v01/1600/1200",
    "https://picsum.photos/seed/v02/1600/1200",
    "https://picsum.photos/seed/v03/1600/1200",
    "https://picsum.photos/seed/v04/1600/1200",
    "https://picsum.photos/seed/v05/1600/1200",
    "https://picsum.photos/seed/v06/1600/1200",
    "https://picsum.photos/seed/v07/1600/1200",
    "https://picsum.photos/seed/v08/1600/1200",
    "https://picsum.photos/seed/v09/1600/1200",
    "https://picsum.photos/seed/v10/1600/1200",
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
    "https://picsum.photos/seed/v01/1600/1200",
    "https://picsum.photos/seed/v02/1600/1200",
    "https://picsum.photos/seed/v03/1600/1200",
    "https://picsum.photos/seed/v04/1600/1200",
    "https://picsum.photos/seed/v05/1600/1200",
    "https://picsum.photos/seed/v06/1600/1200",
    "https://picsum.photos/seed/v07/1600/1200",
    "https://picsum.photos/seed/v08/1600/1200",
    "https://picsum.photos/seed/v09/1600/1200",
    "https://picsum.photos/seed/v10/1600/1200",
];

function GridTunnelComp({
  images = [],
  numberOfGrids = DEFAULT_GRID_SIZE,
  shape = "rectangle",
  speed = 1,
  depth = DEFAULT_DEPTH,
  lineColor = DEFAULT_LINE_COLOR,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: GridTunnelCompProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const config = useMemo(
    () =>
      resolveTunnelConfig({
        gridSize: numberOfGrids,
        roundness: shape === "circle" ? 1 : 0,
        speed,
        depth,
        lineColor,
        backgroundColor,
      }),
    [backgroundColor, depth, numberOfGrids, shape, lineColor, speed]
  );
  // Validate image URLs on the client before passing to the three.js Image loader.
  // This prevents CORS/network failures from flooding the loader with bad URLs.
  const [validatedImages, setValidatedImages] = useState<string[]>([]);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  useEffect(() => {
    let mounted = true;
    const list = images && images.length > 0 ? images : FALLBACK_IMAGES;

    const validateUrl = (url: string): Promise<{ ok: boolean, url: string }> =>
      new Promise((res) => {
        try {
          const img = new window.Image();
          // Attempt anonymous CORS fetch so we can detect CORS failures.
          img.crossOrigin = "anonymous";

          let settled = false;
          const onSuccess = () => {
            if (settled) return;
            settled = true;
            cleanup();
            res({ ok: true, url });
          };
          const onFail = () => {
            if (settled) return;
            settled = true;
            cleanup();
            res({ ok: false, url });
          };

          const timeout = setTimeout(onFail, 8000);
          const cleanup = () => {
            clearTimeout(timeout);
            img.onload = null;
            img.onerror = null;
          };

          img.onload = onSuccess;
          img.onerror = onFail;
          img.src = url;
        } catch {
          res({ ok: false, url });
        }
      });

    (async () => {
      try {
        const results = await Promise.allSettled(list.map((u) => validateUrl(u)));
        const valids = (
          results.filter((r) => r.status === "fulfilled" && r.value && r.value.ok) as PromiseFulfilledResult<{ ok: boolean, url: string }>[]
        ).map((r) => r.value.url);

        if (!mounted) return;
        setValidatedImages(valids);
      } finally {
        if (mounted) setValidating(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [images]);

  const imageList = !validating && validatedImages && validatedImages.length > 0 ? validatedImages : images.length > 0 ? images : FALLBACK_IMAGES;

  return (
    <section
      ref={rootRef}
      className="relative h-screen w-full overflow-hidden"
      style={{ backgroundColor: config.backgroundColor }}
    >
      <Canvas
        aria-hidden="true"
        frameloop={frameloop}
        camera={{
          position: [0, 0, CAMERA_START_Z],
          fov: 72,
          near: 0.1,
          far: config.cameraFar,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          // Avoid a black flash on reload before the scene background is applied.
          gl.setClearColor(config.backgroundColor, 1);
        }}
      >
        <Scene images={imageList} config={config} />
        <Preload all />
      </Canvas>
       <FooterMark />

    </section>
  );
}

// Images load straight from the Vault asset bucket. It serves
// Access-Control-Allow-Origin: *, so they work as WebGL textures with
// crossOrigin="anonymous" - no proxy route or next.config needed.
const imageUrl = (seed: string, portrait = false) =>
  `https://picsum.photos/seed/assetsimages-${seed}/${portrait ? "1200/1600" : "1600/1200"}`;

const defaultImages = [
  imageUrl("h-01"),
  imageUrl("h-02"),
  imageUrl("h-03"),
  imageUrl("h-05"),
  imageUrl("h-06"),
  imageUrl("h-07"),
  imageUrl("h-08"),
  imageUrl("h-09"),
  imageUrl("h-10"),
  imageUrl("h-11"),
  imageUrl("h-12"),
  imageUrl("h-13"),
  imageUrl("h-14"),
  imageUrl("h-15"),
  imageUrl("v-01", true),
  imageUrl("v-02", true),
  imageUrl("v-03", true),
  imageUrl("v-04", true),
  imageUrl("v-05", true),
  imageUrl("v-06", true),
  imageUrl("v-07", true),
  imageUrl("v-08", true),
  imageUrl("v-09", true),
  imageUrl("v-10", true),
  imageUrl("h-01"),
  imageUrl("h-02"),
  imageUrl("h-03"),
  imageUrl("h-05"),
  imageUrl("h-06"),
  imageUrl("h-07"),
  imageUrl("h-08"),
  imageUrl("h-09"),
  imageUrl("h-10"),
  imageUrl("h-11"),
  imageUrl("h-12"),
  imageUrl("h-13"),
  imageUrl("h-14"),
  imageUrl("h-15"),
  imageUrl("v-01", true),
  imageUrl("v-02", true),
  imageUrl("v-03", true),
  imageUrl("v-04", true),
  imageUrl("v-05", true),
  imageUrl("v-06", true),
  imageUrl("v-07", true),
  imageUrl("v-08", true),
  imageUrl("v-09", true),
  imageUrl("v-10", true),
];

const GridTunnel = ({
  images = defaultImages,
  numberOfGrids = 24,
  shape = "rectangle" as "rectangle" | "circle",
  speed = 1,
  depth = 1000,
  lineColor = "#9ca3af",
  backgroundColor = "#ffffff",
}) => {
  return (
   <GridTunnelComp
     images={images}
     numberOfGrids={numberOfGrids}
     shape={shape}
     speed={speed}
     depth={depth}
     lineColor={lineColor}
     backgroundColor={backgroundColor}
   />
  )
}

export default GridTunnel
