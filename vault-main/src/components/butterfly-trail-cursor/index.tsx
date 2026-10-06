'use client'

import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { createVisibilityGate } from './createSuspendedRaf'
import { usePrefersReducedMotion } from '@/lib/motion'

const BUTTERFLY_LIFETIME = 2
const FADE_DURATION = 0.5
const MAX_BUTTERFLIES = 200
const SPAWN_THROTTLE = 120

interface ButterflyPoolProps {
	matcapMaterial: THREE.Material
	gltfScene: THREE.Object3D
	gltfAnimations: THREE.AnimationClip[]
	butterflyCount?: number
	trailDistance?: number
	wingColor?: string
	butterflySize?: number
	followSpeed?: number
}

function ButterflyPool({
	matcapMaterial,
	gltfScene,
	gltfAnimations,
	butterflyCount,
	trailDistance,
	wingColor,
	butterflySize,
	followSpeed,
}: ButterflyPoolProps) {
	const poolRef = useRef<THREE.Object3D[]>([])
	const activeCountRef = useRef(0)
	const lastSpawnTime = useRef(0)
	const clockTimeRef = useRef(0)
	const { size, gl } = useThree()
	const resolvedCount = Math.max(0, Math.round(Number(butterflyCount) || 0))
	const resolvedTrailDistance = Math.max(0, Number(trailDistance) || 0)
	const resolvedSize = Math.max(1, Number(butterflySize) || 1)
	const resolvedFollowSpeed = Math.max(0.01, Number(followSpeed) || 0.01)
	const speedMultiplier = resolvedFollowSpeed / 0.18
	const scale = resolvedSize * (0.0012 / 28)

	// Initialize pool of butterfly instances
	const { poolGroup, pool } = useMemo(() => {
		const group = new THREE.Group()
		const pool: THREE.Object3D[] = []
		for (let i = 0; i < MAX_BUTTERFLIES; i++) {
			const clone = SkeletonUtils.clone(gltfScene)
			// Create unique material instance for each butterfly to allow individual opacity
			const instanceMaterial = matcapMaterial.clone()
			instanceMaterial.transparent = true
			instanceMaterial.opacity = 1
			clone.traverse((child: any) => {
				if (child.isMesh || child.isSkinnedMesh) {
					child.material = instanceMaterial
				}
			})
			clone.scale.setScalar(scale)
			clone.visible = false
			clone.userData = {
				active: false,
				direction: new THREE.Vector3(),
				createdAt: 0,
				animationOffset: 0,
				initialRotation: new THREE.Euler(),
				material: instanceMaterial
			}
			// Create animation mixer for this instance
			const mixer = new THREE.AnimationMixer(clone)
			if (gltfAnimations.length > 0) {
				const action = mixer.clipAction(gltfAnimations[0])
				action.play()
				clone.userData.mixer = mixer
				clone.userData.action = action
			}
			group.add(clone)
			pool.push(clone)
		}
		return { poolGroup: group, pool }
		// `scale` only sets the pool's initial size - later scale changes are
		// re-applied imperatively by the effects below, so depending on it
		// here would rebuild the whole clone/material/mixer pool needlessly.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [gltfScene, gltfAnimations, matcapMaterial])

	useEffect(() => {
		poolRef.current = pool
		return () => {
			poolRef.current = []
		}
	}, [pool])

	useEffect(() => {
		const color = new THREE.Color(wingColor || '#ffffff')
		poolRef.current.forEach((butterfly) => {
			butterfly.scale.setScalar(scale)
			const material = butterfly.userData.material
			if (material) {
				material.color.copy(color)
				material.needsUpdate = true
			}
		})
	}, [scale, wingColor])

	useFrame((state, delta) => {
		const now = state.clock.elapsedTime
		clockTimeRef.current = now
		// Update all active butterflies
		for (let i = 0; i < MAX_BUTTERFLIES; i++) {
			const butterfly = poolRef.current[i]
			if (!butterfly) continue
			const data = butterfly.userData
			if (!data.active) continue
			const age = now - data.createdAt
			const fadeStartTime = BUTTERFLY_LIFETIME - FADE_DURATION
			// Handle fade out
			if (age > fadeStartTime) {
				const fadeProgress = (age - fadeStartTime) / FADE_DURATION
				const opacity = Math.max(0, 1 - fadeProgress)
				data.material.opacity = opacity
				// Slow down animation during fade
				if (data.action) {
					data.action.timeScale = (1.6 + Math.random() * 0.8) * opacity
				}
			}
			// Check lifetime (after fade completes)
			if (age > BUTTERFLY_LIFETIME) {
				butterfly.visible = false
				data.active = false
				data.material.opacity = 1 // Reset for next use
				activeCountRef.current = Math.max(0, activeCountRef.current - 1)
				continue
			}
			// Update position
			butterfly.position.x += data.direction.x * delta * 2 * speedMultiplier
			butterfly.position.y += data.direction.y * delta * 2 * speedMultiplier
			butterfly.position.z += data.direction.z * delta * 0.5 * speedMultiplier
			butterfly.rotation.x = data.initialRotation.x + Math.sin(now * 3 + butterfly.position.x) * 0.1
			butterfly.rotation.y = data.initialRotation.y
			butterfly.rotation.z = data.initialRotation.z
			// Update animation
			if (data.mixer) {
				data.mixer.update(delta)
			}
		}
	})

	useEffect(() => {
		const spawnButterflies = (clientX: number, clientY: number, force = false) => {
			if (resolvedCount <= 0) return
			const now = Date.now()
			if (!force && now - lastSpawnTime.current < SPAWN_THROTTLE) return
			lastSpawnTime.current = now

			// Canvas-relative, so it also works when the canvas isn't full-screen
			// (e.g. embedded in a card); pointers outside the canvas are ignored
			const rect = gl.domElement.getBoundingClientRect()
			const localX = clientX - rect.left
			const localY = clientY - rect.top
			if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) return
			const x = (localX / rect.width) * 10 - 5
			const y = -(localY / rect.height) * 6 + 3
			const count = Math.max(1, Math.ceil(resolvedCount / 4))
			const spread = resolvedTrailDistance / 12
			const createdAt = clockTimeRef.current

			// Find inactive butterflies and activate them
			let spawned = 0
			for (let i = 0; i < MAX_BUTTERFLIES && spawned < count; i++) {
				const butterfly = poolRef.current[i]
				if (!butterfly) continue
				const data = butterfly.userData
				if (!data.active) {
					const angle = Math.random() * Math.PI * 2
					butterfly.position.set(
						x + (Math.random() - 0.5) * spread,
						y + (Math.random() - 0.5) * spread,
						(Math.random() - 0.5) * 0.5
					)
					butterfly.scale.setScalar(scale)
					data.direction.set(
						Math.cos(angle) * 0.75,
						0.3 + Math.random() * 0.5,
						(Math.random() - 0.5) * 0.3
					)
					// Set random initial rotation for variety
					data.initialRotation.set(
						(Math.random() - 0.5) * Math.PI * 0.3,
						Math.random() * Math.PI * 2,
						(Math.random() - 0.5) * Math.PI * 0.2
					)
					butterfly.rotation.copy(data.initialRotation)
					data.createdAt = createdAt
					data.active = true
					data.material.opacity = 1
					butterfly.visible = true
					if (data.action) {
						data.action.timeScale = 1.6 + Math.random() * 0.8
						data.action.time = Math.random() * 2
					}
					activeCountRef.current++
					spawned++
				}
			}
		}

		const handlePointerMove = (e: PointerEvent) => {
			spawnButterflies(e.clientX, e.clientY)
		}

		const handlePointerDown = (e: PointerEvent) => {
			spawnButterflies(e.clientX, e.clientY, true)
		}

		window.addEventListener('pointermove', handlePointerMove)
		window.addEventListener('pointerdown', handlePointerDown)
		return () => {
			window.removeEventListener('pointermove', handlePointerMove)
			window.removeEventListener('pointerdown', handlePointerDown)
		}
	}, [resolvedCount, resolvedTrailDistance, scale, size, gl])

	return <primitive object={poolGroup} />
}

function ButterflyTrail(props: Omit<ButterflyPoolProps, 'matcapMaterial' | 'gltfScene' | 'gltfAnimations'>) {
	const matcapTexture = useLoader(THREE.TextureLoader, 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/matcap-white.webp')
	const { scene: gltfScene, animations: gltfAnimations } = useGLTF('https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/butterfly3.glb')

	const matcapMaterial = useMemo(() => {
		return new THREE.MeshMatcapMaterial({
			matcap: matcapTexture,
			side: THREE.DoubleSide
		})
	}, [matcapTexture])

	return (
		<ButterflyPool matcapMaterial={matcapMaterial} gltfScene={gltfScene} gltfAnimations={gltfAnimations} {...props} />
	)
}

useGLTF.preload('https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/butterfly3.glb')

export default function ButterflyTrailCursor({
	butterflyCount = 14,
	trailDistance = 18,
	wingColor = '#ffffff',
	backgroundColor = '#EAEAE9',
	size = 28,
	followSpeed = 0.18,
	embedded = false,
}: {
	butterflyCount?: number
	trailDistance?: number
	wingColor?: string
	backgroundColor?: string
	size?: number
	followSpeed?: number
	/** Fill the parent (not the screen) and drop the title and the reduced-motion note */
	embedded?: boolean
}) {
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
		<div
			ref={rootRef}
			className={`w-full relative bg-[#EAEAE9] ${embedded ? 'h-full' : 'h-screen'}`}
			style={{ backgroundColor }}
		>
			{!embedded && <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 text-center text-[#111111]">
				<h1 className="text-5xl font-semibold leading-none tracking-tight max-[1025px]:text-4xl max-md:text-3xl">
					Butterfly Trail Cursor
				</h1>
				<p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-black/55 max-md:hidden">
					Move cursor to spawn the butterflies
				</p>
				<p className="mt-4 hidden text-sm font-medium uppercase tracking-[0.18em] text-black/55 max-md:block">
					Click to see butterflies spawn
				</p>
			</div>}

			<Canvas
				style={{ backgroundColor }}
				camera={{ position: [0, 0, 5], fov: 75 }}
				gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
				onCreated={({ gl }) => {
					gl.setClearColor(new THREE.Color(backgroundColor), 1)
				}}
				dpr={[1, 1]}
				performance={{ min: 0.5 }}
				frameloop={frameloop}
			>
				<color attach="background" args={[backgroundColor]} />
				{/* The model loads through useGLTF, which suspends. Catch it inside
				    the canvas, or the suspension escapes to the page, which hides and
				    tears down the renderer (the context is lost) before showing it again. */}
				<Suspense fallback={null}>
					<ButterflyTrail
						butterflyCount={butterflyCount}
						trailDistance={trailDistance}
						wingColor={wingColor}
						butterflySize={size}
						followSpeed={followSpeed}
					/>
				</Suspense>
			</Canvas>

			{prefersReducedMotion && !embedded && (
				<div
					aria-live="polite"
					className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-white/10 backdrop-blur-sm p-3 text-center max-[1025px]:hidden"
				>
					<h2 className="text-sm leading-none text-[#111111]">
						The butterflies keep drifting.
					</h2>
					<p className="mt-2 text-xs leading-5 text-black/65">
						These butterflies are animated purely by cursor movement. Pausing
						that motion would remove the effect, so reduced motion isn&apos;t
						supported here.
					</p>
				</div>
			)}
		</div>
	)
}
