'use client'
import React, { useRef, useMemo, useCallback, useEffect, useState, type RefObject } from'react'
import { Canvas, useFrame } from'@react-three/fiber'
import { useGLTF } from'@react-three/drei'
import * as THREE from'three'
import { createVisibilityGate } from './createSuspendedRaf'
import { usePrefersReducedMotion } from '@/lib/motion'

const BEAN_COUNT = 300
const FLOW_DURATION = 4
const START_X = -8
const END_X = 8
const START_Y = 2
const END_Y = -1
const CENTER_DIP_AMOUNT = 1.5
const WAVE_AMPLITUDE = 0.6
const Z_WAVE_AMPLITUDE = 2
const X_SPREAD_RANGE = 4
const Z_SPREAD_RANGE = 1
const BASE_SPEED = 0.15
const SPEED_VARIANCE = 0.2
const BASE_SCALE = 0.2
const SCALE_VARIANCE = 0.2
const ROTATION_SPEED_RANGE = 4
const ROTATION_MULTIPLIER = 0.03
const SCALE_MULTIPLIER = 0.003

// Fluid simulation constants - tuned for smoothness
const FLUID_VISCOSITY = 0.4
const FLUID_MOUSE_FORCE = 0.8
const FLUID_RETURN_FORCE = 0.008
const INTERACTION_RADIUS = 3.0
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS
const MOUSE_IDLE_TIME = 150 // ms before considering mouse stopped

// Light intensity constants
const MOUSE_LIGHT_INTENSITY = 20

// Ambient scene lighting constants
const AMBIENT_LIGHT_INTENSITY = 0.4
const KEY_LIGHT_INTENSITY = 0.8
const FILL_LIGHT_INTENSITY = 0.4
const RIM_LIGHT_INTENSITY = 0.6

// Shared temp objects for matrix calculations
const tempObject = new THREE.Object3D()

function seededUnit(index: number, salt: number) {
 const value = Math.sin(index * 91.713 + salt * 37.529) * 10000
 return value - Math.floor(value)
}

type Vec2Ref = RefObject<{x: number, y: number}>

interface BeanData {
 offset: number;
 speed: number;
 xSpread: number;
 zSpread: number;
 rotationSpeed: number[];
 scale: number;
 mass: number;
 velocity: THREE.Vector3;
 offsetPosition: THREE.Vector3;
 rotation: THREE.Euler;
}

interface CoffeeBeansProps {
 count?: number;
 beanColor?: string;
 size?: number;
 rotationSpeed?: number;
 mouseInteraction?: boolean;
 scatterIntensity?: number;
 mousePositionRef: Vec2Ref;
 mouseVelocityRef: Vec2Ref;
 isMouseActiveRef: RefObject<boolean>;
}

function CoffeeBeans({
 count = BEAN_COUNT,
 beanColor = "#392416",
 size = 22,
 rotationSpeed = 1,
 mouseInteraction = true,
 scatterIntensity = 1,
 mousePositionRef,
 mouseVelocityRef,
 isMouseActiveRef
}: CoffeeBeansProps) {
 const { nodes } = useGLTF('https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/coffebean.glb')
 const meshRef = useRef<THREE.InstancedMesh | null>(null)
 const beansRef = useRef<BeanData[]>([])
 const resolvedCount = Math.max(0, Math.round(Number(count) || 0))
 const resolvedSize = Math.max(1, Number(size) || 1)
 const resolvedRotationSpeed = Math.max(0, Number(rotationSpeed) || 0)
 const resolvedScatterIntensity = Math.max(0, Number(scatterIntensity) || 0)
 const material = useMemo(() => new THREE.MeshStandardMaterial({
 color: beanColor || "#392416",
 roughness: 0.6,
 metalness: 0.1
 }), [beanColor])

 useEffect(() => () => material.dispose(), [material])

  // Precompute all bean data once
 const beansData = useMemo(() => {
 return Array.from({ length: resolvedCount }, (_, i) => ({
 offset: (i / Math.max(1, resolvedCount)) * Math.PI * 2,
 speed: BASE_SPEED + seededUnit(i, 1) * SPEED_VARIANCE,
 xSpread: (seededUnit(i, 2) - 0.5) * X_SPREAD_RANGE,
 zSpread: (seededUnit(i, 3) - 0.5) * Z_SPREAD_RANGE,
 rotationSpeed: [
 (seededUnit(i, 4) - 0.5) * ROTATION_SPEED_RANGE,
 (seededUnit(i, 5) - 0.5) * ROTATION_SPEED_RANGE,
 (seededUnit(i, 6) - 0.5) * ROTATION_SPEED_RANGE
 ],
 scale: BASE_SCALE + seededUnit(i, 7) * SCALE_VARIANCE,
 mass: 0.5 + seededUnit(i, 8) * 0.5,
 // Per-bean state
 velocity: new THREE.Vector3(0, 0, 0),
 offsetPosition: new THREE.Vector3(0, 0, 0),
 rotation: new THREE.Euler(
 seededUnit(i, 9) * Math.PI * 2,
 seededUnit(i, 10) * Math.PI * 2,
 seededUnit(i, 11) * Math.PI * 2
 )
 }))
 }, [resolvedCount])

 useEffect(() => {
 beansRef.current = beansData
 return () => {
 beansRef.current = []
 }
 }, [beansData])

  useFrame((state, delta) => {
 if (!meshRef.current) return
  const time = state.clock.elapsedTime
 const isActive = Boolean(mouseInteraction) && isMouseActiveRef.current
 const mouseX = mousePositionRef.current.x * 6
 const mouseY = mousePositionRef.current.y * 4
 const mouseVelX = mouseVelocityRef.current.x
 const mouseVelY = mouseVelocityRef.current.y
  // Precompute frame-rate independent values
 const deltaScaled = delta * 60
 const viscosity = isActive ? FLUID_VISCOSITY : FLUID_VISCOSITY * 0.7
 const dampingFactor = Math.pow(viscosity, deltaScaled)
 const returnMultiplier = isActive ? 1 : 2.5
 const interactionRadius = INTERACTION_RADIUS * (0.75 + resolvedScatterIntensity * 0.25)
 const interactionRadiusSq = interactionRadius * interactionRadius
 const mouseForce = FLUID_MOUSE_FORCE * resolvedScatterIntensity
  for (let i = 0; i < resolvedCount; i++) {
 const bean = beansRef.current[i]
 if (!bean) continue
 const beanTime = time * bean.speed + bean.offset
  // Flow path calculation
 const progress = ((beanTime % FLOW_DURATION) / FLOW_DURATION)
 const sinProgress = Math.sin(progress * Math.PI)
 const sinProgress2 = Math.sin(progress * Math.PI * 2)
  const baseX = START_X + (END_X - START_X) * progress + bean.xSpread
 const centerDip = -sinProgress * CENTER_DIP_AMOUNT
 const baseY = START_Y + (END_Y - START_Y) * progress + centerDip + sinProgress2 * WAVE_AMPLITUDE
 const baseZ = bean.zSpread + sinProgress * Z_WAVE_AMPLITUDE
  // Mouse interaction
 if (isActive) {
 const currentX = baseX + bean.offsetPosition.x
 const currentY = baseY + bean.offsetPosition.y
 const currentZ = baseZ + bean.offsetPosition.z
  const dx = currentX - mouseX
 const dy = currentY - mouseY
 const dz = currentZ
 const distSq = dx * dx + dy * dy + dz * dz
  if (distSq < interactionRadiusSq && distSq > 0.0001) {
 const distance = Math.sqrt(distSq)
 const normalizedDist = distance / interactionRadius
 const falloff = 1 - normalizedDist * normalizedDist * (3 - 2 * normalizedDist)
 const force = falloff * mouseForce / bean.mass
  const invDist = 1 / distance
 const normalizedDx = dx * invDist
 const normalizedDy = dy * invDist
 const normalizedDz = dz * invDist
  bean.velocity.x += normalizedDx * force + mouseVelX * force * 0.4
 bean.velocity.y += normalizedDy * force + mouseVelY * force * 0.4
 bean.velocity.z += normalizedDz * force * 0.25
  // Swirl effect
 const swirlForce = force * 0.25
 bean.velocity.x += -normalizedDy * swirlForce
 bean.velocity.y += normalizedDx * swirlForce
 }
 }
  // Return force to base position
 const returnStrength = FLUID_RETURN_FORCE * returnMultiplier * (1 + bean.offsetPosition.length() * 0.1)
 bean.velocity.x -= bean.offsetPosition.x * returnStrength
 bean.velocity.y -= bean.offsetPosition.y * returnStrength
 bean.velocity.z -= bean.offsetPosition.z * returnStrength * 1.5
  // Apply viscosity
 bean.velocity.multiplyScalar(dampingFactor)
  // Update offset position
 bean.offsetPosition.x += bean.velocity.x * deltaScaled
 bean.offsetPosition.y += bean.velocity.y * deltaScaled
 bean.offsetPosition.z += bean.velocity.z * deltaScaled
  // Soft clamp offset
 const maxOffset = 3
 const softClamp = (value: number, max: number) => {
 if (Math.abs(value) < max) return value
 const sign = value > 0 ? 1 : -1
 return sign * (max + (Math.abs(value) - max) * 0.1)
 }
 bean.offsetPosition.x = softClamp(bean.offsetPosition.x, maxOffset)
 bean.offsetPosition.y = softClamp(bean.offsetPosition.y, maxOffset)
 bean.offsetPosition.z = softClamp(bean.offsetPosition.z, maxOffset * 0.5)
  // Update rotation with velocity influence
 const velocityMagnitude = bean.velocity.length()
 const rotationBoost = 1 + velocityMagnitude * 1.5
  bean.rotation.x += bean.rotationSpeed[0] * ROTATION_MULTIPLIER * resolvedRotationSpeed * rotationBoost * deltaScaled
 bean.rotation.y += bean.rotationSpeed[1] * ROTATION_MULTIPLIER * resolvedRotationSpeed * rotationBoost * deltaScaled
 bean.rotation.z += bean.rotationSpeed[2] * ROTATION_MULTIPLIER * resolvedRotationSpeed * rotationBoost * deltaScaled
  // Set matrix
 const finalScale = bean.scale * SCALE_MULTIPLIER * (resolvedSize / 22)
 tempObject.position.set(
 baseX + bean.offsetPosition.x,
 baseY + bean.offsetPosition.y,
 baseZ + bean.offsetPosition.z
 )
 tempObject.rotation.copy(bean.rotation)
 tempObject.scale.setScalar(finalScale)
 tempObject.updateMatrix()
 meshRef.current.setMatrixAt(i, tempObject.matrix)
 }
  meshRef.current.instanceMatrix.needsUpdate = true
 })
  return (
 <instancedMesh
 key={resolvedCount}
 ref={meshRef}
 args={[(nodes.COFFEE_COFFEE_MAT_0 as THREE.Mesh).geometry, material, resolvedCount]}
 />
 )
}

interface MouseLightProps {
 mousePositionRef: Vec2Ref;
}

function MouseLight({ mousePositionRef }: MouseLightProps) {
 const lightRef = useRef<THREE.PointLight | null>(null)
 const smoothPosition = useRef({ x: 0, y: 0 })
  useFrame((state, delta) => {
 if (!lightRef.current) return
 // Smooth the light position
 const smoothing = 1 - Math.pow(0.001, delta)
 smoothPosition.current.x += (mousePositionRef.current.x - smoothPosition.current.x) * smoothing
 smoothPosition.current.y += (mousePositionRef.current.y - smoothPosition.current.y) * smoothing
  const x = smoothPosition.current.x * 6
 const y = smoothPosition.current.y * 4
 lightRef.current.position.set(x, y, 3)
 })
  return (
 <pointLight
 ref={lightRef}
 intensity={MOUSE_LIGHT_INTENSITY}
 color="#ffd4a3"
 distance={15}
 decay={1}
 />
 )
}

interface MouseTrackerProps {
 mousePositionRef: Vec2Ref;
 mouseVelocityRef: Vec2Ref;
 targetPositionRef: Vec2Ref;
 targetVelocityRef: Vec2Ref;
 isMouseActiveRef: RefObject<boolean>;
 lastMoveTimeRef: RefObject<number>;
}

function MouseTracker({ mousePositionRef, mouseVelocityRef, targetPositionRef, targetVelocityRef, isMouseActiveRef, lastMoveTimeRef }: MouseTrackerProps) {
 useFrame((state, delta) => {
 const now = Date.now()
 const timeSinceLastMove = now - lastMoveTimeRef.current
 isMouseActiveRef.current = timeSinceLastMove < MOUSE_IDLE_TIME
  const smoothing = 1 - Math.pow(0.0001, delta)
  mousePositionRef.current.x += (targetPositionRef.current.x - mousePositionRef.current.x) * smoothing
 mousePositionRef.current.y += (targetPositionRef.current.y - mousePositionRef.current.y) * smoothing
  const velSmoothing = 1 - Math.pow(0.001, delta)
 mouseVelocityRef.current.x += (targetVelocityRef.current.x - mouseVelocityRef.current.x) * velSmoothing
 mouseVelocityRef.current.y += (targetVelocityRef.current.y - mouseVelocityRef.current.y) * velSmoothing
 mouseVelocityRef.current.x *= Math.pow(0.95, delta * 60)
 mouseVelocityRef.current.y *= Math.pow(0.95, delta * 60)
 })
  return null
}

export default function CoffeeBeanCursor({
 beanCount = BEAN_COUNT,
 beanColor = "#392416",
 size = 22,
 rotationSpeed = 1,
 mouseInteraction = true,
 scatterIntensity = 1
}: {
 beanCount?: number;
 beanColor?: string;
 size?: number;
 rotationSpeed?: number;
 mouseInteraction?: boolean;
 scatterIntensity?: number;
}) {
 const rootRef = useRef<HTMLDivElement | null>(null)
 const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
 const prefersReducedMotion = usePrefersReducedMotion()
 const mousePositionRef = useRef({ x: 0, y: 0 })
 const mouseVelocityRef = useRef({ x: 0, y: 0 })
 const targetPositionRef = useRef({ x: 0, y: 0 })
 const targetVelocityRef = useRef({ x: 0, y: 0 })
 const lastMouseRef = useRef({ x: 0, y: 0, time: 0 })
 const isMouseActiveRef = useRef(false)
 const lastMoveTimeRef = useRef(0)

 useEffect(() => {
 const now = Date.now()
 lastMouseRef.current.time = now
 lastMoveTimeRef.current = now
 }, [])

 useEffect(() => {
 const gate = createVisibilityGate({
 root: rootRef,
 onChange: (active) => setFrameloop(active ? 'always' : 'never'),
 })
 setFrameloop(gate.isActive ? 'always' : 'never')
 return () => gate.destroy()
 }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
 const rect = e.currentTarget.getBoundingClientRect()
 const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
 const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  const now = Date.now()
 const dt = Math.max(now - lastMouseRef.current.time, 1) / 1000
  const vx = (x - lastMouseRef.current.x) / dt
 const vy = (y - lastMouseRef.current.y) / dt
  targetVelocityRef.current.x = vx * 0.08
 targetVelocityRef.current.y = vy * 0.08
 targetPositionRef.current.x = x
 targetPositionRef.current.y = y
  lastMouseRef.current = { x, y, time: now }
 lastMoveTimeRef.current = now
 }, [])
  return (
 <div  ref={rootRef} className='h-screen w-full bg-linear-to-b from-black to-[#110904] relative'
 onMouseMove={handleMouseMove}
 >
    <h1 className='absolute text-[#3D1C0C] text-[8vw] w-full text-center font-bold left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'>COFFEE BEANS</h1>
 
 <Canvas camera={{ position: [0, 0, 4.8] }} className='h-full w-full' frameloop={frameloop}>
 <MouseTracker  mousePositionRef={mousePositionRef}
 mouseVelocityRef={mouseVelocityRef}
 targetPositionRef={targetPositionRef}
 targetVelocityRef={targetVelocityRef}
 isMouseActiveRef={isMouseActiveRef}
 lastMoveTimeRef={lastMoveTimeRef}
 />
 <CoffeeBeans
 count={beanCount}
 beanColor={beanColor}
 size={size}
 rotationSpeed={rotationSpeed}
 mouseInteraction={mouseInteraction}
 scatterIntensity={scatterIntensity}
 mousePositionRef={mousePositionRef}
 mouseVelocityRef={mouseVelocityRef}
 isMouseActiveRef={isMouseActiveRef}
 />
  {/* Base ambient lighting - always visible */}
 <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} color="#ffeedd" />
  {/* Key light - main illumination from top-right */}
 <directionalLight  position={[5, 5, 5]}  intensity={KEY_LIGHT_INTENSITY}  color="#fff5e6"
 />
  {/* Fill light - softer light from left to reduce harsh shadows */}
 <directionalLight  position={[-4, 2, 3]}  intensity={FILL_LIGHT_INTENSITY}  color="#e6d5c3"
 />
  {/* Rim light - back light for depth and separation */}
 <directionalLight  position={[0, -3, -5]}  intensity={RIM_LIGHT_INTENSITY}  color="#d4a574"
 />
  {/* Mouse-following interactive light */}
 <MouseLight mousePositionRef={mousePositionRef} />
 </Canvas>
 {prefersReducedMotion && (
 <div
   aria-live="polite"
   className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
 >
   <h2 className="text-sm leading-none text-white">
     The beans keep drifting.
   </h2>
   <p className="mt-2 text-xs leading-5 text-white/65">
     Coffee Bean Cursor animates in direct response to cursor movement.
     The motion is the effect, so it can&apos;t be reduced without
     disabling it entirely.
   </p>
 </div>
 )}
 </div>
 )
}
useGLTF.preload('https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/coffebean.glb')
