// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three/webgpu'
import { texture, uv, uniform, sub, length, mul, add, oneMinus } from 'three/tsl'
import { createVisibilityGate } from './createSuspendedRaf'

const DEFAULT_IMAGE_SRC =
  'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg'

const damp = (current: number, target: number, lambda: number, delta: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * delta))

const durationToDamp = (duration: number) => {
  const seconds = Math.max(Number(duration) || 0, 0)
  return seconds === 0 ? 1000 : 1 / seconds
}

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

function loadCorsObjectUrl(src: string): Promise<string> {
  return fetch(src, { mode: 'cors', credentials: 'omit', cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`Image request failed with ${res.status}`)
      return res.blob()
    })
    .then((blob) => URL.createObjectURL(blob))
}

interface ImageNodeMaterialProps {
  src: string
  isMobile: boolean
  bulgeEffect: number
  duration: number
  smoothness: number
  mouseInteractive: boolean
}

function ImageNodeMaterial({
  src,
  isMobile,
  bulgeEffect,
  duration,
  smoothness,
  mouseInteractive,
}: ImageNodeMaterialProps) {
  const sourceMap = useTexture(src) as THREE.Texture
  const { size, camera } = useThree()

  const height =
    2 * Math.tan(((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180 / 2) * camera.position.z

  const width = height * (size.width / size.height)

  const mouse = useRef(new THREE.Vector2(0.5, 0.5))
  const target = useRef(new THREE.Vector2(0.5, 0.5))
  const strength = useRef(0)
  const strengthTarget = useRef(0)
  const materialRef = useRef<any>(null)

  const map = useMemo(() => {
    const clonedMap = sourceMap.clone()
    clonedMap.colorSpace = THREE.SRGBColorSpace
    clonedMap.needsUpdate = true
    return clonedMap
  }, [sourceMap])

  useEffect(() => {
    return () => {
      map.dispose()
    }
  }, [map])

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicNodeMaterial()

    const mouseU = uniform(new THREE.Vector2(0.5, 0.5))
    const strengthU = uniform(0)

    const baseUV = uv()
    const diff = sub(baseUV, mouseU)
    const dist = length(diff)

    const falloff = oneMinus(dist).pow(2)

    const displacement = mul(diff, falloff).mul(strengthU.negate())

    const distortedUV = add(baseUV, displacement)

    mat.colorNode = texture(map, distortedUV)

    mat.userData.mouseU = mouseU
    mat.userData.strengthU = strengthU

    return mat
  }, [map])

  useEffect(() => {
    materialRef.current = material
    return () => {
      materialRef.current = null
    }
  }, [material])

  useFrame((_, delta) => {
    const currentMaterial = materialRef.current
    if (!currentMaterial) return

    const canInteract = !isMobile && mouseInteractive
    const mouseDamp = durationToDamp(smoothness)
    const strengthDamp = durationToDamp(duration)

    if (!canInteract) {
      target.current.set(0.5, 0.5)
      strengthTarget.current = 0
    } else if (strengthTarget.current > 0) {
      strengthTarget.current = Math.max(Number(bulgeEffect) || 0, 0)
    }

    if (!isMobile) {
      mouse.current.x = damp(mouse.current.x, target.current.x, mouseDamp, delta)
      mouse.current.y = damp(mouse.current.y, target.current.y, mouseDamp, delta)

      strength.current = damp(
        strength.current,
        strengthTarget.current,
        strengthDamp,
        delta
      )
    }

    currentMaterial.userData.mouseU.value.copy(mouse.current)
    currentMaterial.userData.strengthU.value = isMobile ? 0 : strength.current
  })

  return (
    <mesh
      material={material}
      onPointerMove={
        isMobile || !mouseInteractive
          ? undefined
          : (e: ThreeEvent<PointerEvent>) => {
              if (!e.uv) return
              target.current.copy(e.uv)
              strengthTarget.current = Math.max(Number(bulgeEffect) || 0, 0)
            }
      }
      onPointerLeave={
        isMobile || !mouseInteractive
          ? undefined
          : () => {
              target.current.set(0.5, 0.5)
              strengthTarget.current = 0
            }
      }
    >
      <planeGeometry args={[width, height]} />
    </mesh>
  )
}

interface FishEyeProps {
  bulgeEffect?: number
  duration?: number
  smoothness?: number
  mouseInteractive?: boolean
}

export default function FishEye({
  bulgeEffect = 1,
  duration = 0.125,
  smoothness = 0.083,
  mouseInteractive = true,
}: FishEyeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [frameloop, setFrameloop] = useState<'always' | 'never'>('always')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: coarse)')
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isMobile) return undefined

    let url: string | null = null
    loadCorsObjectUrl(DEFAULT_IMAGE_SRC)
      .then((u) => {
        url = u
        setObjectUrl(u)
      })
      .catch((err) => console.warn('FishEye texture load failed:', err))

    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [isMobile])

  useEffect(() => {
    const gate = createVisibilityGate({
      root: rootRef,
      onChange: (active) => setFrameloop(active ? 'always' : 'never'),
    })
    setFrameloop(gate.isActive ? 'always' : 'never')
    return () => gate.destroy()
  }, [])

  if (isMobile) return null

  return (
    <div ref={rootRef} className="h-full w-fit">
      {objectUrl ? (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          className="h-full w-full"
          frameloop={frameloop}
          style={{
            pointerEvents: isMobile ? 'none' : 'auto',
            touchAction: isMobile ? 'none' : 'auto',
          }}
          gl={({ canvas }: any) => {
            const renderer = new THREE.WebGPURenderer({
              canvas,
              antialias: true,
            })

            renderer.outputColorSpace = THREE.SRGBColorSpace
            renderer.toneMapping = THREE.NoToneMapping
            renderer.init()

            return renderer
          }}
        >
          <ImageNodeMaterial
            src={objectUrl}
            isMobile={isMobile}
            bulgeEffect={bulgeEffect}
            duration={duration}
            smoothness={smoothness}
            mouseInteractive={mouseInteractive}
          />
        </Canvas>
      ) : null}
      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-8 left-20 z-40 w-fit max-w-[30vw] rounded-md border border-black/10 bg-white p-3 text-center max-md:hidden"
        >
          <h2 className="text-sm leading-none text-black">
            The lens keeps bending.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black">
            Fish Eye distorts the image as your cursor moves across it.
            Since the warp is driven entirely by motion, there&apos;s no
            reduced motion version to fall back on.
          </p>
        </div>
      )}
    </div>
  )
}
