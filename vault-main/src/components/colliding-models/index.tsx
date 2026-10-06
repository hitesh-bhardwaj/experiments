// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import * as THREE from 'three'
import { useEffect, useRef, useReducer, useMemo, useCallback, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { createVisibilityGate } from './createSuspendedRaf'

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return prefersReducedMotion
}
import {
  useGLTF,
  MeshTransmissionMaterial,
  Environment,
  Lightformer,
  Text,
} from '@react-three/drei'
import { CuboidCollider, BallCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { EffectComposer, N8AO } from '@react-three/postprocessing'
import { easing } from 'maath'

const LOGO_MODEL_URL = 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/hyperiux-logo.glb'
const GLASS_MODEL_URL = 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/c-transformed.glb'

const accents = ['#4060ff', '#20ffa0', '#ff4060', '#ffcc00', '#ff5f00']
const MODEL_SCALE = 0.08
const COLLIDER_SCALE = 0.5
const POINTER_RADIUS = 0.55

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
  gravity?: number
  modelScale?: number
  backgroundColor?: string
}

function Scene({
  frameloop = 'always',
  connectorCount = 8,
  gravity = 0,
  modelScale = 1,
  backgroundColor = '#141518',
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

      <Physics gravity={[0, -gravity, 0]}>
        <Pointer />
        {connectors.map((props, i) => (
          <Connector key={i} {...props} modelScale={modelScale} connectorRefs={connectorRefs} registerConnector={registerConnector} index={i} />
        ))}
        <Connector position={[10, 10, 5]} connectorRefs={connectorRefs} registerConnector={registerConnector} index={connectors.length}>
          <Model modelScale={modelScale}>
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

    api.current.applyImpulse(
      vec.copy(myPos).negate().multiplyScalar(0.01),
      true
    )

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
      linearDamping={4}
      angularDamping={1}
      friction={0.1}
      position={pos}
      ref={api}
      colliders={false}
    >
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
      {children ? children : <Model {...props} />}
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
}

function Model({ children, color = 'white', roughness = 0, modelScale = 1 }: ModelProps) {
  const ref = useRef<any>(null)
  const { nodes } = useGLTF(LOGO_MODEL_URL)
  const { materials: materials2 } = useGLTF(GLASS_MODEL_URL)
  const geometry = (nodes.FINAL as any)?.geometry

  useFrame((state, delta) => {
    if (ref.current?.material?.color) {
      easing.dampC(ref.current.material.color, color, 0.2, delta)
    }
  })

  if (!geometry) return null

  const scale = MODEL_SCALE * modelScale

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      scale={[scale, scale, scale * 2.3]}
      geometry={geometry}
    >
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
  gravity = 0,
  modelScale = 1,
  backgroundColor = '#141518',
}: { connectorCount?: number; gravity?: number; modelScale?: number; backgroundColor?: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  const prefersReducedMotion = usePrefersReducedMotion()

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
      <div className="w-full h-screen flex items-center justify-center px-12 max-md:px-6 max-[1025px]:px-10">
        <div
          ref={rootRef}
          className="relative h-full w-full overflow-hidden rounded-2xl"
          style={{ backgroundColor }}
        >
          <Scene
            frameloop={frameloop}
            connectorCount={connectorCount}
            gravity={gravity}
            modelScale={modelScale}
            backgroundColor={backgroundColor}
          />
          <p className="pointer-events-none max-[1025px]:hidden absolute bottom-6 left-1/2 z-10 max-w-130 -translate-x-1/2 px-6 text-center font-mono text-sm leading-relaxed text-white/70 max-md:bottom-4 max-md:text-xs">
            Move through the field and let the models collide - click to change their spark.
          </p>

          <p className='hidden max-[1025px]:block absolute bottom-6 left-1/2 z-10 max-[1025px]:max-w-130 max-md:w-[70%] -translate-x-1/2 px-2 leading-[1.2] max-[1025px]:text-lg max-md:text-sm text-center '>
            Touch the field and let the models collide , tap to change their spark.
          </p>
        </div>
      </div>

      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-[#0e0e0e]  p-3 text-center"
        >
          <h2 className="text-sm leading-none text-white">
            The models keep colliding.
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/90">
            Colliding Models runs a live physics simulation that reacts to
            cursor movement continuously. Since the motion is the entire
            effect, reduced motion can&apos;t be applied here.
          </p>
        </div>
      )}
    </>
  )
}
