"use client";

// Consolidated from what used to be 8 files (HyperiuxLogo.jsx,
// CubeParticlesModel.jsx, InteractiveParticles.jsx, FloatingCubes.jsx,
// CubeVisual.jsx, CameraShakeOnHold.jsx, HoldCursorIndicator.jsx,
// utils/snapToGrid.js) into this one - only ever imported from one place
// (extras/hyperiux-logo/page.js), so the split bought no real reuse.
//
// Dead code removed while merging (verified unused in every caller, no
// behavior change):
//   - CubeParticlesModel's centerCubeScaleMin/middleBridgeScaleMin/
//     middleBridgeXInfluence/middleBridgeYInfluence/edgeOutwardBias/
//     edgeJitter/surfaceJitter props - never read in its body.
//   - holdShakeAmount/holdShakeSpeed threaded onto CubeParticlesModel, but
//     the pass-through to InteractiveParticles was already commented out -
//     InteractiveParticles' own defaults were the only values ever in
//     effect, so the outer props did nothing.
//   - holdProgress threaded down to InteractiveParticles, which computes
//     its own local `holdProgress` from holdStartTime and never reads the
//     prop - dead on arrival.
//   - deterministicNoise was defined identically in both FloatingCubes and
//     InteractiveParticles; now one shared copy.
//
// One real fix made in passing (not just a deletion):
//   - CubeParticlesModel never forwarded holdStartTime/holdTriggerDuration
//     to InteractiveParticles, so InteractiveParticles' holdStartTime prop
//     silently sat at its own default (0) - the `isHolding && holdStartTime
//     > 0` guard was therefore always false, and the intended
//     Math.pow(holdProgress, 0.55) shake escalation while holding never
//     actually ran (it always computed as if holdProgress were 0). Now
//     wired through, so the shake genuinely intensifies the longer you hold.

import {
  Component,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

// particleData below fires hundreds of THREE.Raycaster casts against the
// model's geometry to sample its silhouette. THREE's default raycast is a
// linear scan over every triangle per ray - fine for the ~low-poly hyperiux
// logo mesh, but a dense scan/CAD-style model (e.g. a 100k+ vertex dental
// model) turns that into tens of millions of triangle tests and freezes the
// tab. Patching in three-mesh-bvh's accelerated raycast (O(log n) via a
// bounding-volume hierarchy) makes it fast regardless of mesh density; it's
// a no-op for meshes that never get a bounds tree computed on them.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function snapToGrid(v: THREE.Vector3, grid: number) {
  return new THREE.Vector3(
    Math.round(v.x / grid) * grid,
    Math.round(v.y / grid) * grid,
    Math.round(v.z / grid) * grid
  );
}

// Cheap, deterministic pseudo-random value in [0, 1) from a 3D seed - used
// everywhere here instead of Math.random() so particle layouts/floating
// cube paths stay stable across re-renders instead of reshuffling.
function deterministicNoise(x: number, y: number, z: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  const solveCurveX = (x: number) => {
    let t2 = x;

    for (let i = 0; i < 8; i++) {
      const x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) return t2;
      const d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 -= x2 / d2;
    }

    let t0 = 0;
    let t1 = 1;
    t2 = x;

    while (t0 < t1) {
      const x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-6) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
  };

  return (x: number) => sampleCurveY(solveCurveX(x));
}

const explosionEase = cubicBezierEase(0, 0.94, 0.51, 0.96);
const reformEase = cubicBezierEase(0.54, 0.05, 0.66, 0.72);

type ParticleDatum = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

type ActionPhase = "idle" | "holding" | "exploding" | "reforming";

// ---------------------------------------------------------------------------
// CubeVisual - the actual cube mesh (face + textured overlay + outline)
// shared by both the floating background cubes and the interactive particles
// ---------------------------------------------------------------------------

type CubeVisualProps = {
  texture: THREE.Texture;
  faceColor?: string;
  outlineColor?: string;
  sphere?: boolean;
};

// Memoized - there can be 800+ of these on screen (one per interactive
// particle, plus the floating background cubes), and every re-render of an
// ancestor (e.g. HyperiuxLogo on every hold/explode/reform phase change)
// would otherwise re-run all of their React function bodies for no visual
// change, since the actual per-frame position/rotation/scale updates happen
// imperatively via refs in the parent's useFrame, not through props here.
const CubeVisual = memo(function CubeVisual({
  texture,
  faceColor = "#1a1a1a",
  outlineColor = "#ffffff",
  sphere = false,
}: CubeVisualProps) {
  // A sphere has no flat faces, so EdgesGeometry (which keeps only edges
  // between faces whose normals differ past an angle threshold) either
  // draws almost every segment boundary or almost none, depending on
  // segment count - not a clean outline. WireframeGeometry (every triangle
  // edge, unconditionally) gives a predictable lat/long wireframe-globe
  // look instead.
  const outlineGeometry = useMemo(() => {
    if (sphere) {
      return new THREE.WireframeGeometry(new THREE.SphereGeometry(0.5, 12, 8));
    }
    return new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
  }, [sphere]);

  const configuredTexture = useMemo(() => {
    const nextTexture = texture.clone();
    nextTexture.wrapS = THREE.ClampToEdgeWrapping;
    nextTexture.wrapT = THREE.ClampToEdgeWrapping;
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [texture]);

  useEffect(() => {
    return () => {
      outlineGeometry.dispose();
      configuredTexture.dispose();
    };
  }, [outlineGeometry, configuredTexture]);

  return (
    <>
      <mesh renderOrder={1}>
        {sphere ? <sphereGeometry args={[0.5, 24, 16]} /> : <boxGeometry args={[1, 1, 1]} />}
        <meshBasicMaterial color={faceColor} toneMapped={false} />
      </mesh>

      <mesh renderOrder={2}>
        {sphere ? (
          <sphereGeometry args={[0.502, 24, 16]} />
        ) : (
          <boxGeometry args={[1.002, 1.002, 1.002]} />
        )}
        <meshBasicMaterial
          map={configuredTexture}
          color="#ffffff"
          transparent
          alphaTest={0.01}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>

      <lineSegments geometry={outlineGeometry} renderOrder={3}>
        <lineBasicMaterial color={outlineColor} toneMapped={false} />
      </lineSegments>
    </>
  );
});

// ---------------------------------------------------------------------------
// CameraShakeOnHold - nudges the R3F camera around its own base pose while
// the user is holding the logo down, easing back to rest otherwise
// ---------------------------------------------------------------------------

type CameraShakeOnHoldProps = {
  actionPhase?: ActionPhase;
  intensity?: number;
  rotationIntensity?: number;
  frequency?: number;
  smooth?: number;
};

function CameraShakeOnHold({
  actionPhase = "idle",
  intensity = 0.045,
  rotationIntensity = 0.01,
  frequency = 18,
  smooth = 0.08,
}: CameraShakeOnHoldProps) {
  const { camera, clock } = useThree();

  const basePositionRef = useRef(new THREE.Vector3());
  const baseRotationRef = useRef(new THREE.Euler());
  const initializedRef = useRef(false);

  const offsetPosRef = useRef(new THREE.Vector3());
  const offsetRotRef = useRef(new THREE.Euler());

  useEffect(() => {
    if (!initializedRef.current) {
      basePositionRef.current.copy(camera.position);
      baseRotationRef.current.copy(camera.rotation);
      initializedRef.current = true;
    }
  }, [camera]);

  useFrame(() => {
    if (!initializedRef.current) return;

    const isHolding = actionPhase === "holding";
    const t = clock.elapsedTime;

    let targetX = 0;
    let targetY = 0;
    let targetZ = 0;

    let targetRotX = 0;
    let targetRotY = 0;
    let targetRotZ = 0;

    if (isHolding) {
      targetX =
        Math.sin(t * frequency) * intensity +
        Math.sin(t * frequency * 1.73) * intensity * 0.35;

      targetY =
        Math.cos(t * frequency * 1.21) * intensity * 0.8 +
        Math.sin(t * frequency * 2.11) * intensity * 0.25;

      targetZ =
        Math.sin(t * frequency * 0.87) * intensity * 0.4 +
        Math.cos(t * frequency * 1.57) * intensity * 0.18;

      targetRotX =
        Math.sin(t * frequency * 0.92) * rotationIntensity +
        Math.cos(t * frequency * 1.41) * rotationIntensity * 0.35;

      targetRotY =
        Math.cos(t * frequency * 1.16) * rotationIntensity * 0.8 +
        Math.sin(t * frequency * 1.83) * rotationIntensity * 0.25;

      targetRotZ = Math.sin(t * frequency * 1.37) * rotationIntensity * 0.6;
    }

    offsetPosRef.current.x = THREE.MathUtils.lerp(offsetPosRef.current.x, targetX, smooth);
    offsetPosRef.current.y = THREE.MathUtils.lerp(offsetPosRef.current.y, targetY, smooth);
    offsetPosRef.current.z = THREE.MathUtils.lerp(offsetPosRef.current.z, targetZ, smooth);

    offsetRotRef.current.x = THREE.MathUtils.lerp(offsetRotRef.current.x, targetRotX, smooth);
    offsetRotRef.current.y = THREE.MathUtils.lerp(offsetRotRef.current.y, targetRotY, smooth);
    offsetRotRef.current.z = THREE.MathUtils.lerp(offsetRotRef.current.z, targetRotZ, smooth);

    camera.position.set(
      basePositionRef.current.x + offsetPosRef.current.x,
      basePositionRef.current.y + offsetPosRef.current.y,
      basePositionRef.current.z + offsetPosRef.current.z
    );

    camera.rotation.set(
      baseRotationRef.current.x + offsetRotRef.current.x,
      baseRotationRef.current.y + offsetRotRef.current.y,
      baseRotationRef.current.z + offsetRotRef.current.z
    );
  });

  return null;
}

// ---------------------------------------------------------------------------
// HoldCursorIndicator - the ring that fills in around the cursor while
// holding, counting down to the auto-explosion trigger
// ---------------------------------------------------------------------------

const HOLD_TRIGGER_DURATION_MS = 3000;

type HoldCursorIndicatorProps = {
  isHolding?: boolean;
  actionPhase?: ActionPhase;
  holdStartTime?: number;
};

function HoldCursorIndicator({
  isHolding = false,
  actionPhase = "idle",
  holdStartTime = 0,
}: HoldCursorIndicatorProps) {
  const [cursor, setCursor] = useState({ x: -9999, y: -9999 });
  const [displayProgress, setDisplayProgress] = useState(0);

  const rafRef = useRef<number | null>(null);

  const radius = 28;
  const strokeWidth = 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("pointermove", handleMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = () => {
      let targetProgress = 0;

      if (isHolding && holdStartTime > 0) {
        const elapsed = performance.now() - holdStartTime;
        targetProgress = Math.min(elapsed / HOLD_TRIGGER_DURATION_MS, 1);
      }

      setDisplayProgress((prev) => {
        const lerp = isHolding ? 0.22 : 0.16;
        return prev + (targetProgress - prev) * lerp;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHolding, holdStartTime]);

  const isTransitioning = actionPhase === "exploding" || actionPhase === "reforming";
  const showRelease = !isTransitioning && displayProgress >= 0.995 && isHolding;
  const releaseOpacity = showRelease ? 1 : 0;
  const circleOpacity = isTransitioning
    ? 0
    : showRelease
      ? 0
      : actionPhase === "idle" && !isHolding
        ? displayProgress > 0.01
          ? 1
          : 0
        : 1;
  const dashOffset = circumference * (1 - displayProgress);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        className="absolute"
        style={{
          left: cursor.x,
          top: cursor.y,
          transform: "translate(-50%, -50%)",
        }}
      >
        <svg
          width={radius * 2 + 12}
          height={radius * 2 + 12}
          viewBox={`0 0 ${radius * 2 + 12} ${radius * 2 + 12}`}
          style={{
            opacity: circleOpacity,
            transition: "opacity 280ms ease",
            overflow: "visible",
          }}
        >
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            fill="none"
            stroke="#ffffff"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${radius + 6} ${radius + 6})`}
            style={{
              transition: isHolding
                ? "none"
                : "stroke-dashoffset 260ms cubic-bezier(.22,.61,.36,1)",
            }}
          />
        </svg>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            opacity: releaseOpacity,
            transition: "opacity 260ms ease",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {showRelease ? "Release" : ""}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FloatingCubes - the ambient background field of drifting cubes
// ---------------------------------------------------------------------------

type FloatingCubeDatum = {
  progress: number;
  x: number;
  yStart: number;
  yEnd: number;
  z: number;
  scale: number;
  speed: number;
  xRot: number;
  yRot: number;
  zRot: number;
  xRotSpeed: number;
  yRotSpeed: number;
  zRotSpeed: number;
  rotationTravel: number;
  easePower: number;
};

type FloatingCubeProps = {
  initialData: FloatingCubeDatum;
  texture: THREE.Texture;
  faceColor?: string;
  outlineColor?: string;
  sphere?: boolean;
  speedFactorRef: MutableRefObject<number>;
};

// Memoized for the same reason as CubeVisual - up to ~40 of these live under
// FloatingCubes, and initialData is only ever read once (into dataRef) on
// mount, so re-rendering this on every parent re-render buys nothing.
const FloatingCube = memo(function FloatingCube({
  initialData,
  texture,
  faceColor = "#1a1a1a",
  outlineColor = "#ffffff",
  sphere = false,
  speedFactorRef,
}: FloatingCubeProps) {
  const ref = useRef<THREE.Group>(null);
  const dataRef = useRef(initialData);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const d = dataRef.current;
    const y = THREE.MathUtils.lerp(d.yStart, d.yEnd, d.progress);

    node.position.set(d.x, y, d.z);
    node.rotation.set(d.xRot, d.yRot, d.zRot);
    node.scale.setScalar(d.scale);
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;

    const d = dataRef.current;

    d.progress += delta * d.speed * speedFactorRef.current;

    if (d.progress > 1) d.progress -= 1;
    if (d.progress < 0) d.progress = 0;

    const y = THREE.MathUtils.lerp(d.yStart, d.yEnd, d.progress);

    ref.current.position.set(d.x, y, d.z);

    ref.current.rotation.x = d.xRot + d.xRotSpeed * d.progress * d.rotationTravel;
    ref.current.rotation.y = d.yRot + d.yRotSpeed * d.progress * d.rotationTravel;
    ref.current.rotation.z = d.zRot + d.zRotSpeed * d.progress * d.rotationTravel;

    ref.current.scale.setScalar(d.scale);
  });

  return (
    <group ref={ref}>
      <CubeVisual texture={texture} faceColor={faceColor} outlineColor={outlineColor} sphere={sphere} />
    </group>
  );
});

type FloatingCubesProps = {
  texture: THREE.Texture;
  count?: number;
  faceColor?: string;
  outlineColor?: string;
  sphere?: boolean;
  yStartOffset?: number;
  yEndOffset?: number;
  zMin?: number;
  zMax?: number;
  scaleMin?: number;
  scaleMax?: number;
  speedMin?: number;
  speedMax?: number;
  easePower?: number;
  rotationSpeedMax?: number;
  xSpreadMultiplier?: number;
  pauseTarget?: number;
  parallaxPositionStrength?: number;
  parallaxRotationStrength?: number;
};

function FloatingCubes({
  texture,
  count = 40,
  faceColor = "#1a1a1a",
  outlineColor = "#ffffff",
  sphere = false,
  yStartOffset = 2,
  yEndOffset = 2,
  zMin = -6,
  zMax = 2.5,
  scaleMin = 0.08,
  scaleMax = 0.28,
  speedMin = 0.08,
  speedMax = 0.22,
  easePower = 2.2,
  rotationSpeedMax = 1.2,
  xSpreadMultiplier = 1.15,
  pauseTarget = 1,
  parallaxPositionStrength = 0.18,
  parallaxRotationStrength = 0.08,
}: FloatingCubesProps) {
  const { viewport, pointer } = useThree();
  const speedFactorRef = useRef(1);
  const layerRef = useRef<THREE.Group>(null);

  const cubes = useMemo<FloatingCubeDatum[]>(() => {
    const fieldWidth = viewport.width;
    const fieldHeight = viewport.height;

    const xMin = -fieldWidth * xSpreadMultiplier * 0.5;
    const xMax = fieldWidth * xSpreadMultiplier * 0.5;
    const yStart = -fieldHeight - yStartOffset;
    const yEnd = fieldHeight + yEndOffset;

    return Array.from({ length: count }, (_, i) => {
      const t = i + 1;

      const n1 = deterministicNoise(t * 0.73, 1.17, 2.31);
      const n2 = deterministicNoise(t * 1.19, 2.07, 0.91);
      const n3 = deterministicNoise(t * 1.83, 0.63, 2.77);
      const n4 = deterministicNoise(t * 2.41, 1.37, 1.93);
      const n5 = deterministicNoise(t * 0.51, 2.91, 1.41);
      const n6 = deterministicNoise(t * 1.61, 1.11, 2.21);
      const n7 = deterministicNoise(t * 2.91, 0.71, 1.27);
      const n8 = deterministicNoise(t * 1.07, 2.47, 0.57);
      const n9 = deterministicNoise(t * 2.03, 1.53, 1.83);

      return {
        progress: n1,
        x: THREE.MathUtils.lerp(xMin, xMax, n2),
        yStart,
        yEnd,
        z: THREE.MathUtils.lerp(zMin, zMax, n3),
        scale: THREE.MathUtils.lerp(scaleMin, scaleMax, n4),
        speed: THREE.MathUtils.lerp(speedMin, speedMax, n5),

        xRot: THREE.MathUtils.lerp(-Math.PI, Math.PI, n6),
        yRot: THREE.MathUtils.lerp(-Math.PI, Math.PI, n7),
        zRot: THREE.MathUtils.lerp(-Math.PI, Math.PI, n8),

        xRotSpeed: THREE.MathUtils.lerp(
          -rotationSpeedMax,
          rotationSpeedMax,
          deterministicNoise(t * 1.7, 0.4, 2.2)
        ),
        yRotSpeed: THREE.MathUtils.lerp(
          -rotationSpeedMax,
          rotationSpeedMax,
          deterministicNoise(t * 0.8, 1.9, 2.9)
        ),
        zRotSpeed: THREE.MathUtils.lerp(
          -rotationSpeedMax,
          rotationSpeedMax,
          deterministicNoise(t * 2.3, 1.2, 0.6)
        ),

        rotationTravel: THREE.MathUtils.lerp(1.2, 3.4, n9),
        easePower,
      };
    });
  }, [
    viewport.width,
    viewport.height,
    count,
    xSpreadMultiplier,
    yStartOffset,
    yEndOffset,
    zMin,
    zMax,
    scaleMin,
    scaleMax,
    speedMin,
    speedMax,
    easePower,
    rotationSpeedMax,
  ]);

  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.position.set(0, 0, 0);
    layerRef.current.rotation.set(0, 0, 0);
  }, []);

  useFrame(() => {
    speedFactorRef.current = THREE.MathUtils.lerp(speedFactorRef.current, pauseTarget, 0.045);

    if (!layerRef.current) return;

    const targetX = pointer.x * parallaxPositionStrength;
    const targetY = pointer.y * parallaxPositionStrength;
    const targetRotY = pointer.x * parallaxRotationStrength;
    const targetRotX = -pointer.y * parallaxRotationStrength * 0.6;

    layerRef.current.position.x = THREE.MathUtils.lerp(layerRef.current.position.x, targetX, 0.06);
    layerRef.current.position.y = THREE.MathUtils.lerp(layerRef.current.position.y, targetY, 0.06);

    layerRef.current.rotation.x = THREE.MathUtils.lerp(layerRef.current.rotation.x, targetRotX, 0.06);
    layerRef.current.rotation.y = THREE.MathUtils.lerp(layerRef.current.rotation.y, targetRotY, 0.06);
  });

  return (
    <group ref={layerRef}>
      {cubes.map((cube, i) => (
        <FloatingCube
          key={i}
          initialData={cube}
          texture={texture}
          faceColor={faceColor}
          outlineColor={outlineColor}
          sphere={sphere}
          speedFactorRef={speedFactorRef}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// InteractiveParticles - the cube swarm that traces the logo's silhouette:
// idle/hold cursor-repel, explode-on-release, reform back into shape
// ---------------------------------------------------------------------------

type BurstTrack = {
  seed: number;
  explodedX: number;
  explodedY: number;
  explodedZ: number;
  explodedRotX: number;
  explodedRotY: number;
  explodedRotZ: number;
};

type ParticleCubeProps = {
  index: number;
  data: ParticleDatum;
  texture: THREE.Texture;
  registerRef: (index: number, node: THREE.Group | null) => void;
  faceColor?: string;
  outlineColor?: string;
  sphere?: boolean;
};

// Memoized - there are ~835 of these under InteractiveParticles, and their
// visual placement is driven imperatively via refs (see the `data` effect
// below and the parent's useFrame), not by re-rendering. `index` and
// `registerRef` are stable primitives/functions, so the ref callback built
// from them below is stable too, letting memo() actually skip re-renders on
// every hold/explode/reform phase change.
const ParticleCube = memo(function ParticleCube({
  index,
  data,
  texture,
  registerRef,
  faceColor = "#1a1a1a",
  outlineColor = "#ffffff",
  sphere = false,
}: ParticleCubeProps) {
  const localRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const node = localRef.current;
    if (!node) return;

    node.position.copy(data.position);
    node.quaternion.copy(data.quaternion);
    node.scale.copy(data.scale);
  }, [data]);

  const setRef = useCallback(
    (node: THREE.Group | null) => {
      localRef.current = node;
      registerRef(index, node);
    },
    [registerRef, index]
  );

  return (
    <group ref={setRef}>
      <CubeVisual texture={texture} faceColor={faceColor} outlineColor={outlineColor} sphere={sphere} />
    </group>
  );
});

type InteractiveParticlesProps = {
  particles: ParticleDatum[];
  texture: THREE.Texture;
  interactionGroupRef: MutableRefObject<THREE.Group | null>;
  interactionRadius?: number;
  maxShrink?: number;
  minScaleMultiplier?: number;
  scaleLerp?: number;
  parallaxPositionStrength?: number;
  parallaxRotationStrength?: number;
  outlineColor?: string;
  faceColor?: string;
  sphere?: boolean;

  actionPhase?: ActionPhase;
  holdStartTime?: number;
  holdTriggerDuration?: number;
  burstKey?: number;
  explosionDuration?: number;
  explodedHoldDuration?: number;
  reformDuration?: number;
  holdShakeAmount?: number;
  holdShakeSpeed?: number;
  explosionSpreadX?: number;
  explosionSpreadY?: number;
  explosionForwardMin?: number;
  explosionForwardMax?: number;
  explosionBackwardMin?: number;
  explosionBackwardMax?: number;
  explosionRotateMax?: number;
};

function InteractiveParticles({
  particles,
  texture,
  interactionGroupRef,
  interactionRadius = 1.1,
  maxShrink = 0.7,
  minScaleMultiplier = 0.2,
  scaleLerp = 0.12,
  sphere = false,
  parallaxPositionStrength = 0.12,
  parallaxRotationStrength = 0.12,
  outlineColor = "#ffffff",
  faceColor = "#1a1a1a",

  actionPhase = "idle",
  holdStartTime = 0,
  holdTriggerDuration = 3,
  burstKey = 0,
  explosionDuration = 3,
  explodedHoldDuration = 1,
  reformDuration = 2.5,
  holdShakeAmount = 0.03,
  holdShakeSpeed = 30,
  explosionSpreadX = 16,
  explosionSpreadY = 10,
  explosionForwardMin = 2,
  explosionForwardMax = 5,
  explosionBackwardMin = 1.5,
  explosionBackwardMax = 4,
  explosionRotateMax = 2.2,
}: InteractiveParticlesProps) {
  const particleRefs = useRef<Array<THREE.Group | null>>([]);
  const hoveredRef = useRef(true);

  const { camera, pointer, viewport, clock } = useThree();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(), []);
  const worldPoint = useMemo(() => new THREE.Vector3(), []);
  const localPoint = useMemo(() => new THREE.Vector3(), []);
  const groupWorldPos = useMemo(() => new THREE.Vector3(), []);
  const planeNormal = useMemo(() => new THREE.Vector3(), []);

  const basePositionRef = useRef(new THREE.Vector3());
  const baseQuatRef = useRef(new THREE.Quaternion());
  const targetEuler = useMemo(() => new THREE.Euler(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const initializedRef = useRef(false);

  const phaseStartRef = useRef(0);
  const burstTracksRef = useRef<BurstTrack[]>([]);

  useEffect(() => {
    hoveredRef.current = true;
    return () => {
      hoveredRef.current = false;
    };
  }, []);

  // Stable across re-renders (empty deps) and takes the index as a plain
  // argument instead of being curried per-particle - ParticleCube turns this
  // into its own stable ref callback via useCallback, so the `ref` prop it
  // passes to its <group> never changes identity and memo() actually holds.
  const registerRef = useCallback((index: number, node: THREE.Group | null) => {
    if (node) {
      particleRefs.current[index] = node;
    }
  }, []);

  useEffect(() => {
    phaseStartRef.current = performance.now() / 1000;
  }, [actionPhase]);

  useEffect(() => {
    const width = viewport.width + explosionSpreadX;
    const height = viewport.height + explosionSpreadY;

    burstTracksRef.current = particles.map((base, index) => {
      const bx = base.position.x;
      const by = base.position.y;
      const bz = base.position.z;

      const n1 = deterministicNoise(bx * 0.91, by * 1.13, bz * 1.37);
      const n2 = deterministicNoise(bx * 1.71, by * 0.77, bz * 1.91);
      const n3 = deterministicNoise(bx * 2.11, by * 1.43, bz * 0.63);
      const n4 = deterministicNoise(bx * 1.27, by * 2.21, bz * 1.05);
      const n5 = deterministicNoise(bx * 0.57, by * 1.59, bz * 2.47);
      const n6 = deterministicNoise(bx * 2.73, by * 0.89, bz * 1.31);

      const explodedX = (n1 * 2 - 1) * width * 0.9;
      const explodedY = (n2 * 2 - 1) * height * 0.9;

      const explodedZ =
        n3 > 0.5
          ? THREE.MathUtils.lerp(explosionForwardMin, explosionForwardMax, (n3 - 0.5) * 2)
          : THREE.MathUtils.lerp(explosionBackwardMin, explosionBackwardMax, n3 * 2);

      return {
        seed: n4 * 1000 + index * 0.01,
        explodedX,
        explodedY,
        explodedZ,
        explodedRotX: THREE.MathUtils.lerp(-explosionRotateMax, explosionRotateMax, n4),
        explodedRotY: THREE.MathUtils.lerp(-explosionRotateMax, explosionRotateMax, n5),
        explodedRotZ: THREE.MathUtils.lerp(-explosionRotateMax, explosionRotateMax, n6),
      };
    });
  }, [
    burstKey,
    particles,
    viewport.width,
    viewport.height,
    explosionSpreadX,
    explosionSpreadY,
    explosionForwardMin,
    explosionForwardMax,
    explosionBackwardMin,
    explosionBackwardMax,
    explosionRotateMax,
  ]);

  useFrame(() => {
    const group = interactionGroupRef.current;
    if (!group) return;

    if (!initializedRef.current) {
      basePositionRef.current.copy(group.position);
      baseQuatRef.current.copy(group.quaternion);
      initializedRef.current = true;
    }

    const now = performance.now() / 1000;
    const phaseElapsed = now - phaseStartRef.current;

    const isIdle = actionPhase === "idle";
    const isHolding = actionPhase === "holding";
    const isExploding = actionPhase === "exploding";
    const isReforming = actionPhase === "reforming";

    let holdProgress = 0;
    if (isHolding && holdStartTime > 0) {
      const heldFor = (performance.now() - holdStartTime) / 1000;
      holdProgress = THREE.MathUtils.clamp(heldFor / holdTriggerDuration, 0, 1);
    }

    const shakeProgress = Math.pow(holdProgress, 0.55);
    const currentShakeAmount = holdShakeAmount * (0.9 + shakeProgress * 4.2);

    group.getWorldPosition(groupWorldPos);
    camera.getWorldDirection(planeNormal).normalize();
    plane.setFromNormalAndCoplanarPoint(planeNormal, groupWorldPos);

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.ray.intersectPlane(plane, worldPoint);

    if (hit) {
      localPoint.copy(worldPoint);
      group.worldToLocal(localPoint);
    }

    const targetPosX =
      basePositionRef.current.x + (isHolding ? 0 : pointer.x * parallaxPositionStrength);
    const targetPosY =
      basePositionRef.current.y + (isHolding ? 0 : pointer.y * parallaxPositionStrength);

    group.position.x = THREE.MathUtils.lerp(group.position.x, targetPosX, 0.08);
    group.position.y = THREE.MathUtils.lerp(group.position.y, targetPosY, 0.08);

    targetEuler.set(
      isHolding ? 0 : -pointer.y * parallaxRotationStrength,
      isHolding ? 0 : pointer.x * parallaxRotationStrength,
      0,
      "XYZ"
    );

    targetQuat.copy(baseQuatRef.current).multiply(new THREE.Quaternion().setFromEuler(targetEuler));

    group.quaternion.slerp(targetQuat, 0.08);

    const isExplodedHoldWindow = isExploding && phaseElapsed >= explosionDuration;

    for (let i = 0; i < particles.length; i++) {
      const ref = particleRefs.current[i];
      if (!ref) continue;

      const base = particles[i];
      const track = burstTracksRef.current[i];
      const baseScale = base.scale;

      if (!track) continue;

      const baseX = base.position.x;
      const baseY = base.position.y;
      const baseZ = base.position.z;

      let px = baseX;
      let py = baseY;
      let pz = baseZ;

      let rotX = 0;
      let rotY = 0;
      let rotZ = 0;

      if (isHolding) {
        const tt = clock.elapsedTime * holdShakeSpeed + track.seed;

        px += Math.sin(tt) * currentShakeAmount;
        py += Math.cos(tt * 1.17) * currentShakeAmount;
        pz += Math.sin(tt * 1.43) * currentShakeAmount * 1.05;

        px += Math.sin(tt * 2.2) * currentShakeAmount * 0.42;
        py += Math.cos(tt * 2.6) * currentShakeAmount * 0.42;
        pz += Math.sin(tt * 2.9) * currentShakeAmount * 0.34;
      } else if (isExploding) {
        const t = Math.min(phaseElapsed / explosionDuration, 1);
        const eased = explosionEase(t);

        if (isExplodedHoldWindow || t >= 1) {
          px = track.explodedX;
          py = track.explodedY;
          pz = track.explodedZ;

          rotX = track.explodedRotX;
          rotY = track.explodedRotY;
          rotZ = track.explodedRotZ;
        } else {
          px = THREE.MathUtils.lerp(baseX, track.explodedX, eased);
          py = THREE.MathUtils.lerp(baseY, track.explodedY, eased);
          pz = THREE.MathUtils.lerp(baseZ, track.explodedZ, eased);

          rotX = track.explodedRotX * eased;
          rotY = track.explodedRotY * eased;
          rotZ = track.explodedRotZ * eased;
        }
      } else if (isReforming) {
        const rawT = phaseElapsed / reformDuration;
        const t = Math.min(rawT, 1);
        const eased = reformEase(t);

        px = THREE.MathUtils.lerp(track.explodedX, baseX, eased);
        py = THREE.MathUtils.lerp(track.explodedY, baseY, eased);
        pz = THREE.MathUtils.lerp(track.explodedZ, baseZ, eased);

        rotX = track.explodedRotX * (1 - eased);
        rotY = track.explodedRotY * (1 - eased);
        rotZ = track.explodedRotZ * (1 - eased);
      }

      ref.position.set(px, py, pz);
      ref.rotation.set(rotX, rotY, rotZ);

      let targetMultiplier = 1;

      if ((isIdle || isHolding) && hoveredRef.current && hit) {
        const dx = baseX - localPoint.x;
        const dy = baseY - localPoint.y;
        const dz = baseZ - localPoint.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < interactionRadius) {
          const t = 1 - dist / interactionRadius;
          const eased = t * t;
          targetMultiplier = 1 - maxShrink * eased;
          targetMultiplier = Math.max(minScaleMultiplier, targetMultiplier);
        }
      }

      ref.scale.x = THREE.MathUtils.lerp(ref.scale.x, baseScale.x * targetMultiplier, scaleLerp);
      ref.scale.y = THREE.MathUtils.lerp(ref.scale.y, baseScale.y * targetMultiplier, scaleLerp);
      ref.scale.z = THREE.MathUtils.lerp(ref.scale.z, baseScale.z * targetMultiplier, scaleLerp);
    }
  });

  return (
    <group>
      {particles.map((particle, i) => (
        <ParticleCube
          key={i}
          index={i}
          data={particle}
          texture={texture}
          registerRef={registerRef}
          outlineColor={outlineColor}
          faceColor={faceColor}
          sphere={sphere}
        />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// CubeParticlesModel - loads the GLB, samples its front-facing silhouette
// into a cube grid, and renders the floating background + interactive swarm
// ---------------------------------------------------------------------------

type PreparedModel = {
  sceneClone: THREE.Group;
  meshes: THREE.Mesh[];
  bbox: THREE.Box3;
};

type CubeParticlesModelProps = {
  texturePath?: string;

  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;

  particleCount?: number;
  cubeSize?: number;
  cubeScaleVariation?: number;

  modelOpacity?: number;
  outlineColor?: string;
  faceColor?: string;
  sphere?: boolean;

  frontVector?: [number, number, number];
  frontBiasPower?: number;
  backFill?: number;

  edgeBoost?: number;
  gridSnapFactor?: number;

  interactionRadius?: number;
  maxShrink?: number;
  minScaleMultiplier?: number;
  scaleLerp?: number;

  parallaxPositionStrength?: number;
  parallaxRotationStrength?: number;

  floatingCubeCount?: number;
  floatingYStartOffset?: number;
  floatingYEndOffset?: number;
  floatingZMin?: number;
  floatingZMax?: number;
  floatingScaleMin?: number;
  floatingScaleMax?: number;
  floatingSpeedMin?: number;
  floatingSpeedMax?: number;
  floatingEasePower?: number;
  floatingRotationSpeedMax?: number;
  floatingXSpreadMultiplier?: number;

  actionPhase?: ActionPhase;
  holdStartTime?: number;
  holdTriggerDuration?: number;
  burstKey?: number;
  explosionDuration?: number;
  explodedHoldDuration?: number;
  reformDuration?: number;
  explosionSpreadX?: number;
  explosionSpreadY?: number;
  explosionForwardMin?: number;
  explosionForwardMax?: number;
  explosionBackwardMin?: number;
  explosionBackwardMax?: number;
  explosionRotateMax?: number;
};

const HYPERIUX_MODEL_PATH = "/assets/models/hyperiux-new-model.glb";

// Torus dimensions for the fallback shape cubes get mapped onto when the
// real model fails to load (lying flat in the XY plane, facing +Z - see
// FRONT_VECTOR below). Chosen so its bounding-box diagonal lands on
// REFERENCE_MODEL_DIAGONAL, matching the scale cubeSize/particleCount were
// originally tuned against, so the fallback still looks right without
// retuning.
const TORUS_RADIUS = 7.25;
const TORUS_TUBE = 0.75;

// Bounding-box diagonal (in local units) that cubeSize/particleCount were
// tuned by eye against (originally the hyperiux logo model's own bbox
// diagonal). particleData below scales cubeSize by the reference shape's
// own diagonal relative to this constant, so swapping in a differently
// sized shape later still gets a properly dense cube layout instead of a
// handful of cubes (too coarse) or a perf cliff (too fine).
const REFERENCE_MODEL_DIAGONAL = 22.9;

// Stable references for the array props HyperiuxLogo passes to
// CubeParticlesModel below - `frontVector` is a dependency of the
// particleData useMemo (the raycasting pass that samples the model's
// silhouette into ~800+ cube positions), and a fresh `[0, 0, 1]` literal on
// every render (which a plain inline JSX array is) invalidates that memo by
// reference even though the values never change. That's what was
// re-running the entire expensive layout computation on every hold/explode/
// reform transition - each one calls setActionPhase, which re-renders
// HyperiuxLogo, which used to hand CubeParticlesModel a "new" frontVector
// every time. position/rotation are hoisted the same way for consistency,
// though they weren't themselves in an expensive memo's deps.
const ORIGIN_VECTOR: [number, number, number] = [0, 0, 0];
const FRONT_VECTOR: [number, number, number] = [0, 0, 1];

// Suspense catches useGLTF's pending-load throw, but not a rejected one (a
// 404 or a broken/missing model file) - that needs an actual error boundary
// above the Suspense. When the real model fails to load, this swaps the
// whole subtree for the torus fallback instead of leaving a blank canvas.
type ModelErrorBoundaryProps = { fallback: ReactNode; children: ReactNode };
type ModelErrorBoundaryState = { hasError: boolean };

class ModelErrorBoundary extends Component<ModelErrorBoundaryProps, ModelErrorBoundaryState> {
  state: ModelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("HyperiuxLogo: model failed to load, falling back to torus.", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

type CubeParticlesModelBodyProps = CubeParticlesModelProps & { prepared: PreparedModel };

// Renders the floating background + interactive swarm cubes/spheres mapped
// onto `prepared`'s silhouette. Shape-agnostic - CubeParticlesModelFromGLTF
// and CubeParticlesModelTorus below build `prepared` differently (a loaded
// GLB vs. a procedural torus) and both render through this same body, so a
// failed model load can swap shape source without touching any of this.
function CubeParticlesModelBody({
  prepared,
  texturePath = "/assets/models/new-logo-texture.png",

  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,

  particleCount = 500,
  cubeSize = 0.16,
  cubeScaleVariation = 0.08,

  modelOpacity = 0.015,
  outlineColor = "#ffffff",
  faceColor = "#1a1a1a",
  sphere = false,

  frontVector = [0, 0, 1],
  frontBiasPower = 3.2,
  backFill = 0.02,

  edgeBoost = 1.0,
  gridSnapFactor = 0.94,

  interactionRadius = 0.9,
  maxShrink = 0.72,
  minScaleMultiplier = 0.2,
  scaleLerp = 0.12,

  parallaxPositionStrength = 0.08,
  parallaxRotationStrength = 0.12,

  floatingCubeCount = 42,
  floatingYStartOffset = 2,
  floatingYEndOffset = 2,
  floatingZMin = -6,
  floatingZMax = 2.5,
  floatingScaleMin = 0.08,
  floatingScaleMax = 0.28,
  floatingSpeedMin = 0.08,
  floatingSpeedMax = 0.2,
  floatingEasePower = 2.4,
  floatingRotationSpeedMax = 1.1,
  floatingXSpreadMultiplier = 1.25,

  actionPhase = "idle",
  holdStartTime = 0,
  holdTriggerDuration = 3,
  burstKey = 0,
  explosionDuration = 0.7,
  explodedHoldDuration = 0.01,
  reformDuration = 0.8,
  explosionSpreadX = 18,
  explosionSpreadY = 12,
  explosionForwardMin = 2.5,
  explosionForwardMax = 7,
  explosionBackwardMin = 2,
  explosionBackwardMax = 5,
  explosionRotateMax = 3.2,
}: CubeParticlesModelBodyProps) {
  const faceTexture = useTexture(texturePath);

  const baseGroupRef = useRef<THREE.Group>(null);
  const interactionGroupRef = useRef<THREE.Group | null>(null);

  const displayFaceTexture = useMemo(() => {
    const image = faceTexture.image as HTMLImageElement | undefined;
    if (!image) return faceTexture;

    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return faceTexture;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }

    ctx.putImageData(imageData, 0, 0);

    const invertedTexture = new THREE.CanvasTexture(canvas);
    invertedTexture.wrapS = THREE.ClampToEdgeWrapping;
    invertedTexture.wrapT = THREE.ClampToEdgeWrapping;
    invertedTexture.colorSpace = THREE.SRGBColorSpace;
    invertedTexture.needsUpdate = true;

    return invertedTexture;
  }, [faceTexture]);

  useEffect(() => {
    if (displayFaceTexture === faceTexture) return;
    return () => {
      displayFaceTexture.dispose();
    };
  }, [displayFaceTexture, faceTexture]);

  const particleData = useMemo<ParticleDatum[]>(() => {
    const particles: ParticleDatum[] = [];
    const occupied = new Set<string>();

    if (!prepared.meshes.length) return particles;

    const frontDir = new THREE.Vector3(...frontVector).normalize();

    const bbox = prepared.bbox.clone();
    const bboxCenter = new THREE.Vector3();
    const bboxSize = new THREE.Vector3();
    bbox.getCenter(bboxCenter);
    bbox.getSize(bboxSize);

    // cubeSize/particleCount were tuned by eye against the original
    // hyperiux logo model, whose bounding-box diagonal is ~22.9 units. A
    // dropped-in model can be authored at any scale (the oris-dental teeth
    // model's diagonal is ~1.15 units, ~20x smaller), and a fixed cubeSize
    // sampling grid tuned for one scale is either far too coarse (too few
    // cubes, as on the teeth model) or far too fine (perf cliff) on another.
    // Scaling cubeSize by the model's own diagonal relative to that
    // reference keeps grid density - and therefore cube coverage - visually
    // consistent for any model, while leaving the tuned default look
    // unchanged for the reference model itself (autoScale === 1 there).
    const bboxDiagonal = bboxSize.length();
    const autoScale = bboxDiagonal > 0 ? bboxDiagonal / REFERENCE_MODEL_DIAGONAL : 1;
    const effectiveCubeSize = cubeSize * autoScale;
    const grid = effectiveCubeSize * gridSnapFactor;

    const upCandidate =
      Math.abs(frontDir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);

    const planeX = new THREE.Vector3().crossVectors(upCandidate, frontDir).normalize();
    const planeY = new THREE.Vector3().crossVectors(frontDir, planeX).normalize();

    const project2D = (point: THREE.Vector3) => {
      const local = point.clone().sub(bboxCenter);
      return {
        x: local.dot(planeX),
        y: local.dot(planeY),
        z: local.dot(frontDir),
      };
    };

    const halfExtentAlongFront =
      (Math.abs(frontDir.x) * bboxSize.x +
        Math.abs(frontDir.y) * bboxSize.y +
        Math.abs(frontDir.z) * bboxSize.z) *
      0.5;

    const computeFrontness = (pos: THREE.Vector3) => {
      const centered = pos.clone().sub(bboxCenter);
      const projected = centered.dot(frontDir);
      const normalized =
        halfExtentAlongFront > 0
          ? (projected + halfExtentAlongFront) / (2 * halfExtentAlongFront)
          : 0.5;

      return THREE.MathUtils.clamp(normalized, 0, 1);
    };

    const addCube = (pos: THREE.Vector3, size: number) => {
      const snapped = snapToGrid(pos, grid);
      const key = `${snapped.x.toFixed(4)}|${snapped.y.toFixed(4)}|${snapped.z.toFixed(4)}`;

      if (occupied.has(key)) return false;
      occupied.add(key);

      particles.push({
        position: snapped.clone(),
        quaternion: new THREE.Quaternion(),
        scale: new THREE.Vector3(size, size, size),
      });

      return true;
    };

    const raycastGroup = new THREE.Group();
    prepared.meshes.forEach((m) => raycastGroup.add(m.clone()));
    raycastGroup.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const frontStartDistance = halfExtentAlongFront + Math.max(effectiveCubeSize * 6, 2 * autoScale);

    const corners = [];
    for (const x of [bbox.min.x, bbox.max.x]) {
      for (const y of [bbox.min.y, bbox.max.y]) {
        for (const z of [bbox.min.z, bbox.max.z]) {
          corners.push(project2D(new THREE.Vector3(x, y, z)));
        }
      }
    }

    const min2DX = Math.min(...corners.map((c) => c.x));
    const max2DX = Math.max(...corners.map((c) => c.x));
    const min2DY = Math.min(...corners.map((c) => c.y));
    const max2DY = Math.max(...corners.map((c) => c.y));

    const start = new THREE.Vector3();
    const rayOrigin = new THREE.Vector3();
    const hitPoint = new THREE.Vector3();

    type Candidate = { position: THREE.Vector3; frontness: number; type: "face" | "edge" };
    const faceCandidates: Candidate[] = [];

    for (let py = min2DY; py <= max2DY; py += grid) {
      for (let px = min2DX; px <= max2DX; px += grid) {
        start.copy(bboxCenter).addScaledVector(planeX, px).addScaledVector(planeY, py);

        rayOrigin.copy(start).addScaledVector(frontDir, frontStartDistance);

        raycaster.set(rayOrigin, frontDir.clone().multiplyScalar(-1));
        const hits = raycaster.intersectObject(raycastGroup, true);

        if (!hits.length) continue;

        hitPoint.copy(hits[0].point);

        const frontness = computeFrontness(hitPoint);
        if (frontness < backFill * 0.4) continue;

        faceCandidates.push({ position: hitPoint.clone(), frontness, type: "face" });
      }
    }

    const edgeCandidates: Candidate[] = [];
    prepared.meshes.forEach((mesh) => {
      const geometry = mesh.geometry.clone();
      const edges = new THREE.EdgesGeometry(geometry);
      const edgeAttr = edges.attributes.position;

      if (!edgeAttr) return;

      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const p = new THREE.Vector3();

      for (let i = 0; i < edgeAttr.count; i += 2) {
        a.fromBufferAttribute(edgeAttr, i).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(edgeAttr, i + 1).applyMatrix4(mesh.matrixWorld);

        const length = a.distanceTo(b);
        const steps = Math.max(2, Math.ceil(length / (effectiveCubeSize * 0.75)));

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          p.lerpVectors(a, b, t);

          const frontness = computeFrontness(p);
          if (frontness < backFill * 0.3) continue;

          edgeCandidates.push({ position: p.clone(), frontness, type: "edge" });
        }
      }
    });

    const candidates = [...faceCandidates, ...edgeCandidates];

    candidates.sort((a, b) => {
      const wa = a.frontness * (a.type === "edge" ? 1.25 : 1.6);
      const wb = b.frontness * (b.type === "edge" ? 1.25 : 1.6);
      return wb - wa;
    });

    const targetCount = particleCount + Math.floor(particleCount * edgeBoost * 0.12);

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];

      const keepBase =
        c.type === "face"
          ? Math.pow(c.frontness, Math.max(1, frontBiasPower * 0.35))
          : Math.min(
              1,
              Math.pow(c.frontness, Math.max(1, frontBiasPower * 0.65)) * (1 + edgeBoost * 0.08)
            );

      const r = deterministicNoise(c.position.x, c.position.y, c.position.z);
      if (r > keepBase) continue;

      const size =
        effectiveCubeSize *
        (1 -
          cubeScaleVariation +
          deterministicNoise(c.position.x * 1.7, c.position.y * 2.3, c.position.z * 3.1) *
            cubeScaleVariation);

      addCube(c.position, size);

      if (particles.length >= targetCount) break;
    }

    return particles;
  }, [
    prepared.meshes,
    prepared.bbox,
    particleCount,
    cubeSize,
    cubeScaleVariation,
    frontVector,
    frontBiasPower,
    backFill,
    edgeBoost,
    gridSnapFactor,
  ]);

  useEffect(() => {
    prepared.sceneClone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const material = mesh.material as THREE.Material;
        material.transparent = true;
        material.opacity = modelOpacity;
        material.depthWrite = false;
      }
    });
  }, [prepared.sceneClone, modelOpacity]);

  const floatingPauseTarget =
    actionPhase === "holding" ? 0.22 : actionPhase === "exploding" ? 0 : 1;

  return (
    <>
      <FloatingCubes
        texture={displayFaceTexture}
        count={floatingCubeCount}
        faceColor={faceColor}
        outlineColor={outlineColor}
        sphere={sphere}
        yStartOffset={floatingYStartOffset}
        yEndOffset={floatingYEndOffset}
        zMin={floatingZMin}
        zMax={floatingZMax}
        scaleMin={floatingScaleMin}
        scaleMax={floatingScaleMax}
        speedMin={floatingSpeedMin}
        speedMax={floatingSpeedMax}
        easePower={floatingEasePower}
        rotationSpeedMax={floatingRotationSpeedMax}
        xSpreadMultiplier={floatingXSpreadMultiplier}
        pauseTarget={floatingPauseTarget}
        parallaxPositionStrength={0.28}
        parallaxRotationStrength={0.12}
      />

      <Center>
        <group ref={baseGroupRef} position={position} rotation={rotation} scale={scale}>
          <group ref={interactionGroupRef}>
            <primitive object={prepared.sceneClone} dispose={null} />

            <InteractiveParticles
              particles={particleData}
              texture={displayFaceTexture}
              interactionGroupRef={interactionGroupRef}
              interactionRadius={interactionRadius}
              maxShrink={maxShrink}
              minScaleMultiplier={minScaleMultiplier}
              scaleLerp={scaleLerp}
              parallaxPositionStrength={parallaxPositionStrength}
              parallaxRotationStrength={parallaxRotationStrength}
              outlineColor={outlineColor}
              faceColor={faceColor}
              sphere={sphere}
              actionPhase={actionPhase}
              holdStartTime={holdStartTime}
              holdTriggerDuration={holdTriggerDuration}
              burstKey={burstKey}
              explosionDuration={explosionDuration}
              explodedHoldDuration={explodedHoldDuration}
              reformDuration={reformDuration}
              explosionSpreadX={explosionSpreadX}
              explosionSpreadY={explosionSpreadY}
              explosionForwardMin={explosionForwardMin}
              explosionForwardMax={explosionForwardMax}
              explosionBackwardMin={explosionBackwardMin}
              explosionBackwardMax={explosionBackwardMax}
              explosionRotateMax={explosionRotateMax}
            />
          </group>
        </group>
      </Center>
    </>
  );
}

// Loads the real model and builds `prepared` from its meshes. Left as a
// distinct component (rather than folded into the body) so useGLTF's
// suspend/throw-on-error behavior is isolated to just this piece - the
// Suspense/ModelErrorBoundary pair wrapping it at the HyperiuxLogo call site
// can catch a load failure and swap in CubeParticlesModelTorus below without
// unmounting/remounting the whole particle system's state.
function CubeParticlesModelFromGLTF({
  modelPath,
  ...rest
}: CubeParticlesModelProps & { modelPath: string }) {
  const gltf = useGLTF(modelPath);

  const prepared = useMemo<PreparedModel>(() => {
    const sceneClone = gltf.scene.clone(true);
    const meshes: THREE.Mesh[] = [];
    const bbox = new THREE.Box3();

    sceneClone.updateMatrixWorld(true);

    sceneClone.traverse((child) => {
      const candidate = child as THREE.Mesh;
      if (candidate.isMesh && candidate.geometry) {
        const mesh = candidate.clone();
        mesh.geometry = candidate.geometry.clone();
        mesh.geometry.computeBoundsTree();
        mesh.material =
          (candidate.material as THREE.Material)?.clone?.() || new THREE.MeshStandardMaterial();
        mesh.updateMatrixWorld(true);
        meshes.push(mesh);
        bbox.expandByObject(mesh);
      }
    });

    return { sceneClone, meshes, bbox };
  }, [gltf]);

  return <CubeParticlesModelBody prepared={prepared} {...rest} />;
}

useGLTF.preload(HYPERIUX_MODEL_PATH);

// Fallback shape source (a procedural torus, see TORUS_RADIUS/TORUS_TUBE
// above) - used both as ModelErrorBoundary's fallback when the real model
// fails to load, and available to render directly if ever wanted on its
// own.
function CubeParticlesModelTorus(props: CubeParticlesModelProps) {
  const prepared = useMemo<PreparedModel>(() => {
    const geometry = new THREE.TorusGeometry(TORUS_RADIUS, TORUS_TUBE, 48, 128);
    geometry.computeBoundsTree();

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.updateMatrixWorld(true);

    const sceneClone = new THREE.Group();
    sceneClone.add(mesh);
    sceneClone.updateMatrixWorld(true);

    const bbox = new THREE.Box3().setFromObject(mesh);

    return { sceneClone, meshes: [mesh], bbox };
  }, []);

  return <CubeParticlesModelBody prepared={prepared} {...props} />;
}

// ---------------------------------------------------------------------------
// HyperiuxLogo - the page-level component: owns the hold/explode/reform
// state machine, the light/dark toggle, and the R3F canvas
// ---------------------------------------------------------------------------

const PHASE_IDLE: ActionPhase = "idle";
const PHASE_HOLDING: ActionPhase = "holding";
const PHASE_EXPLODING: ActionPhase = "exploding";
const PHASE_REFORMING: ActionPhase = "reforming";

const DARK_TEXTURE_PATH = "/assets/models/new-logo-texture.png";
const LIGHT_TEXTURE_PATH = "/assets/models/hyperiux-logo-texture.png";
const HOLD_TRIGGER_DURATION = 3;

type HyperiuxLogoProps = {
  sphere?: boolean;
};

function HyperiuxLogo({ sphere = false }: HyperiuxLogoProps) {
  const [actionPhase, setActionPhase] = useState<ActionPhase>(PHASE_IDLE);
  const [burstKey, setBurstKey] = useState(0);
  const [isLightMode, setIsLightMode] = useState(false);
  const [holdStartTime, setHoldStartTime] = useState(0);

  const actionPhaseRef = useRef<ActionPhase>(PHASE_IDLE);
  const lockRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const removeWindowReleaseRef = useRef<(() => void) | null>(null);
  const holdStartTimeRef = useRef(0);
  const autoExplosionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const explosionDuration = 3;
  const explodedHoldDuration = 1;
  const reformDuration = 3.5;
  const reformSettleBuffer = 0.12;

  useEffect(() => {
    actionPhaseRef.current = actionPhase;
  }, [actionPhase]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const clearAutoExplosionTimeout = () => {
    if (autoExplosionTimeoutRef.current) {
      clearTimeout(autoExplosionTimeoutRef.current);
      autoExplosionTimeoutRef.current = null;
    }
  };

  const clearWindowRelease = () => {
    if (removeWindowReleaseRef.current) {
      removeWindowReleaseRef.current();
      removeWindowReleaseRef.current = null;
    }
  };

  const resetCycle = () => {
    clearTimers();
    clearAutoExplosionTimeout();
    clearWindowRelease();

    lockRef.current = false;
    activePointerIdRef.current = null;
    holdStartTimeRef.current = 0;
    setHoldStartTime(0);

    actionPhaseRef.current = PHASE_IDLE;
    setActionPhase(PHASE_IDLE);
  };

  const startExplosionSequence = () => {
    if (actionPhaseRef.current !== PHASE_HOLDING) return;

    clearWindowRelease();
    clearAutoExplosionTimeout();

    setBurstKey((v) => v + 1);
    actionPhaseRef.current = PHASE_EXPLODING;
    setActionPhase(PHASE_EXPLODING);

    timersRef.current.push(
      setTimeout(() => {
        actionPhaseRef.current = PHASE_REFORMING;
        setActionPhase(PHASE_REFORMING);
      }, (explosionDuration + explodedHoldDuration) * 1000)
    );

    timersRef.current.push(
      setTimeout(() => {
        resetCycle();
      }, (explosionDuration + explodedHoldDuration + reformDuration + reformSettleBuffer) * 1000)
    );
  };

  const startHold = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (lockRef.current) return;
    if (actionPhaseRef.current !== PHASE_IDLE) return;

    clearTimers();
    clearAutoExplosionTimeout();
    clearWindowRelease();

    lockRef.current = true;
    activePointerIdRef.current = e.pointerId ?? null;
    holdStartTimeRef.current = performance.now();
    setHoldStartTime(holdStartTimeRef.current);

    actionPhaseRef.current = PHASE_HOLDING;
    setActionPhase(PHASE_HOLDING);

    autoExplosionTimeoutRef.current = setTimeout(() => {
      startExplosionSequence();
    }, HOLD_TRIGGER_DURATION * 1000);

    const handleWindowPointerUp = (ev: PointerEvent) => {
      if (actionPhaseRef.current !== PHASE_HOLDING) return;

      if (
        activePointerIdRef.current !== null &&
        ev.pointerId !== undefined &&
        ev.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      // Before 3 seconds: cancel and reset
      resetCycle();
    };

    const handleWindowPointerCancel = (ev: PointerEvent) => {
      if (actionPhaseRef.current !== PHASE_HOLDING) return;

      if (
        activePointerIdRef.current !== null &&
        ev.pointerId !== undefined &&
        ev.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      resetCycle();
    };

    window.addEventListener("pointerup", handleWindowPointerUp, { passive: true });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { passive: true });

    removeWindowReleaseRef.current = () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  };

  useEffect(() => {
    return () => {
      clearTimers();
      clearAutoExplosionTimeout();
      clearWindowRelease();
    };
  }, []);

  const backgroundColor = isLightMode ? "#ffffff" : "#111111";
  const outlineColor = isLightMode ? "#000000" : "#ffffff";
  const faceColor = isLightMode ? "#ffffff" : "#1a1a1a";
  const texturePath = isLightMode ?  DARK_TEXTURE_PATH:LIGHT_TEXTURE_PATH;

  // Shared by both CubeParticlesModelFromGLTF (the real model) and
  // CubeParticlesModelTorus (ModelErrorBoundary's fallback below) so a load
  // failure swaps shape source without the two ever drifting out of sync.
  const modelProps: CubeParticlesModelProps = {
    texturePath,
    position: ORIGIN_VECTOR,
    rotation: ORIGIN_VECTOR,
    scale: 0.25,
    particleCount: 500,
    cubeSize: 0.5,
    cubeScaleVariation: 0.01,
    modelOpacity: 0.0,
    outlineColor,
    faceColor,
    sphere,
    frontVector: FRONT_VECTOR,
    frontBiasPower: 1.2,
    backFill: 0.05,
    edgeBoost: 0.35,
    gridSnapFactor: 1,
    interactionRadius: 2.5,
    maxShrink: 1.5,
    minScaleMultiplier: 4.0,
    scaleLerp: 0.14,
    parallaxPositionStrength: 0.06,
    parallaxRotationStrength: 0.2,
    floatingCubeCount: 42,
    floatingYStartOffset: 2,
    floatingYEndOffset: 2,
    floatingZMin: -6,
    floatingZMax: 2.5,
    floatingScaleMin: 0.08,
    floatingScaleMax: 0.28,
    floatingSpeedMin: 0.08,
    floatingSpeedMax: 0.2,
    floatingRotationSpeedMax: 1.1,
    floatingXSpreadMultiplier: 1.25,
    actionPhase,
    holdStartTime,
    holdTriggerDuration: HOLD_TRIGGER_DURATION,
    burstKey,
    explosionDuration,
    explodedHoldDuration,
    reformDuration,
    explosionSpreadX: 5,
    explosionSpreadY: 5,
    explosionForwardMin: -30.5,
    explosionForwardMax: 30.2,
    explosionBackwardMin: -50.2,
    explosionBackwardMax: 44.8,
    explosionRotateMax: 1.4,
  };

  return (
    <div
      className="w-full h-screen touch-none relative overflow-hidden"
      style={{ backgroundColor }}
      onPointerDown={startHold}
    >
      <HoldCursorIndicator
        isHolding={actionPhase === PHASE_HOLDING}
        actionPhase={actionPhase}
        holdStartTime={holdStartTime}
      />

      <button
        type="button"
        onClick={() => setIsLightMode((prev) => !prev)}
        className="absolute top-6 right-6 z-20 px-4 py-2 rounded-full border text-sm font-medium backdrop-blur-md"
        style={{
          backgroundColor: isLightMode ? "rgba(255,255,255,0.9)" : "rgba(17,17,17,0.75)",
          color: isLightMode ? "#111111" : "#ffffff",
          borderColor: isLightMode ? "#111111" : "#ffffff",
        }}
      >
        {isLightMode ? "Dark mode" : "Light mode"}
      </button>

      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <CameraShakeOnHold
          actionPhase={actionPhase}
          intensity={0.04}
          rotationIntensity={0.008}
          frequency={18}
          smooth={0.08}
        />

        <Suspense fallback={null}>
          <ModelErrorBoundary fallback={<CubeParticlesModelTorus {...modelProps} />}>
            <CubeParticlesModelFromGLTF modelPath={HYPERIUX_MODEL_PATH} {...modelProps} />
          </ModelErrorBoundary>
          <Environment preset="city" />
        </Suspense>

        <OrbitControls enabled={actionPhase === PHASE_IDLE} />
      </Canvas>
    </div>
  );
}

export default HyperiuxLogo;
