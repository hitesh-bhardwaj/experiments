// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import { Center, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

// ---- MorphingParticleModelNew.tsx ----





function buildMergedSurface(scene: THREE.Object3D) {
  const meshes: THREE.BufferGeometry[] = [];

  scene.updateMatrixWorld(true);

  scene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry) return;

    const geometry = child.geometry.clone();
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    const pos = nonIndexed.attributes.position;

    if (!pos) {
      geometry.dispose();
      if (nonIndexed !== geometry) nonIndexed.dispose?.();
      return;
    }

    const worldPositions = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(child.matrixWorld);
      worldPositions[i * 3 + 0] = v.x;
      worldPositions[i * 3 + 1] = v.y;
      worldPositions[i * 3 + 2] = v.z;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute(
      "position",
      new THREE.BufferAttribute(worldPositions, 3)
    );
    merged.computeVertexNormals();

    meshes.push(merged);

    geometry.dispose();
    if (nonIndexed !== geometry) nonIndexed.dispose?.();
  });

  if (!meshes.length) return null;
  if (meshes.length === 1) return meshes[0];

  const totalCount = meshes.reduce(
    (sum, g) => sum + g.attributes.position.count,
    0
  );

  const mergedPositions = new Float32Array(totalCount * 3);
  const mergedNormals = new Float32Array(totalCount * 3);

  let offset = 0;

  for (const g of meshes) {
    mergedPositions.set(g.attributes.position.array, offset * 3);
    mergedNormals.set(g.attributes.normal.array, offset * 3);
    offset += g.attributes.position.count;
    g.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(mergedPositions, 3)
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(mergedNormals, 3)
  );

  return geometry;
}

export type GlitterGeometry = "model" | "sphere" | "torus" | "torusKnot" | "icosahedron" | "box"

// World-space radius the primitive shapes are built at (before the group's
// scale is applied), so they read at roughly the same size as the model.
const PRIMITIVE_WORLD_RADIUS = 1.3

function buildPrimitiveGeometry(kind: GlitterGeometry, radius: number): THREE.BufferGeometry {
  switch (kind) {
    case "torus":
      return new THREE.TorusGeometry(radius * 0.8, radius * 0.32, 64, 160)
    case "torusKnot":
      return new THREE.TorusKnotGeometry(radius * 0.7, radius * 0.22, 220, 32)
    case "icosahedron":
      return new THREE.IcosahedronGeometry(radius, 1)
    case "box":
      return new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5)
    default:
      return new THREE.SphereGeometry(radius, 96, 64)
  }
}

interface MorphingParticleModelProps {
  url?: string
  /** "model" samples the GLB; anything else samples a built-in shape. */
  geometry?: GlitterGeometry
  scale?: number
  particleCount?: number
  color?: string
  size?: number
  speed?: number
  opacity?: number
  brightness?: number
  showModel?: boolean
  modelOpacity?: number
  parallaxStrength?: number
  parallaxLerp?: number
  rotationStrengthX?: number
  rotationStrengthY?: number
  rotationStrengthZ?: number
  rotationLerp?: number
  interactionRadius?: number
  interactionStrength?: number
  interactionDepth?: number
  interactionLerp?: number
  returnLerp?: number
  cursorLerp?: number
  maxOffset?: number
  frontFacingThreshold?: number
  frontFacingSoftness?: number
}

interface ParticleBuffers {
  positions: Float32Array
  normals: Float32Array
  meta: Float32Array
  count: number
  basePositions: Float32Array
  currentPositions: Float32Array
}

const MorphingParticleModel = ({
  url = "/assets/models/hyperiux-new-model.glb",
  geometry = "model",
  scale = 1,
  particleCount = 8000,
  color = "#ffffff",
  size = 0.18,
  speed = 1.15,
  opacity = 1,
  brightness = 4.5,

  showModel = false,
  modelOpacity = 0,

  parallaxStrength = 0.12,
  parallaxLerp = 0.08,

  rotationStrengthX = 0.12,
  rotationStrengthY = 0.18,
  rotationStrengthZ = 0.04,
  rotationLerp = 0.08,

  interactionRadius = 1.8,
  interactionStrength = 2.24,
  interactionDepth = 0.04,
  interactionLerp = 0.18,
  returnLerp = 0.012,
  cursorLerp = 0.2,
  maxOffset = 1.22,

  frontFacingThreshold = 0.12,
  frontFacingSoftness = 0.05,
}: MorphingParticleModelProps) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const pointsRef = useRef<any>(null);

  const { scene } = useGLTF(url);
  const { pointer, camera } = useThree();

  const reduceMotionRef = useRef(
    Boolean(
      typeof window !== "undefined" &&
        (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
    )
  );

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (event: MediaQueryListEvent) => {
      reduceMotionRef.current = event.matches;
    };
    reduceMotionRef.current = mq.matches;
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const particleBuffersRef = useRef<ParticleBuffers | null>(null);
  const [particleBuffers, setParticleBuffers] = useState<ParticleBuffers | null>(null);

  const basePositionsRef = useRef<Float32Array | null>(null);
  const currentPositionsRef = useRef<Float32Array | null>(null);
  const metaRef = useRef<Float32Array | null>(null);
  const normalsRef = useRef<Float32Array | null>(null);
  const countRef = useRef(0);

  useEffect(() => {
    const mergedGeometry =
      geometry === "model"
        ? scene
          ? buildMergedSurface(scene)
          : null
        : buildPrimitiveGeometry(geometry, PRIMITIVE_WORLD_RADIUS / Math.max(scale, 0.0001));
    if (!mergedGeometry) return;

    const tempMesh = new THREE.Mesh(mergedGeometry, new THREE.MeshBasicMaterial());
    const sampler = new MeshSurfaceSampler(tempMesh).build();

    const positions = new Float32Array(particleCount * 3);
    const normals = new Float32Array(particleCount * 3);
    const meta = new Float32Array(particleCount * 2);

    const pos = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i < particleCount; i++) {
      sampler.sample(pos, normal);

      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      normals[i * 3 + 0] = normal.x;
      normals[i * 3 + 1] = normal.y;
      normals[i * 3 + 2] = normal.z;

      meta[i * 2 + 0] = Math.random();
      meta[i * 2 + 1] = Math.abs(normal.z) > 0.5 ? 1 : 0;
    }

    mergedGeometry.dispose();
    tempMesh.material.dispose();

    const basePositions = new Float32Array(positions);
    const currentPositions = new Float32Array(positions);

    const nextBuffers = {
      positions: currentPositions,
      normals,
      meta,
      count: particleCount,
      basePositions,
      currentPositions,
    };

    particleBuffersRef.current = nextBuffers;
    basePositionsRef.current = basePositions;
    currentPositionsRef.current = currentPositions;
    normalsRef.current = normals;
    metaRef.current = meta;
    countRef.current = particleCount;

    Promise.resolve().then(() => setParticleBuffers(nextBuffers));
  }, [scene, particleCount, geometry, scale]);

  const parallaxTarget = useRef(new THREE.Vector3());
  const parallaxCurrent = useRef(new THREE.Vector3());

  const rotationTarget = useRef(new THREE.Euler(0, 0, 0));
  const rotationCurrent = useRef(new THREE.Euler(0, 0, 0));

  const raycasterRef = useRef(new THREE.Raycaster());
  const hitPointWorldRef = useRef(new THREE.Vector3());
  const hitPointLocalRef = useRef(new THREE.Vector3());
  const smoothHitPointLocalRef = useRef(new THREE.Vector3());
  const prevSmoothHitPointLocalRef = useRef(new THREE.Vector3());

  const planeNormalRef = useRef(new THREE.Vector3());
  const planePointRef = useRef(new THREE.Vector3());
  const groupWorldQuatRef = useRef(new THREE.Quaternion());

  const cursorVelocityLocalRef = useRef(new THREE.Vector3());
  const hasPrevHitRef = useRef(false);

  const tempTarget = useRef(new THREE.Vector3());
  const tempOffset = useRef(new THREE.Vector3());
  const tempCursorDir = useRef(new THREE.Vector3());

  useEffect(() => {
    scene.traverse((child: any) => {
      if (!child.isMesh || !child.material) return;
      child.material = child.material.clone();
      child.material.transparent = true;
      child.material.opacity = showModel ? modelOpacity : 0;
      child.material.depthWrite = false;
      child.visible = showModel;
    });
  }, [scene, showModel, modelOpacity]);

  const shaderArgs = useMemo(() => {
    return {
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size },
        uSpeed: { value: speed },
        uOpacity: { value: opacity },
        uBrightness: { value: brightness },
        uFrontFacingThreshold: { value: frontFacingThreshold },
        uFrontFacingSoftness: { value: frontFacingSoftness },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uSpeed;
        uniform float uFrontFacingThreshold;
        uniform float uFrontFacingSoftness;

        attribute vec2 aMeta;
        attribute vec3 aNormal;

        varying float vTransition;
        varying float vEdge;
        varying float vFacing;

        void main() {
          float rand = aMeta.x;
          vEdge = aMeta.y;

          float phase = rand * 6.2831853 + (position.x * 1.2 + position.y * 1.2 + position.z * 1.2);
          vTransition = sin(uTime * uSpeed + phase) * 0.5 + 0.5;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          vec3 viewNormal = normalize(normalMatrix * aNormal);
          vec3 viewDir = normalize(-mvPosition.xyz);

          float facingDot = dot(viewNormal, viewDir);

          vFacing = smoothstep(
            uFrontFacingThreshold - uFrontFacingSoftness,
            uFrontFacingThreshold + uFrontFacingSoftness,
            facingDot
          );

          float pointSize = uSize * (300.0 / -mvPosition.z);
          pointSize *= mix(1.0, 1.02, vEdge);
          pointSize *= vFacing;

          gl_PointSize = pointSize;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uBrightness;

        varying float vTransition;
        varying float vEdge;
        varying float vFacing;

        void main() {
          if (vFacing < 0.01) discard;

          vec2 uv = gl_PointCoord - 0.5;

          float diamondScale = 1.0 - vTransition;
          float dDiamond = abs(uv.x) + abs(uv.y);
          float maskDiamond = step(dDiamond, 0.42 * diamondScale);

          float crossScale = vTransition;
          float thickness = mix(0.015, 0.017, vEdge);
          float lineX = step(abs(uv.x), thickness) * step(abs(uv.y), 0.44 * crossScale);
          float lineY = step(abs(uv.y), thickness) * step(abs(uv.x), 0.44 * crossScale);
          float maskCross = clamp(lineX + lineY, 0.0, 1.0);

          float finalMask = max(maskDiamond, maskCross);
          if (finalMask < 0.1) discard;

          float intensity = mix(1.0, 1.03, vEdge);
          gl_FragColor = vec4(uColor * uBrightness * intensity, uOpacity * vFacing);
        }
      `,
    };
  }, [
    color,
    size,
    speed,
    opacity,
    brightness,
    frontFacingThreshold,
    frontFacingSoftness,
  ]);

  useEffect(() => {
    const uniforms = pointsRef.current?.material?.uniforms;
    if (!uniforms) return;

    uniforms.uColor.value.set(color);
    uniforms.uSize.value = size;
    uniforms.uSpeed.value = speed;
    uniforms.uOpacity.value = opacity;
    uniforms.uBrightness.value = brightness;
    uniforms.uFrontFacingThreshold.value = frontFacingThreshold;
    uniforms.uFrontFacingSoftness.value = frontFacingSoftness;
  }, [
    color,
    size,
    speed,
    opacity,
    brightness,
    frontFacingThreshold,
    frontFacingSoftness,
  ]);

  useFrame((state) => {
    if (!pointsRef.current || !currentPositionsRef.current || !basePositionsRef.current) {
      return;
    }

    pointsRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;

    if (groupRef.current) {
      if (reduceMotionRef.current) {
        // Reduced-motion: freeze mouse parallax / tilt at rest.
        parallaxTarget.current.set(0, 0, 0);
        parallaxCurrent.current.set(0, 0, 0);
        rotationTarget.current.set(0, 0, 0);
        rotationCurrent.current.set(0, 0, 0);
        groupRef.current.position.x = 0;
        groupRef.current.position.y = 0;
        groupRef.current.rotation.set(0, 0, 0);
      } else {
        parallaxTarget.current.set(
          pointer.x * parallaxStrength,
          pointer.y * parallaxStrength,
          0
        );
        parallaxCurrent.current.lerp(parallaxTarget.current, parallaxLerp);

        groupRef.current.position.x = parallaxCurrent.current.x;
        groupRef.current.position.y = parallaxCurrent.current.y;

        rotationTarget.current.x = -pointer.y * rotationStrengthX;
        rotationTarget.current.y = pointer.x * rotationStrengthY;
        rotationTarget.current.z = pointer.x * rotationStrengthZ;

        rotationCurrent.current.x = THREE.MathUtils.lerp(
          rotationCurrent.current.x,
          rotationTarget.current.x,
          rotationLerp
        );
        rotationCurrent.current.y = THREE.MathUtils.lerp(
          rotationCurrent.current.y,
          rotationTarget.current.y,
          rotationLerp
        );
        rotationCurrent.current.z = THREE.MathUtils.lerp(
          rotationCurrent.current.z,
          rotationTarget.current.z,
          rotationLerp
        );

        groupRef.current.rotation.x = rotationCurrent.current.x;
        groupRef.current.rotation.y = rotationCurrent.current.y;
        groupRef.current.rotation.z = rotationCurrent.current.z;
      }
    }

    const group = groupRef.current as THREE.Group;

    group.updateWorldMatrix(true, false);
    group.getWorldPosition(planePointRef.current);
    group.getWorldQuaternion(groupWorldQuatRef.current);

    planeNormalRef.current
      .set(0, 0, 1)
      .applyQuaternion(groupWorldQuatRef.current)
      .normalize();

    raycasterRef.current.setFromCamera(pointer, camera);

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormalRef.current,
      planePointRef.current
    );

    let hasPlaneHit = false;
    let isActivelyMoving = false;

    if (
      !reduceMotionRef.current &&
      raycasterRef.current.ray.intersectPlane(plane, hitPointWorldRef.current)
    ) {
      hitPointLocalRef.current.copy(hitPointWorldRef.current);
      group.worldToLocal(hitPointLocalRef.current);

      if (!hasPrevHitRef.current) {
        smoothHitPointLocalRef.current.copy(hitPointLocalRef.current);
        prevSmoothHitPointLocalRef.current.copy(hitPointLocalRef.current);
        hasPrevHitRef.current = true;
      }

      prevSmoothHitPointLocalRef.current.copy(smoothHitPointLocalRef.current);
      smoothHitPointLocalRef.current.lerp(hitPointLocalRef.current, cursorLerp);

      cursorVelocityLocalRef.current.subVectors(
        smoothHitPointLocalRef.current,
        prevSmoothHitPointLocalRef.current
      );

      hasPlaneHit = true;

      if (cursorVelocityLocalRef.current.length() > 0.0015) {
        isActivelyMoving = true;
      }
    } else {
      cursorVelocityLocalRef.current.set(0, 0, 0);
    }

    if (isActivelyMoving) {
      tempCursorDir.current.copy(cursorVelocityLocalRef.current);
      if (tempCursorDir.current.lengthSq() > 0.000001) {
        tempCursorDir.current.normalize();
      } else {
        tempCursorDir.current.set(0, 0, 0);
      }
    } else {
      tempCursorDir.current.set(0, 0, 0);
    }

    const count = countRef.current;
    const basePositions = basePositionsRef.current;
    const currentPositions = currentPositionsRef.current;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const bx = basePositions[i3 + 0];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];

      tempTarget.current.set(bx, by, bz);

      if (isActivelyMoving && hasPlaneHit) {
        const dx = bx - smoothHitPointLocalRef.current.x;
        const dy = by - smoothHitPointLocalRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < interactionRadius) {
          const falloff = 1 - dist / interactionRadius;
          const soft = falloff * falloff;

          tempTarget.current.x += tempCursorDir.current.x * interactionStrength * soft;
          tempTarget.current.y += tempCursorDir.current.y * interactionStrength * soft;
          tempTarget.current.z += interactionDepth * soft;
        }
      }

      tempOffset.current.set(
        tempTarget.current.x - bx,
        tempTarget.current.y - by,
        tempTarget.current.z - bz
      );

      const len = tempOffset.current.length();
      if (len > maxOffset) {
        tempOffset.current.normalize().multiplyScalar(maxOffset);
        tempTarget.current.set(
          bx + tempOffset.current.x,
          by + tempOffset.current.y,
          bz + tempOffset.current.z
        );
      }

      const currentLerp = isActivelyMoving ? interactionLerp : returnLerp;

      currentPositions[i3 + 0] = THREE.MathUtils.lerp(currentPositions[i3 + 0], tempTarget.current.x, currentLerp);
      currentPositions[i3 + 1] = THREE.MathUtils.lerp(currentPositions[i3 + 1], tempTarget.current.y, currentLerp);
      currentPositions[i3 + 2] = THREE.MathUtils.lerp(currentPositions[i3 + 2], tempTarget.current.z, currentLerp);
    }

    pointsRef.current.geometry.getAttribute("position").needsUpdate = true;
  });

  if (!particleBuffers) return null;

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={scene} />

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            {...({
              attach: "attributes-position",
              array: particleBuffers.positions,
              count: particleBuffers.count,
              itemSize: 3,
            } as any)}
          />
          <bufferAttribute
            {...({
              attach: "attributes-aMeta",
              array: particleBuffers.meta,
              count: particleBuffers.count,
              itemSize: 2,
            } as any)}
          />
          <bufferAttribute
            {...({
              attach: "attributes-aNormal",
              array: particleBuffers.normals,
              count: particleBuffers.count,
              itemSize: 3,
            } as any)}
          />
        </bufferGeometry>

        <shaderMaterial
          args={[shaderArgs]}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};


// ---- createSuspendedRaf.ts ----
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


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com




function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, min), max);
}

interface HyperiuxGlitterProps {
  glitterColor?: string;
  speed?: number;
  mouseInfluence?: number;
  rotationInfluence?: number;
  /** Shape the glitter forms: the Hyperiux model or a built-in geometry. */
  geometry?: GlitterGeometry;
  /** How far the cursor scatters (demorphs) the particles. */
  demorphStrength?: number;
  /** How wide an area around the cursor gets demorphed. */
  demorphRadius?: number;
  /** Element that receives the pointer, so the canvas can sit behind other content. */
  eventSource?: HTMLElement | null;
}

// Parks the model on the right of the hero (copy sits left); high up on narrow screens.
function RightAnchor({ children }: { children: React.ReactNode }) {
  const viewport = useThree((state) => state.viewport);
  const narrow = viewport.width / viewport.height < 0.9;
  return (
    <group
      position={[
        narrow ? 0 : 0.5 * (viewport.width / 2),
        narrow ? 0.28 * (viewport.height / 2) : 0,
        0,
      ]}
    >
      {children}
    </group>
  );
}

export default function HyperiuxGlitter({
  glitterColor = "#ffffff",
  speed = 1,
  mouseInfluence = 1,
  rotationInfluence = 1,
  geometry = "model",
  demorphStrength = 1,
  demorphRadius = 1.8,
  eventSource,
}: HyperiuxGlitterProps) {

  const rootRef = useRef<HTMLDivElement | null>(null);
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>("always");
  const [modelScale, setModelScale] = useState(0.1);
  const resolvedSpeed = clampNumber(speed, 0.05, 5, 1);
  const resolvedMouseInfluence = clampNumber(mouseInfluence, 0, 4, 1);
  const resolvedRotationInfluence = clampNumber(rotationInfluence, 0, 4, 1);
  const resolvedDemorphStrength = clampNumber(demorphStrength, 0, 4, 1);
  const resolvedDemorphRadius = clampNumber(demorphRadius, 0.2, 5, 1.8);

useEffect(() => {
  const gate = createVisibilityGate({
    root: rootRef,
    onChange: (active) => setFrameloop(active ? "always" : "never"),
  });
  setFrameloop(gate.isActive ? "always" : "never");
  return () => gate.destroy();
}, []);

useEffect(() => {
  const updateScale = () => {
    if (window.innerWidth < 768) {
      setModelScale(0.07); // mobile
    } else if (window.innerWidth < 1024) {
      setModelScale(0.08); // tablet
    } else {
      setModelScale(0.1); // desktop
    }
  };

  updateScale();
  window.addEventListener("resize", updateScale);

  return () => window.removeEventListener("resize", updateScale);
}, []);

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      <Canvas
        aria-hidden="true"
        className="h-full w-full"
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        frameloop={frameloop}
        eventSource={eventSource ?? undefined}
        eventPrefix="client"
      >
        <ambientLight intensity={0.2} />

        <Suspense fallback={null}>
          <RightAnchor>
          <Center>
            <MorphingParticleModel
              url="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/hyperiux-new-model.glb"
              geometry={geometry}
              scale={modelScale}
              particleCount={10000}
              color={glitterColor}
              size={0.18}
              speed={1.15 * resolvedSpeed}
              opacity={1}
              brightness={4.5}
              showModel={false}
              modelOpacity={0}
              parallaxStrength={0.12 * resolvedMouseInfluence}
              rotationStrengthX={0.12 * resolvedRotationInfluence}
              rotationStrengthY={0.18 * resolvedRotationInfluence}
              rotationStrengthZ={0.04 * resolvedRotationInfluence}
              interactionStrength={2.24 * resolvedMouseInfluence * resolvedDemorphStrength}
              interactionRadius={resolvedDemorphRadius}
              maxOffset={1.22 * Math.max(resolvedDemorphStrength, 0.25)}
              frontFacingThreshold={0.12}
              frontFacingSoftness={0.05}
            />
          </Center>
          </RightAnchor>

        </Suspense>

      </Canvas>
      </div>
  );
}
