"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, extend, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { createVisibilityGate } from "./createSuspendedRaf";

const INITIAL_POINTER = 0.5;
const MOVEMENT_THRESHOLD = 0.001;
const DEFAULT_GRID_SIZE = 35;
const DEFAULT_LERP = 0.1;
const DEFAULT_CUBE_SIZE = 1;
const DEFAULT_GRID_EMBOSSING = 1;
const VELOCITY_BLEND_CURRENT = 0.8;
const VELOCITY_BLEND_NEXT = 0.2;
const ACTIVE_HOVER_LERP = 0.06;
const IDLE_HOVER_LERP = 0.008;
const TRAIL_STRENGTH_LERP = 0.1;
const TRAIL_STRENGTH_SCALE = 50;
const TRAIL_STRENGTH_BASE = 0.3;
const MOVE_IDLE_MS = 500;
const COLOR_INTERVAL_MIN_MS = 1200;
const COLOR_INTERVAL_RANGE_MS = 5000;
const COLOR_LERP = 0.1;
const MAX_DIST = 2;
const TIME_SCALE = 0.003;
const WAVE_FREQUENCY = 8;
const WAVE_SPEED = 3;
const WAVE_STRENGTH = 0.15;
const VELOCITY_INFLUENCE_SCALE = 100;
const DEFORMATION_SCALE = 0.3;
const PLANE_ARGS: [number, number, number, number] = [18, 12, 200, 200];
const CUBE_ARGS: [number, number, number, number, number, number] = [1, 1, 1, 20, 20, 20];
const BLOOM_INTENSITY = 1;
const BLOOM_THRESHOLD = 1.5;
const BLOOM_SMOOTHING = 0.5;
const DEFAULT_NOTICE_TEXT =
  "Best on desktop: whip your mouse to see the trail snap, bloom, and bend the grid.";
const DEFAULT_COLOR_OPTIONS = [
  {
    color: "#39FF14",
    emissive: "#39FF14",
  },
  {
    color: "aqua",
    emissive: "aqua",
  },
  {
    color: "#FFD600",
    emissive: "#FFD600",
  },
];

const PIXEL_TRAIL_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vPosition;

  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform vec2 uMouseVelocity;
  uniform float uTrailStrength;
  uniform float uGridEmbossing;

  float noise2D(vec2 p) {
    vec2 ip = floor(p);
    vec2 f = fract(p);
    f = f * (3.0 - 2.0 * f);
    float n00 = sin(dot(ip, vec2(12.9898, 78.233)));
    float n10 = sin(dot(ip + vec2(1.0, 0.0), vec2(12.9898, 78.233)));
    float n01 = sin(dot(ip + vec2(0.0, 1.0), vec2(12.9898, 78.233)));
    float n11 = sin(dot(ip + vec2(1.0, 1.0), vec2(12.9898, 78.233)));
    float nx0 = mix(n00, n10, f.x);
    float nx1 = mix(n01, n11, f.x);
    return mix(nx0, nx1, f.y) * 0.5 + 0.5;
  }

  float easeInOutCubic(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  float trailDistance(vec2 point, vec2 mousePos, vec2 velocity) {
    vec2 toPoint = point - mousePos;
    float velocityMag = length(velocity);

    if (velocityMag < 0.001) {
      return length(toPoint);
    }

    vec2 velocityDir = normalize(velocity);
    float alongTrail = dot(toPoint, velocityDir);
    float perpDist = length(toPoint - velocityDir * alongTrail);
    float trailLength = velocityMag * 15.0;

    if (alongTrail > 0.0 && alongTrail < trailLength) {
      return perpDist;
    }

    if (alongTrail <= 0.0) {
      return length(toPoint);
    }

    return length(toPoint - velocityDir * trailLength);
  }

  void main() {
    vUv = uv;
    vPosition = position;

    vec3 pos = position;
    vec2 pixelUV = floor(uv * uBasePixels) / uBasePixels;
    float dist = trailDistance(pixelUV, uMouse, uMouseVelocity);
    float hoverRadius = 0.15 + length(uMouseVelocity) * 0.3;
    float hoverEffect = smoothstep(hoverRadius, 0.0, dist) * uHover * uTrailStrength;
    float noiseValue = noise2D(pixelUV * 8.0 + uTime * 0.3);
    float maxExtrusion = 0.8 * uGridEmbossing;
    float extrusion = hoverEffect * (0.6 + noiseValue * 0.4) * maxExtrusion;
    float animationDelay = dist * 2.0;
    float animatedHover = max(0.0, uHover - animationDelay * 0.1);

    hoverEffect = easeInOutCubic(hoverEffect);
    animatedHover = clamp(animatedHover * 1.5, 0.0, 1.0);
    extrusion *= easeInOutCubic(animatedHover);

    pos.z += extrusion;
    pos.x += sin(pixelUV.x * 40.0) * hoverEffect * 0.008;
    pos.y += cos(pixelUV.y * 40.0) * hoverEffect * 0.008;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const PIXEL_TRAIL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uHover;
  uniform float uBasePixels;
  uniform vec2 uMouseVelocity;
  uniform float uTrailStrength;
  uniform float uGridEmbossing;

  varying vec2 vUv;
  varying vec3 vPosition;

  float trailDistance(vec2 point, vec2 mousePos, vec2 velocity) {
    vec2 toPoint = point - mousePos;
    float velocityMag = length(velocity);

    if (velocityMag < 0.001) {
      return length(toPoint);
    }

    vec2 velocityDir = normalize(velocity);
    float alongTrail = dot(toPoint, velocityDir);
    float perpDist = length(toPoint - velocityDir * alongTrail);
    float trailLength = velocityMag * 15.0;

    if (alongTrail > 0.0 && alongTrail < trailLength) {
      return perpDist;
    }

    if (alongTrail <= 0.0) {
      return length(toPoint);
    }

    return length(toPoint - velocityDir * trailLength);
  }

  float easeInOutCubic(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    vec2 uv = vUv;
    vec2 pixelUV = floor(uv * uBasePixels) / uBasePixels;
    float dist = trailDistance(pixelUV, uMouse, uMouseVelocity);
    float hoverRadius = 0.15 + length(uMouseVelocity) * 0.3;
    float hoverEffect = smoothstep(hoverRadius, 0.0, dist) * uHover * uTrailStrength;
    float depthShading = 1.0 + vPosition.z * 0.3 * uGridEmbossing;
    vec3 topColor = vec3(0.0, 0.0, 0.0);
    vec3 sideColor = vec3(0.01, 0.01, 0.01);
    float topFaceFactor = smoothstep(0.7, 1.0, normalize(vPosition).z);
    vec3 cubeColor = mix(sideColor, topColor, topFaceFactor);
    float light = 0.5 + 0.5 * dot(
      normalize(vec3(0.3, 0.5, 1.0)),
      normalize(vPosition + vec3(0.0, 0.0, 1.0))
    );
    vec2 pixelCenter = (floor(uv * uBasePixels) + 0.5) / uBasePixels;
    vec2 pixelOffset = abs(uv - pixelCenter) * uBasePixels;
    float border = step(0.45, max(pixelOffset.x, pixelOffset.y));
    float vig = 1.0 - smoothstep(0.3, 3.2, length(uv - 0.5) * 2.0);

    hoverEffect = easeInOutCubic(hoverEffect);
    cubeColor *= light;
    cubeColor = mix(cubeColor, vec3(0.0), border * 0.9);
    cubeColor *= mix(1.0, vig, 0.6);

    gl_FragColor = vec4(cubeColor * depthShading, 1.0);
  }
`;

const CUBE_DEFORM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CUBE_DEFORM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uEmissive;
  uniform float uEmissiveIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 baseColor = uColor;
    vec3 litColor = baseColor * (0.3 + 0.7 * diff);
    vec3 finalColor = litColor + (uEmissive * uEmissiveIntensity * 0.9);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

class PixelTrailMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(INITIAL_POINTER, INITIAL_POINTER) },
        uHover: { value: 0.0 },
        uBasePixels: { value: 35.0 },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uTrailStrength: { value: 0.0 },
        uGridEmbossing: { value: DEFAULT_GRID_EMBOSSING },
      },
      vertexShader: PIXEL_TRAIL_VERT,
      fragmentShader: PIXEL_TRAIL_FRAG,
    });
  }
}

class CubeDeformMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.Color, emissive: THREE.Color) {
    super({
      uniforms: {
        uColor: { value: color },
        uEmissive: { value: emissive },
        uEmissiveIntensity: { value: 2.4 },
      },
      vertexShader: CUBE_DEFORM_VERT,
      fragmentShader: CUBE_DEFORM_FRAG,
    });
  }
}

extend({ PixelTrailMaterial, CubeDeformMaterial });

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue)
    ? Math.min(max, Math.max(min, numericValue))
    : fallback;
}

// Custom shader materials registered via extend() aren't part of
// JSX.IntrinsicElements; reference them through any-typed tags so JSX
// accepts them without changing what's rendered.
const PixelTrailMaterialTag = "pixelTrailMaterial" as any;
const CubeDeformMaterialTag = "cubeDeformMaterial" as any;

interface PointerVec2Ref {
  mousePositionRef: RefObject<{ x: number, y: number }>
  mouseVelocityRef: RefObject<{ x: number, y: number }>
  trailStrengthRef: RefObject<number>
}

interface PixelGridProps extends PointerVec2Ref {
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  gridEmbossing?: number;
}

function PixelGrid({
  mousePositionRef,
  mouseVelocityRef,
  trailStrengthRef,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  gridEmbossing = DEFAULT_GRID_EMBOSSING,
}: PixelGridProps) {
  const materialRef = useRef<PixelTrailMaterial | null>(null);
  const pointerTargetRef = useRef({ x: INITIAL_POINTER, y: INITIAL_POINTER });
  const pointerCurrentRef = useRef({ x: INITIAL_POINTER, y: INITIAL_POINTER });
  const lastPointerRef = useRef({ x: INITIAL_POINTER, y: INITIAL_POINTER });
  const isMovingRef = useRef(false);
  const lastMoveTimeRef = useRef(0);
  const safeGridSize = clampNumber(gridSize, 8, 90, DEFAULT_GRID_SIZE);
  const safeLerp = clampNumber(lerp, 0.01, 0.6, DEFAULT_LERP);
  const safeGridEmbossing = clampNumber(
    gridEmbossing,
    0,
    2,
    DEFAULT_GRID_EMBOSSING
  );

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!mouseInteraction || !event.uv) return;
    const [u, v] = [event.uv!.x, event.uv!.y];
    const currentTime = Date.now();
    const deltaX = Math.abs(u - lastPointerRef.current.x);
    const deltaY = Math.abs(v - lastPointerRef.current.y);
    const hasMoved =
      deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD;

    if (hasMoved) {
      pointerTargetRef.current.x = u;
      pointerTargetRef.current.y = v;
      lastPointerRef.current.x = u;
      lastPointerRef.current.y = v;
      lastMoveTimeRef.current = currentTime;
      isMovingRef.current = true;
    }

    mousePositionRef.current.x = u;
    mousePositionRef.current.y = v;
  };

  useFrame((state) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    // Animation loop
    const time = state.clock.getElapsedTime();
    const currentTime = Date.now();
    const timeSinceLastMove = currentTime - lastMoveTimeRef.current;

    material.uniforms.uTime.value = time;
    material.uniforms.uBasePixels.value = safeGridSize;
    material.uniforms.uGridEmbossing.value = safeGridEmbossing;

    if (!mouseInteraction) {
      pointerTargetRef.current.x = INITIAL_POINTER;
      pointerTargetRef.current.y = INITIAL_POINTER;
      isMovingRef.current = false;
    }

    if (timeSinceLastMove > MOVE_IDLE_MS) {
      isMovingRef.current = false;
    }

    const previousX = pointerCurrentRef.current.x;
    const previousY = pointerCurrentRef.current.y;

    pointerCurrentRef.current.x +=
      (pointerTargetRef.current.x - pointerCurrentRef.current.x) * safeLerp;
    pointerCurrentRef.current.y +=
      (pointerTargetRef.current.y - pointerCurrentRef.current.y) * safeLerp;

    const velocityX = pointerCurrentRef.current.x - previousX;
    const velocityY = pointerCurrentRef.current.y - previousY;

    mouseVelocityRef.current.x =
      mouseVelocityRef.current.x * VELOCITY_BLEND_CURRENT +
      velocityX * VELOCITY_BLEND_NEXT;
    mouseVelocityRef.current.y =
      mouseVelocityRef.current.y * VELOCITY_BLEND_CURRENT +
      velocityY * VELOCITY_BLEND_NEXT;

    material.uniforms.uMouse.value.set(
      pointerCurrentRef.current.x,
      pointerCurrentRef.current.y
    );
    material.uniforms.uMouseVelocity.value.set(
      mouseVelocityRef.current.x,
      mouseVelocityRef.current.y
    );

    const hoverValue = material.uniforms.uHover.value;
    const nextHover = isMovingRef.current ? 1 : 0;
    const hoverLerp = isMovingRef.current ? ACTIVE_HOVER_LERP : IDLE_HOVER_LERP;
    material.uniforms.uHover.value += (nextHover - hoverValue) * hoverLerp;

    const velocityMagnitude = Math.sqrt(
      velocityX * velocityX + velocityY * velocityY
    );
    const nextTrail = mouseInteraction
      ? Math.min(
          1,
          velocityMagnitude * TRAIL_STRENGTH_SCALE + TRAIL_STRENGTH_BASE
        )
      : 0;

    trailStrengthRef.current +=
      (nextTrail - trailStrengthRef.current) * TRAIL_STRENGTH_LERP;
    material.uniforms.uTrailStrength.value = trailStrengthRef.current;

    mousePositionRef.current.x = pointerCurrentRef.current.x;
    mousePositionRef.current.y = pointerCurrentRef.current.y;
  });

  return (
    <mesh onPointerMove={onPointerMove}>
      <planeGeometry args={PLANE_ARGS} />
      <PixelTrailMaterialTag ref={materialRef} />
    </mesh>
  );
}

interface DeformingCubeColorOption {
  color: string
  emissive?: string
}

interface DeformingCubeProps extends PointerVec2Ref {
  colorOptions: DeformingCubeColorOption[];
  mouseInteraction?: boolean;
  lerp?: number;
  cubeSize?: number;
  gridEmbossing?: number;
}

function DeformingCube({
  mousePositionRef,
  mouseVelocityRef,
  trailStrengthRef,
  colorOptions,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  cubeSize = DEFAULT_CUBE_SIZE,
  gridEmbossing = DEFAULT_GRID_EMBOSSING,
}: DeformingCubeProps) {
  const cubeRef = useRef<THREE.Mesh | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const materialRef = useRef<CubeDeformMaterial | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const parsedColorOptions = useMemo(
    () => {
      const palette = colorOptions.length ? colorOptions : DEFAULT_COLOR_OPTIONS;

      return palette.map((option: DeformingCubeColorOption) => ({
        color: new THREE.Color(option.color),
        emissive: new THREE.Color(option.emissive ?? option.color),
      }));
    },
    [colorOptions]
  );
  const colorStateRef = useRef({
    current: parsedColorOptions[0].color.clone(),
    target: parsedColorOptions[0].color.clone(),
    currentEmissive: parsedColorOptions[0].emissive.clone(),
    targetEmissive: parsedColorOptions[0].emissive.clone(),
    lastSwitch: 0,
    interval: 0,
  });
  const { camera } = useThree();
  const safeLerp = clampNumber(lerp, 0.01, 0.6, DEFAULT_LERP);
  const safeCubeSize = clampNumber(cubeSize, 0.5, 2.2, DEFAULT_CUBE_SIZE);
  const safeGridEmbossing = clampNumber(
    gridEmbossing,
    0,
    2,
    DEFAULT_GRID_EMBOSSING
  );

  useEffect(() => {
    colorStateRef.current.current.copy(parsedColorOptions[0].color);
    colorStateRef.current.target.copy(parsedColorOptions[0].color);
    colorStateRef.current.currentEmissive.copy(parsedColorOptions[0].emissive);
    colorStateRef.current.targetEmissive.copy(parsedColorOptions[0].emissive);
  }, [parsedColorOptions]);

  useEffect(() => {
    if (colorStateRef.current.lastSwitch === 0) {
      colorStateRef.current.lastSwitch = Date.now();
    }

    if (colorStateRef.current.interval === 0) {
      colorStateRef.current.interval =
        COLOR_INTERVAL_MIN_MS + Math.random() * COLOR_INTERVAL_RANGE_MS;
    }
  }, []);

  useEffect(() => {
    if (!cubeRef.current) {
      return;
    }

    geometryRef.current = cubeRef.current.geometry;
    originalPositionsRef.current = cubeRef.current.geometry.attributes.position.array.slice() as Float32Array;
  }, []);

  useFrame(() => {
    if (!cubeRef.current || !geometryRef.current || !originalPositionsRef.current) {
      return;
    }

    // Color state
    const now = Date.now();
    if (now - colorStateRef.current.lastSwitch > colorStateRef.current.interval) {
      let nextIndex = Math.floor(Math.random() * parsedColorOptions.length);
      const currentIndex = parsedColorOptions.findIndex((option) =>
        option.emissive.equals(colorStateRef.current.targetEmissive)
      );

      if (nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % parsedColorOptions.length;
      }

      colorStateRef.current.target.copy(parsedColorOptions[nextIndex].color);
      colorStateRef.current.targetEmissive.copy(
        parsedColorOptions[nextIndex].emissive
      );
      colorStateRef.current.lastSwitch = now;
      colorStateRef.current.interval =
        COLOR_INTERVAL_MIN_MS + Math.random() * COLOR_INTERVAL_RANGE_MS;
    }

    colorStateRef.current.current.lerp(
      colorStateRef.current.target,
      COLOR_LERP
    );
    colorStateRef.current.currentEmissive.lerp(
      colorStateRef.current.targetEmissive,
      COLOR_LERP
    );

    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value.copy(
        colorStateRef.current.current
      );
      materialRef.current.uniforms.uEmissive.value.copy(
        colorStateRef.current.currentEmissive
      );
    }

    // Rotation
    const mouseX = mouseInteraction
      ? mousePositionRef.current.x
      : INITIAL_POINTER;
    const mouseY = mouseInteraction
      ? mousePositionRef.current.y
      : INITIAL_POINTER;
    targetRotationRef.current.x = ((mouseY - 0.5) * Math.PI) / 2;
    targetRotationRef.current.y = ((mouseX - 0.5) * Math.PI) / 1.5;

    currentRotationRef.current.x +=
      (targetRotationRef.current.x - currentRotationRef.current.x) *
      safeLerp;
    currentRotationRef.current.y +=
      (targetRotationRef.current.y - currentRotationRef.current.y) *
      safeLerp;

    cubeRef.current.rotation.x = currentRotationRef.current.x;
    cubeRef.current.rotation.y = currentRotationRef.current.y;

    // Screen-space distance
    const cubeWorldPosition = new THREE.Vector3();
    cubeRef.current.getWorldPosition(cubeWorldPosition);
    cubeWorldPosition.project(camera);

    const cubeScreenX = (cubeWorldPosition.x + 1) / 2;
    const cubeScreenY = (cubeWorldPosition.y + 1) / 2;
    const distToCube = Math.sqrt(
      Math.pow(mousePositionRef.current.x - cubeScreenX, 2) +
        Math.pow(mousePositionRef.current.y - cubeScreenY, 2)
    );
    const deformStrength =
      Math.max(0, 1 - distToCube / MAX_DIST) * trailStrengthRef.current;

    // Geometry deformation
    const positions = geometryRef.current.attributes.position.array;
    const time = Date.now() * TIME_SCALE;

    for (let index = 0; index < positions.length; index += 3) {
      const x = originalPositionsRef.current[index];
      const y = originalPositionsRef.current[index + 1];
      const z = originalPositionsRef.current[index + 2];
      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      const wave =
        Math.sin(distFromCenter * WAVE_FREQUENCY - time * WAVE_SPEED) *
        WAVE_STRENGTH;
      const ripple = wave * deformStrength;
      const velocityInfluence =
        (x * mouseVelocityRef.current.x + y * mouseVelocityRef.current.y) *
        VELOCITY_INFLUENCE_SCALE;
      const deformation =
        (ripple + velocityInfluence * deformStrength) *
        DEFORMATION_SCALE *
        safeGridEmbossing;

      positions[index] = x + x * deformation;
      positions[index + 1] = y + y * deformation;
      positions[index + 2] = z + z * deformation;
    }

    geometryRef.current.attributes.position.needsUpdate = true;
    geometryRef.current.computeVertexNormals();
  });

  return (
    <mesh
      ref={cubeRef}
      position={[0, 0, 1]}
      scale={[safeCubeSize, safeCubeSize, safeCubeSize]}
      layers={1}
    >
      <boxGeometry args={CUBE_ARGS} />
      <CubeDeformMaterialTag
        ref={materialRef}
        args={[new THREE.Color("#ffffff"), new THREE.Color("#ffffff")]}
      />
    </mesh>
  );
}

interface EnhancedPixelCubeProps {
  notice?: string;
  colorOptions?: DeformingCubeColorOption[];
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  cubeSize?: number;
  gridEmbossing?: number;
}

export default function EnhancedPixelCube({
  notice = DEFAULT_NOTICE_TEXT,
  colorOptions = DEFAULT_COLOR_OPTIONS,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  cubeSize = DEFAULT_CUBE_SIZE,
  gridEmbossing = DEFAULT_GRID_EMBOSSING,
}: EnhancedPixelCubeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const mousePositionRef = useRef({ x: INITIAL_POINTER, y: INITIAL_POINTER });
  const mouseVelocityRef = useRef({ x: 0, y: 0 });
  const trailStrengthRef = useRef(0);

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? "always" : "never"),
    });
    setFrameloop(gate.isActive ? "always" : "never");
    return () => gate.destroy();
  }, []);

  return (
    <div ref={rootRef} style={{ width: "100vw", height: "100vh", background: "#000" }}>
      <div className="pointer-events-none absolute left-1/2 top-30 z-10 hidden w-full -translate-x-1/2 px-5 pt-5 max-[1025px]:flex max-[1025px]:justify-center max-md:left-0 max-md:block max-md:translate-x-0">
        <p className="inline-flex max-w-[92vw] rounded-sm border border-white/15 bg-black/40 px-4 py-2 font-medium text-white/75 backdrop-blur max-[1025px]:text-center max-[1025px]:text-[2.8vw] max-md:text-[3.5vw]">
          {notice}
        </p>
      </div>

      <Canvas
        aria-hidden="true"
        camera={{ position: [0, 0, 4], fov: 75 }}
        gl={{ antialias: true }}
        frameloop={frameloop}
        onCreated={({ gl, camera }) => {
          gl.setClearColor("#000000");
          camera.layers.enable(1);
        }}
      >
        <PixelGrid
          mousePositionRef={mousePositionRef}
          mouseVelocityRef={mouseVelocityRef}
          trailStrengthRef={trailStrengthRef}
          gridSize={gridSize}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
          gridEmbossing={gridEmbossing}
        />

        <EffectComposer>
          <Bloom
            intensity={BLOOM_INTENSITY}
            luminanceThreshold={BLOOM_THRESHOLD}
            luminanceSmoothing={BLOOM_SMOOTHING}
            height={0}
            layers={[1]}
          />
        </EffectComposer>

        <DeformingCube
          mousePositionRef={mousePositionRef}
          mouseVelocityRef={mouseVelocityRef}
          trailStrengthRef={trailStrengthRef}
          colorOptions={colorOptions}
          mouseInteraction={mouseInteraction}
          lerp={lerp}
          cubeSize={cubeSize}
          gridEmbossing={gridEmbossing}
        />
      </Canvas>
    </div>
  );
}
