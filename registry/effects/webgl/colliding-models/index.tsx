// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { Environment, Lightformer, MeshTransmissionMaterial, Text, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import { BallCollider, CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { easing } from "maath";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode, type RefObject } from "react";
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

const LOGO_MODEL_URL = 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/hyperiux-logo.glb'
const GLASS_MODEL_URL = 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/c-transformed.glb'

// First entry is the default spark color; each click cycles to the next.
const accents = ['#ff5f00', '#4060ff', '#20ffa0', '#ff4060', '#ffcc00']
const MODEL_SCALE = 0.08
const COLLIDER_SCALE = 0.5
const POINTER_RADIUS = 0.55

export type CollidingGeometry = 'model' | 'sphere' | 'torus' | 'icosahedron'
// Radius the built-in shapes are sized to, roughly matching the logo model.
const PRIMITIVE_RADIUS = 0.55

const shuffle = (accent = 0, count = 9) => {
  const styles = [
    { color: '#444', roughness: 0.1 },
    { color: '#444', roughness: 0.75 },
    { color: '#444', roughness: 0.75 },
    { color: 'white', roughness: 0.1 },
    { color: 'white', roughness: 0.75 },
    { color: 'white', roughness: 0.1 },
    { color: accents[accent], roughness: 0.1, accent: true },
    { color: accents[accent], roughness: 0.75, accent: true },
    { color: accents[accent], roughness: 0.1, accent: true },
  ]

  return Array.from(
    { length: Math.max(0, Math.round(count)) },
    (_, i) => styles[i % styles.length]
  )
}

interface SceneProps {
  frameloop?: 'always' | 'demand' | 'never'
  connectorCount?: number
  modelScale?: number
  backgroundColor?: string
  geometry?: CollidingGeometry
  returnToPosition?: boolean
  returnSpeed?: number
}

function Scene({
  frameloop = 'always',
  connectorCount = 8,
  modelScale = 1,
  backgroundColor = '#141518',
  geometry = 'model',
  returnToPosition = true,
  returnSpeed = 1,
}: SceneProps) {
  const [accent, click] = useReducer((state: number) => ++state % accents.length, 0)
  const [showTitle, setShowTitle] = useState(true)
  const connectors = useMemo(
    () => shuffle(accent, connectorCount),
    [accent, connectorCount]
  )
  const connectorRefs = useRef<any[]>([])
  const registerConnector = useCallback((index: number, api: any) => {
    connectorRefs.current[index] = api
    return () => {
      connectorRefs.current[index] = null
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1025px)')
    const updateTitleVisibility = (event: MediaQueryListEvent | MediaQueryList) => {
      setShowTitle(event.matches)
    }

    updateTitleVisibility(mediaQuery)
    mediaQuery.addEventListener('change', updateTitleVisibility)

    return () => {
      mediaQuery.removeEventListener('change', updateTitleVisibility)
    }
  }, [])

  // The scene's dominant GPU resources are the two loaded GLB models, cached
  // by drei's useGLTF. Clear them on unmount so their geometries, materials,
  // and textures are disposed and repeated mount/unmount cycles don't
  // accumulate GPU memory. Clearing also forces a clean re-parse on remount.
  useEffect(() => {
    return () => {
      useGLTF.clear(LOGO_MODEL_URL)
      useGLTF.clear(GLASS_MODEL_URL)
    }
  }, [])

  return (
    <Canvas
      aria-hidden="true"
      onClick={click}
      shadows
      dpr={[1.0, 1.1]}
      gl={{ antialias: true }}
      camera={{ position: [0, 0, 15], fov: 17.5, near: 1, far: 20 }}
      className="h-full w-full "
      frameloop={frameloop}
    >
      {showTitle && (
        <Text
          position={[0, 0, 0]}
          fontSize={1.15}
          color={accents[accent]}
          fontWeight={500}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0}
        >
          HYPERIUX
        </Text>
      )}
      <color attach="background" args={[backgroundColor]} />
      <ambientLight intensity={0.4} />
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={1}
        castShadow
      />

      <Physics gravity={[0, 0, 0]}>
        <Pointer />
        {connectors.map((props, i) => (
          <Connector key={i} {...props} modelScale={modelScale} geometry={geometry} returnToPosition={returnToPosition} returnSpeed={returnSpeed} connectorRefs={connectorRefs} registerConnector={registerConnector} index={i} />
        ))}
        <Connector position={[10, 10, 5]} geometry={geometry} modelScale={modelScale} returnToPosition={returnToPosition} returnSpeed={returnSpeed} connectorRefs={connectorRefs} registerConnector={registerConnector} index={connectors.length}>
          <Model modelScale={modelScale} geometry={geometry}>
            <MeshTransmissionMaterial
              clearcoat={1}
              thickness={10}
              anisotropicBlur={0.1}
              chromaticAberration={0.1}
              samples={8}
              resolution={512}
            />
          </Model>
        </Connector>
      </Physics>

      <EffectComposer {...({ disableNormalPass: true, multisampling: 8 } as any)}>
        <N8AO />
        {/* <Bloom  /> */}
      </EffectComposer>

      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="circle"
            intensity={4}
            rotation-x={Math.PI / 2}
            position={[0, 5, -9]}
            scale={2}
          />
          <Lightformer
            form="circle"
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, 1, -1]}
            scale={2}
          />
          <Lightformer
            form="circle"
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, -1, -1]}
            scale={2}
          />
          <Lightformer
            form="circle"
            intensity={2}
            rotation-y={-Math.PI / 2}
            position={[10, 1, 0]}
            scale={8}
          />
        </group>
      </Environment>
      {/* <Environment preset='city' environmentIntensity={1.2} /> */}
    </Canvas>
  )
}

const REPULSION_RADIUS = 1.5
const REPULSION_STRENGTH = 0.012

interface ConnectorOwnProps {
  position?: [number, number, number]
  children?: ReactNode
  vec?: THREE.Vector3
  repulsion?: THREE.Vector3
  r?: (range: number) => number
  accent?: boolean
  connectorRefs: RefObject<any[]>
  registerConnector: (index: number, api: any) => () => void
  index: number
  geometry?: CollidingGeometry
  /** Pull pieces back to the cluster after the cursor knocks them away. */
  returnToPosition?: boolean
  /** How quickly knocked pieces come back (1 = default). */
  returnSpeed?: number
}

function Connector({
  position,
  children,
  vec = new THREE.Vector3(),
  repulsion = new THREE.Vector3(),
  r = THREE.MathUtils.randFloatSpread,
  accent,
  connectorRefs,
  registerConnector,
  index,
  geometry = 'model',
  returnToPosition = true,
  returnSpeed = 1,
  ...props
}: ConnectorOwnProps & Record<string, any>) {
  const api = useRef<RapierRigidBody | null>(null)
  const pos = useMemo(() => (position || [r(10), r(10), r(10)]) as [number, number, number], [position, r])

  useEffect(() => {
    return registerConnector(index, api)
  }, [index, registerConnector])

  useFrame((state, delta) => {
    delta = Math.min(0.1, delta)
    if (!api.current) return

    const myPos = api.current.translation()

    // Pull back toward the cluster. 0.03 (was 0.01) with lighter damping
    // below brings knocked pieces back noticeably faster by default.
    if (returnToPosition) {
      api.current.applyImpulse(
        vec.copy(myPos).negate().multiplyScalar(0.03 * Math.max(0, returnSpeed)),
        true
      )
    }

    for (let i = 0; i < connectorRefs.current.length; i++) {
      if (i === index) continue
      const other = connectorRefs.current[i]?.current
      if (!other) continue

      const otherPos = other.translation()
      repulsion.set(
        myPos.x - otherPos.x,
        myPos.y - otherPos.y,
        myPos.z - otherPos.z
      )
      const dist = repulsion.length()

      if (dist < REPULSION_RADIUS && dist > 0.001) {
        const force = (REPULSION_RADIUS - dist) / REPULSION_RADIUS
        repulsion.normalize().multiplyScalar(force * REPULSION_STRENGTH)
        api.current.applyImpulse(repulsion, true)
      }
    }
  })

  return (
    <RigidBody
      linearDamping={returnToPosition ? 2.5 : 4}
      angularDamping={1}
      friction={0.1}
      position={pos}
      ref={api}
      colliders={false}
    >
      {geometry !== 'model' ? (
        <BallCollider args={[PRIMITIVE_RADIUS * (props.modelScale ?? 1)]} />
      ) : (
      <>
      <CuboidCollider
        args={[
          0.25 * COLLIDER_SCALE,
          1.2 * COLLIDER_SCALE,
          0.25 * COLLIDER_SCALE,
        ]}
        position={[-1.2 * COLLIDER_SCALE, 0, 0]}
      />
      <CuboidCollider
        args={[
          0.25 * COLLIDER_SCALE,
          1.2 * COLLIDER_SCALE,
          0.25 * COLLIDER_SCALE,
        ]}
        position={[0.8 * COLLIDER_SCALE, 0, 0]}
      />
      <CuboidCollider
        args={[
          1.1 * COLLIDER_SCALE,
          0.2 * COLLIDER_SCALE,
          0.25 * COLLIDER_SCALE,
        ]}
        position={[0, 0, 0]}
      />
      </>
      )}
      {children ? children : <Model {...props} geometry={geometry} />}
      {accent && (
        <pointLight intensity={4} distance={1.25} color={props.color} />
      )}
    </RigidBody>
  )
}

interface PointerProps {
  vec?: THREE.Vector3
}

function Pointer({ vec = new THREE.Vector3() }: PointerProps) {
  const ref = useRef<RapierRigidBody | null>(null)

  useFrame(({ mouse, viewport }) => {
    const x = (mouse.x * viewport.width) / 2
    const y = (mouse.y * viewport.height) / 2

    // Constrain pointer to canvas bounds
    const maxX = viewport.width / 2
    const maxY = viewport.height / 2

    const constrainedX = Math.max(-maxX, Math.min(maxX, x))
    const constrainedY = Math.max(-maxY, Math.min(maxY, y))

    ref.current?.setNextKinematicTranslation(
      vec.set(constrainedX, constrainedY, 0)
    )
  })

  return (
    <RigidBody
      position={[0, 0, 0]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[POINTER_RADIUS]} />
    </RigidBody>
  )
}

interface ModelProps {
  children?: ReactNode
  color?: string
  roughness?: number
  modelScale?: number
  geometry?: CollidingGeometry
}

function Model({ children, color = 'white', roughness = 0, modelScale = 1, geometry: shape = 'model' }: ModelProps) {
  const ref = useRef<any>(null)
  const { nodes } = useGLTF(LOGO_MODEL_URL)
  const { materials: materials2 } = useGLTF(GLASS_MODEL_URL)
  const geometry = (nodes.FINAL as any)?.geometry

  useFrame((state, delta) => {
    if (ref.current?.material?.color) {
      easing.dampC(ref.current.material.color, color, 0.2, delta)
    }
  })

  const isPrimitive = shape !== 'model'
  if (!isPrimitive && !geometry) return null

  const scale = MODEL_SCALE * modelScale
  const r = PRIMITIVE_RADIUS * modelScale

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      scale={isPrimitive ? 1 : [scale, scale, scale * 2.3]}
      geometry={isPrimitive ? undefined : geometry}
    >
      {shape === 'sphere' && <sphereGeometry args={[r, 48, 32]} />}
      {shape === 'torus' && <torusGeometry args={[r * 0.72, r * 0.28, 32, 96]} />}
      {shape === 'icosahedron' && <icosahedronGeometry args={[r, 0]} />}
      <meshPhysicalMaterial
        {...({
          metalness: .4,
          roughness: 0.2,
          clearcoat: 1,
          clearcoatRoughness: 0.2,
          material: materials2.base,
          reflectivity: 1,
          color: color,
        } as any)}
      />

      {children}
    </mesh>
  )
}

export default function CollidingModels({
  connectorCount = 8,
  modelScale = 1,
  backgroundColor = '#141518',
  geometry = 'model',
  returnToPosition = true,
  returnSpeed = 1,
}: { connectorCount?: number; modelScale?: number; backgroundColor?: string; geometry?: CollidingGeometry; returnToPosition?: boolean; returnSpeed?: number }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? 'always' : 'never'),
    })
    setFrameloop(gate.isActive ? 'always' : 'never')
    return () => gate.destroy()
  }, [])

  return (

    <>
      <div className="w-full h-screen flex items-center justify-center">
        <div
          ref={rootRef}
          className="relative h-full w-full overflow-hidden"
          style={{ backgroundColor }}
        >
          <Scene
            frameloop={frameloop}
            connectorCount={connectorCount}
            modelScale={modelScale}
            backgroundColor={backgroundColor}
            geometry={geometry}
            returnToPosition={returnToPosition}
            returnSpeed={returnSpeed}
          />
          <p className="pointer-events-none max-lg:hidden absolute bottom-6 left-1/2 z-10 max-w-130 -translate-x-1/2 px-6 text-center font-mono text-sm leading-relaxed text-white/70 max-md:bottom-4 max-md:text-xs">
            Move through the field and let the models collide - click to change their spark.
          </p>

          <p className='hidden max-lg:block absolute bottom-6 left-1/2 z-10 max-lg:max-w-130 max-md:w-[70%] -translate-x-1/2 px-2 leading-[1.2] max-lg:text-lg max-md:text-sm text-center '>
            Touch the field and let the models collide , tap to change their spark.
          </p>
        </div>
      </div>

    </>
  )
}
