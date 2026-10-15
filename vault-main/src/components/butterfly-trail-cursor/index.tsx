/* eslint-disable react-hooks/exhaustive-deps -- React Compiler / legacy-pattern rules: fixing risks changing animation timing (see eslint.config.mjs, issue #16); <img> kept for dynamic user-supplied sources. */
// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

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
	const { size } = useThree()
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

			const x = (clientX / size.width) * 10 - 5
			const y = -(clientY / size.height) * 6 + 3
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
	}, [resolvedCount, resolvedTrailDistance, scale, size])

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
	size = 28,
	followSpeed = 0.18,
}: {
	butterflyCount?: number
	trailDistance?: number
	wingColor?: string
	size?: number
	followSpeed?: number
}) {
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
		<div
			ref={rootRef}
			className="w-full h-screen relative bg-[#EAEAE9]"
			style={{ backgroundColor: '#EAEAE9' }}
		>
			<div className="pointer-events-none absolute left-1/2 top-1/2 z-10 w-[min(90vw,760px)] -translate-x-1/2 -translate-y-1/2 text-center text-[#111111]">
				<h1 className="text-5xl font-semibold leading-none tracking-tight max-lg:text-4xl max-md:text-3xl">
					Butterfly Trail Cursor
				</h1>
				<p className="mt-4 text-sm font-medium uppercase tracking-[0.22em] text-black/55 max-md:hidden">
					Move cursor to spawn the butterflies
				</p>
				<p className="mt-4 hidden text-sm font-medium uppercase tracking-[0.18em] text-black/55 max-md:block">
					Click to see butterflies spawn
				</p>
			</div>

			<Canvas
				style={{ backgroundColor: '#EAEAE9' }}
				camera={{ position: [0, 0, 5], fov: 75 }}
				gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
				onCreated={({ gl }) => {
					gl.setClearColor(new THREE.Color('#EAEAE9'), 1)
				}}
				dpr={[1, 1]}
				performance={{ min: 0.5 }}
				frameloop={frameloop}
			>
				<color attach="background" args={['#EAEAE9']} />
				<ButterflyTrail
					butterflyCount={butterflyCount}
					trailDistance={trailDistance}
					wingColor={wingColor}
					butterflySize={size}
					followSpeed={followSpeed}
				/>
			</Canvas>

		</div>
	)
}
