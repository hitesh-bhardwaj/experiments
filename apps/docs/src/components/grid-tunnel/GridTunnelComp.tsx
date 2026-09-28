"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Image, Preload } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createVisibilityGate } from "./createSuspendedRaf";

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
  speed = 1,
  depth = DEFAULT_DEPTH,
  lineColor = DEFAULT_LINE_COLOR,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: {
  gridSize?: number;
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

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
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

function GridChunkContent({ config }: { config: ReturnType<typeof resolveTunnelConfig> }) {
  const lines = useMemo(() => {
    const items: { points: [number, number, number][] }[] = [];

    const halfW = TUNNEL_WIDTH / 2;
    const halfH = TUNNEL_HEIGHT / 2;

    const cellW = TUNNEL_WIDTH / config.gridX;
    const cellH = TUNNEL_HEIGHT / config.gridY;
    const cellD = config.tunnelDepth / config.gridZ;

    for (let zi = 0; zi <= config.gridZ; zi++) {
      const z = -zi * cellD;

      items.push(
        { points: [[-halfW, halfH, z], [halfW, halfH, z]] },
        { points: [[-halfW, -halfH, z], [halfW, -halfH, z]] },
        { points: [[-halfW, -halfH, z], [-halfW, halfH, z]] },
        { points: [[halfW, -halfH, z], [halfW, halfH, z]] }
      );
    }

    for (let xi = 0; xi <= config.gridX; xi++) {
      const x = -halfW + xi * cellW;

      items.push(
        { points: [[x, halfH, 0], [x, halfH, -TUNNEL_DEPTH]] },
        { points: [[x, -halfH, 0], [x, -halfH, -TUNNEL_DEPTH]] }
      );
    }

    for (let yi = 0; yi <= config.gridY; yi++) {
      const y = -halfH + yi * cellH;

      items.push(
        { points: [[-halfW, y, 0], [-halfW, y, -TUNNEL_DEPTH]] },
        { points: [[halfW, y, 0], [halfW, y, -TUNNEL_DEPTH]] }
      );
    }

    return items;
  }, [config]);

  return (
    <>
      {lines.map((line, index) => (
        <Line key={index} points={line.points} color={config.lineColor} />
      ))}
    </>
  );
}

function ImageChunkContent({ images, slotIndex, config }: { images: string[]; slotIndex: number; config: ReturnType<typeof resolveTunnelConfig> }) {
  const { viewport, size } = useThree();
  const canvasWidth = size?.width ?? 0;

  const panels = useMemo(() => {
    const random = seededRandom(200 + slotIndex * 13);

    const halfW = TUNNEL_WIDTH / 2;
    const halfH = TUNNEL_HEIGHT / 2;

    const cellW = TUNNEL_WIDTH / config.gridX;
    const cellH = TUNNEL_HEIGHT / config.gridY;
    const cellD = config.tunnelDepth / config.gridZ;

    const pxToWorld = canvasWidth ? viewport.width / canvasWidth : 0.01;

    // Reduce padding on smaller screens so images read larger on mobile.
    const paddingPx = canvasWidth
      ? canvasWidth < 640
        ? 4
        : canvasWidth < 1024
          ? 8
          : 10
      : 10;
    const paddingWorld = pxToWorld * paddingPx;

    return Array.from({ length: IMAGE_COUNT_PER_CHUNK }).map((_, i) => {
      const side = Math.floor(random() * 4);
      const zi = Math.floor(random() * (config.gridZ - 2));

      let position: [number, number, number] = [0, 0, 0];
      let rotation: [number, number, number] = [0, 0, 0];
      let scale: [number, number, number] = [1, 1, 1];

      if (side === 0) {
        const yi = Math.floor(random() * config.gridY);
        const y = -halfH + yi * cellH + cellH / 2;
        const z = -zi * cellD - cellD / 2;

        position = [-halfW + 0.035, y, z];
        rotation = [0, Math.PI / 2, 0];

        scale = [
          Math.max(cellD - paddingWorld * 2, 0.2),
          Math.max(cellH - paddingWorld * 2, 0.2),
          1,
        ];
      }

      if (side === 1) {
        const yi = Math.floor(random() * config.gridY);
        const y = -halfH + yi * cellH + cellH / 2;
        const z = -zi * cellD - cellD / 2;

        position = [halfW - 0.035, y, z];
        rotation = [0, -Math.PI / 2, 0];

        scale = [
          Math.max(cellD - paddingWorld * 2, 0.2),
          Math.max(cellH - paddingWorld * 2, 0.2),
          1,
        ];
      }

      if (side === 2) {
        const xi = Math.floor(random() * config.gridX);
        const x = -halfW + xi * cellW + cellW / 2;
        const z = -zi * cellD - cellD / 2;

        position = [x, -halfH + 0.035, z];
        rotation = [-Math.PI / 2, 0, 0];

        scale = [
          Math.max(cellW - paddingWorld * 2, 0.2),
          Math.max(cellD - paddingWorld * 2, 0.2),
          1,
        ];
      }

      if (side === 3) {
        const xi = Math.floor(random() * config.gridX);
        const x = -halfW + xi * cellW + cellW / 2;
        const z = -zi * cellD - cellD / 2;

        position = [x, halfH - 0.035, z];
        rotation = [Math.PI / 2, 0, 0];

        scale = [
          Math.max(cellW - paddingWorld * 2, 0.2),
          Math.max(cellD - paddingWorld * 2, 0.2),
          1,
        ];
      }

      return {
        id: `${slotIndex}-${i}`,
        url: images[(slotIndex * IMAGE_COUNT_PER_CHUNK + i) % images.length],
        position,
        rotation,
        scale,
      };
    });
  }, [canvasWidth, config, images, slotIndex, viewport.width]);

  return (
    <>
      {panels.map((panel) => (
        <Suspense key={panel.id} fallback={null}>
          <Image
            alt="panel"
            {...({
              url: panel.url,
              position: panel.position,
              rotation: panel.rotation,
              scale: panel.scale,
              toneMapped: false,
            } as any)}
          />
        </Suspense>
      ))}
    </>
  );
}

function TunnelChunk({ images, slotIndex, config }: { images: string[]; slotIndex: number; config: ReturnType<typeof resolveTunnelConfig> }) {
  const group = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  const initialZ = TUNNEL_START_Z - slotIndex * config.tunnelDepth;
  const totalLoopDepth = config.tunnelDepth * VISIBLE_CHUNKS;

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
      <GridChunkContent config={config} />
      <ImageChunkContent images={images} slotIndex={slotIndex} config={config} />
    </group>
  );
}

function InfiniteTunnelWorld({ images, config }: { images: string[]; config: ReturnType<typeof resolveTunnelConfig> }) {
  const chunks = useMemo(() => {
    return Array.from({ length: VISIBLE_CHUNKS }, (_, i) => i);
  }, []);

  return (
    <>
      {chunks.map((slotIndex) => (
        <TunnelChunk key={slotIndex} images={images} slotIndex={slotIndex} config={config} />
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
  return (
    <>
      <color attach="background" args={[config.backgroundColor]} />
      <fog attach="fog" args={[config.backgroundColor, 22, config.fogFar]} />

      <ambientLight intensity={2.4} />

      <InfiniteScrollCamera config={config} />
      <InfiniteTunnelWorld images={images} config={config} />
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
  gridSize?: number;
  speed?: number;
  depth?: number;
  lineColor?: string;
  backgroundColor?: string;
}

const FALLBACK_IMAGES = [
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
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-10.jpg",
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
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-10.jpg",
];

export default function GridTunnelComp({
  images = [],
  gridSize = DEFAULT_GRID_SIZE,
  speed = 1,
  depth = DEFAULT_DEPTH,
  lineColor = DEFAULT_LINE_COLOR,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
}: GridTunnelCompProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const reducedMotion = usePrefersReducedMotion();
  const config = useMemo(
    () =>
      resolveTunnelConfig({
        gridSize,
        speed,
        depth,
        lineColor,
        backgroundColor,
      }),
    [backgroundColor, depth, gridSize, lineColor, speed]
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

      {reducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute bottom-6 right-6 z-40 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-white p-6 text-center shadow-sm"
        >
          <h2 className="text-[1.15vw] max-[1025px]:text-[2vw] max-md:text-[3.5vw] leading-none text-black">
            Tunnel navigation is instant.
          </h2>
          <p className="mx-auto mt-4 text-sm leading-6 text-black">
            Reduced motion is enabled: scroll and touch move the camera
            directly with no momentum or easing, instead of coasting
            smoothly through the tunnel.
          </p>
        </div>
      )}
    </section>
  );
}
