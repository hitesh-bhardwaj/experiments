'use client'

import React, { useRef, useEffect, useCallback, useState } from'react'
import { Canvas, useThree, useFrame } from'@react-three/fiber'
import { Environment, Center } from'@react-three/drei'
import * as THREE from 'three'
import RoomModel from'./RoomModel'
import { degToRad } from'three/src/math/MathUtils.js'
import gsap from'gsap'
import CustomGrainNoise from'./CustomGrainNoise'
import { EffectComposer } from'@react-three/postprocessing'
import VideoUI from'./VideoUI'
import { Play } from'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import EdgeBlurEffect from './EdgeBlurEffect'
import { createVisibilityGate } from './createSuspendedRaf'
import Link from 'next/link'
import { usePrefersReducedMotion } from '@/lib/motion'

// 🌟 CONFIGURATION - tweak these for env intensity levels 🌟
const ENV_INTENSITY_CONFIG = {
  zoomed: 0,
  out: 0.1,
  lightZoomed: 0,
  lightOut: 3
}


// Camera z positions for zoomed / out states per device
const CAMERA_CONFIG = {
  desktop: { zoomedZ: 2.5, outZ: 4.8 },
  tablet:  { zoomedZ: 4.5, outZ: 5.6 },
  mobile:  { zoomedZ: 6.0, outZ: 7.9 }
}

type DeviceType = 'desktop' | 'tablet' | 'mobile'

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.min(max, Math.max(min, next))
}

interface MovingPointLightProps {
  lightRef: React.RefObject<THREE.PointLight | null>
  enabled?: boolean
  lerp?: number
}

function MovingPointLight({ lightRef, enabled = true, lerp = 0.1 }: MovingPointLightProps) {
  const { gl } = useThree()
  const targetRef = useRef({ x: 0, y: 0 })
  const safeLerp = clampNumber(lerp, 0.01, 1, 0.1)

  const handlePointerMove = useCallback((event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    targetRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    targetRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }, [gl])

  useEffect(() => {
    if (!enabled) {
      targetRef.current.x = 0
      targetRef.current.y = 0
      return
    }
    const dom = gl.domElement
    dom.addEventListener('mousemove', handlePointerMove)
    return () => dom.removeEventListener('mousemove', handlePointerMove)
  }, [gl, handlePointerMove, enabled])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return
    const basePos = { x: 0, y: -1.3, z: -2 }
    const spread = { x: 1.8, y: 0.0, z: 0.08 }
    const tx = enabled ? basePos.x + targetRef.current.x * spread.x : basePos.x
    const tz = enabled ? basePos.z + targetRef.current.y * spread.z : basePos.z
    light.position.x += (tx - light.position.x) * safeLerp
    light.position.z += (tz - light.position.z) * safeLerp
  })

  return (
    <pointLight
      ref={lightRef}
      castShadow
      position={[0, -1.3, -2]}
      distance={100}
      decay={0.7}
      color="#fff"
    />
  )
}

interface SceneContentProps {
  isZoomed: boolean
  setIsZoomed: (value: boolean | ((prev: boolean) => boolean)) => void
  videoRef: React.RefObject<HTMLVideoElement | null>
  deviceType: DeviceType
  mouseMovement: boolean
  intensity: number
  lerp: number
}

function SceneContent({ isZoomed, setIsZoomed, videoRef, deviceType, mouseMovement, intensity, lerp }: SceneContentProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const lightRef = useRef<THREE.PointLight | null>(null)
  const { camera } = useThree()
  const [environmentIntensity, setEnvironmentIntensity] = useState(ENV_INTENSITY_CONFIG.out)
  const safeIntensity = clampNumber(intensity, 0, 10, 3)
  const latestIntensityRef = useRef(safeIntensity)

  const intensityState = useRef({
    env: ENV_INTENSITY_CONFIG.out,
    light: safeIntensity
  })

  const handleModelClick = useCallback((e: any) => {
    e?.stopPropagation()
    setIsZoomed(prev => !prev)
  }, [setIsZoomed])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomed(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setIsZoomed])

  useEffect(() => {
    const duration = 1.5
    const ease = 'power3.inOut'
    const cfg = CAMERA_CONFIG[deviceType] ?? CAMERA_CONFIG.desktop

    gsap.killTweensOf(camera.position)
    if (groupRef.current) gsap.killTweensOf(groupRef.current.rotation)

    if (isZoomed) {
      gsap.to(camera.position, { x: 0, y: 0.05, z: cfg.zoomedZ, duration, ease })
      gsap.to((groupRef.current as THREE.Group).rotation, { x: 0, y: 0, z: 0, duration, ease })
    } else {
      gsap.to(camera.position, { x: 0, y: 0, z: cfg.outZ, duration, ease })
      gsap.to((groupRef.current as THREE.Group).rotation, { x: 0, y: 0, z: degToRad(-5), duration, ease })
    }

    gsap.to(intensityState.current, {
      env: isZoomed ? ENV_INTENSITY_CONFIG.zoomed : ENV_INTENSITY_CONFIG.out,
      light: isZoomed ? ENV_INTENSITY_CONFIG.lightZoomed : latestIntensityRef.current,
      duration,
      ease,
      onUpdate: () => setEnvironmentIntensity(intensityState.current.env),
    })
  }, [isZoomed, camera, deviceType])

  useEffect(() => {
    latestIntensityRef.current = safeIntensity
    if (!isZoomed) {
      intensityState.current.light = safeIntensity
    }
  }, [isZoomed, safeIntensity])

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = intensityState.current.light
    }
  })

  return (
    <>
      <MovingPointLight lightRef={lightRef} enabled={mouseMovement} lerp={lerp} />

      <Environment
        background={false}
        files='https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/1k/wooden_studio_08_1k.exr'
        environmentIntensity={environmentIntensity}
        environmentRotation={[0, degToRad(40), 0]}
      />

      <group ref={groupRef} rotation={[0, 0, degToRad(-5)]}>
        <RoomModel
          onClick={handleModelClick}
          isZoomed={isZoomed}
          mouseMovement={mouseMovement}
          videoRef={videoRef}
        />
      </group>
    </>
  )
}

interface HeroBannerAnimatedProps {
  mouseMovement?: boolean
  intensity?: number
  lerp?: number
  accentColor?: string
}

export default function HeroBannerAnimated({
  mouseMovement = true,
  intensity = 3,
  lerp = 0.1,
  accentColor = "#ECE4B4",
}: HeroBannerAnimatedProps = {}) {
  const rootRef = useRef<HTMLElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never' | 'demand'>('always')
  const [isZoomed, setIsZoomed] = useState(false)
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const isMobile = deviceType === 'mobile'
  const prefersReducedMotion = usePrefersReducedMotion()


  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? 'always' : 'never'),
    })
    setFrameloop(gate.isActive ? 'always' : 'never')
    return () => gate.destroy()
  }, [])

  useEffect(() => {
    const tabletMq = window.matchMedia('(max-width: 1025px)')
    const mobileMq = window.matchMedia('(max-width: 767px)')

    const update = () => {
      if (mobileMq.matches) {
        setDeviceType('mobile')
        return
      }

      if (tabletMq.matches) {
        setDeviceType('tablet')
        return
      }

      setDeviceType('desktop')
    }

    update()
    tabletMq.addEventListener('change', update)
    mobileMq.addEventListener('change', update)

    return () => {
      tabletMq.removeEventListener('change', update)
      mobileMq.removeEventListener('change', update)
    }
  }, [])

  return (
    <>

      <section
        ref={rootRef}
        className="w-full h-screen overflow-hidden bg-black relative"
        style={{ "--hero-accent-color": accentColor } as React.CSSProperties}
      >
        <AnimatePresence>
          {!isZoomed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              className='absolute py-[5vw] px-[4vw] z-999 pointer-events-none top-0 left-0 text-[var(--hero-accent-color)] w-full h-full max-sm:py-[8vw] max-sm:px-[5vw]'
            >
              <div className='flex items-start max-md:hidden pt-[2vw] gap-[2vw] max-md:pt-[10vw] max-md:gap-[4vw]'>
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
                  className='text-[15vw] font-semibold leading-[0.6]! tracking-tight max-md:text-[28vw]'
                >
                  HXR
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className='uppercase w-[25vw] translate-y-[-6vw] text-[1vw]  flex items-center justify-center text-left max-[1025px]:w-[45vw] max-md:w-[45vw] max-[1025px]:text-[2vw] max-md:text-[2.8vw] max-md:translate-y-[-8vw]'
                >
                  Hyperiux immersion labs is an independent design agency in india.
                  <span className='w-6 h-3 flex mt-[1.5vw] bg-[var(--hero-accent-color)] max-sm:hidden items-center justify-center mr-[3vw] max-sm:mt-[3vw]'>
                    <span className='w-1 h-1 bg-black rounded-full block'></span>
                  </span>
                </motion.p>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className='text-[15vw] max-md:hidden max-md:pt-auto pt-[30vh] max-md:pt-[50vh] font-semibold tracking-tight text-right w-full max-md:text-[28vw]'
              >
                UI
              </motion.p>

             <motion.p
 initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 1, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
  className='absolute flex items-center justify-center gap-5 bottom-[2vw] uppercase text-[1vw] left-1/2 -translate-x-1/2 w-full text-center text-xs max-[1025px]:text-[2.5vw] max-md:text-[3vw] max-md:bottom-[40%] pointer-events-auto'
>
  <Link prefetch={false} href="/effects" className='pointer-events-auto'>
    Explore All Effects
  </Link>
  <Play className='w-4 h-4 max-md:hidden' fill='var(--hero-accent-color)' />
  <Link prefetch={false} href="/effects/wegl-effects/hero-banner-animated" className='pointer-events-auto'>
    Read Article
  </Link>


</motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                className='flex absolute bottom-[6vw] left-[2vw] items-center gap-[2vw] max-md:bottom-[10vw] max-md:left-[3vw]'
              >
                <div className='w-[.3vw] ml-[3vw] space-y-[.2vw] h-[5vw] max-sm:w-[.6vw] max-sm:ml-[4vw] max-sm:h-[9vw] max-sm:space-y-[.5vw]'>
                  <div className='w-full h-[.7vw] max-sm:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                  <div className='w-full h-full bg-[var(--hero-accent-color)]' />
                  <div className='w-full h-[.7vw] max-sm:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                  <div className='w-full h-[.7vw] max-sm:h-[1.4vw]' style={{ backgroundColor: "color-mix(in srgb, var(--hero-accent-color) 30%, transparent)" }} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isMobile && (
          <>
            <Canvas
              aria-hidden="true"
              dpr={[1, 2]}
              camera={{ position: [0, 0, CAMERA_CONFIG[deviceType].outZ], fov: 55 }}
              frameloop={frameloop}
            >
              <Center>
                <SceneContent
                  isZoomed={isZoomed}
                  setIsZoomed={setIsZoomed}
                  videoRef={videoRef}
                  deviceType={deviceType}
                  mouseMovement={mouseMovement}
                  intensity={intensity}
                  lerp={lerp}
                />
              </Center>

              <EffectComposer>
                <EdgeBlurEffect blurType="classic" blurStrength={1.5} blurStart={0.4} />
                <CustomGrainNoise amount={0.01} scale={1.5} opacity={0.9} />
              </EffectComposer>
            </Canvas>

            <VideoUI
              videoRef={videoRef}
              isZoomed={isZoomed}
              setIsZoomed={setIsZoomed}
            />
          </>
        )}

        {isMobile && (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-8 text-center pointer-events-none">
            <div className="flex max-w-sm flex-col items-center gap-3 text-[var(--hero-accent-color)]">
              <p className="text-[8vw] font-light leading-none tracking-tight uppercase">
                Open on desktop
              </p>            
              <p className="text-sm leading-relaxed opacity-60">
                For the full room, video, and immersive motion experience, view this scene on a larger screen.
              </p>
            </div>
          </div>
        )}

        {prefersReducedMotion && (
          <div
            aria-live="polite"
            className="pointer-events-none fixed top-16 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
          >
            <h2 className="text-sm leading-none text-white">
              The light keeps tracking.
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/65">
              Hero Banner Animated moves light with your cursor in
              real time and zooms the scene on click. Since that tracking
              motion is continuous, reduced motion can&apos;t be applied
              here.
            </p>
          </div>
        )}
      </section>
    </>
  )
}
