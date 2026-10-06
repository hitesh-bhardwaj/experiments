"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const COUNT = 30; // at base extent; scales with it
const RADIUS = 2.8;
const TURNS = 3.3; // across whole strand

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

const DRAG_SENSITIVITY = 0.006;
const SCROLL_SENSITIVITY = 0.001;
const INERTIA_DECAY = 2.2; // higher = stops sooner
const INERTIA_MAX = 6;
const AUTOPLAY = 0.12; // idle drift

// Share of the frame width the ring spans: desktop's value, easing up toward
// WIDE on portrait screens where a fixed share would leave the ring stranded.
const RING_WIDTH_RATIO = 0.64;
const RING_WIDTH_NARROW = 0.92;

const FOV = 40;
const MIN_CAMERA_Z = 9.9;
const TEXTURE_WIDTH = 720;
const FADE_DURATION = 700;
const FADE_STAGGER = 30;

const GRABBING_CLASS = "rg_grabbing";
const CANVAS_STYLE = `.rg_canvas{cursor:grab;touch-action:pan-y}.rg_canvas.${GRABBING_CLASS}{cursor:grabbing}`;

const DEFAULT_IMAGES = [
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg",


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

// Pull back so the helix fits
type Layout = {
  turns: number;
  planeW: number;
  planeH: number;
  gap: number;
  ySpacing: number;
};

function resolveLayout(width: number): Layout {
  const compact = width > 0 && width < COMPACT_BREAKPOINT;
  const scale = compact ? COMPACT_PLANE_SCALE : 1;
  return {
    turns: compact ? COMPACT_TURNS : TURNS,
    planeW: PLANE_W * scale,
    planeH: PLANE_H * scale,
    gap: compact ? COMPACT_GAP : 0,
    ySpacing: compact ? COMPACT_Y_SPACING : 1,
  };
}

function framingDistance(aspect: number, layout: Layout) {
  const vFov = (FOV * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  // Hold the ring at the same share of the frame width it has on desktop, so
  // narrow views read as the same composition rather than a zoomed-in one.
  const ratio = THREE.MathUtils.lerp(
    RING_WIDTH_NARROW,
    RING_WIDTH_RATIO,
    THREE.MathUtils.clamp((aspect - 0.5) / 1.0, 0, 1)
  );
  const fitWidth = (RADIUS + layout.planeW / 2) / ratio / Math.tan(hFov / 2);
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
function strandExtent(distance: number, layout: Layout) {
  const vFov = (FOV * Math.PI) / 180;
  const visible = 2 * Math.tan(vFov / 2) * (distance + RADIUS);
  return Math.max(HEIGHT, visible + layout.planeH * 2) * layout.ySpacing;
}

function Strand({
  images,
  reduced,
  extent,
  count,
  layout,
}: {
  images: string[];
  reduced: boolean;
  extent: number;
  count: number;
  layout: Layout;
}) {
  const { gl } = useThree();
  const motion = useRef<Motion>(createMotion());
  const meshes = useRef<THREE.Mesh[]>([]);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(layout.planeW, layout.planeH),
    [layout.planeW, layout.planeH]
  );

  // Start black until decoded
  const materials = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        m.color.setScalar(0);
        return m;
      }),
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

  useEffect(() => {
    if (!images.length) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const started = performance.now();

    materials.forEach((material, i) => {
      const url = images[i % images.length];
      // Far planes reveal first
      const order = count - 1 - i;

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
            console.error(`RotatingGallery: failed to load image ${url}`, error);
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
    };

    const wheel = (e: WheelEvent) => {
      if (reduced) return;
      state.velocity = THREE.MathUtils.clamp(
        state.velocity + e.deltaY * SCROLL_SENSITIVITY,
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
    };
  }, [gl, motion, reduced]);

  useFrame((_, delta) => {
    const state = motion.current;
    const dt = Math.min(delta, 0.1);

    const dragged = state.pending * DRAG_SENSITIVITY;
    state.pending = 0;

    if (state.dragging) {
      // Track drag for throw
      state.velocity =
        dt > 0
          ? THREE.MathUtils.clamp(dragged / dt, -INERTIA_MAX, INERTIA_MAX)
          : 0;
    } else {
      state.velocity *= Math.exp(-INERTIA_DECAY * dt);
    }

    state.offset += dragged;
    if (!state.dragging) state.offset += state.velocity * dt;
    if (!reduced) state.offset += AUTOPLAY * dt;

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
      mesh.position.set(Math.sin(angle) * RADIUS, y, Math.cos(angle) * RADIUS);
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

export interface RotatingGalleryProps {
  images?: string[];
  // Pass null to hide
  hint?: string | null;
  background?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function RotatingGallery({
  images = DEFAULT_IMAGES,
  hint = "Drag to explore",
  background = "#0d0d0d",
  className,
  style,
}: RotatingGalleryProps) {
  const [reduced, setReduced] = useState(false);
  const [aspect, setAspect] = useState(16 / 9);
  const [viewWidth, setViewWidth] = useState(1440);
  const wrapper = useRef<HTMLDivElement>(null);

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
  const layout = resolveLayout(viewWidth);
  const cameraZ = framingDistance(aspect, layout);
  const extent = strandExtent(cameraZ, layout);
  const count = strandCount(extent, layout);

  return (
    <div
      ref={wrapper}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100svh",
        background,
        overflow: "hidden",
        ...style,
      }}
    >
      <style>{CANVAS_STYLE}</style>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, cameraZ] }}
        className="rg_canvas"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <Suspense fallback={null}>
          <Strand
            images={list}
            reduced={reduced}
            extent={extent}
            count={count}
            layout={layout}
          />
        </Suspense>
      </Canvas>

      {hint ? (
        <span
          style={{
            position: "absolute",
            left: "clamp(16px, 3vw, 40px)",
            bottom: "clamp(16px, 4vh, 40px)",
            font: "400 14px/1 ui-sans-serif, system-ui, sans-serif",
            color: "rgba(255,255,255,0.75)",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  );
}
