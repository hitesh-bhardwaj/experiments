'use client'

import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { Center, Environment } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import gsap from 'gsap'
// import MouseTilt from './MouseTilt'
import ToothShield from './ToothShield'
import { degToRad } from 'three/src/math/MathUtils.js'
import MouseTilt from './MouseTilt'
import { markModelParsed, markModelReady, reportModelDownload } from './modelLoadState'

// The GLB is served as a static file from `public/` rather than imported, so
// the bundler never has to handle a 6.5MB binary asset.
const MODEL_URL = '/templates/oris-dental/teeth-compressed.glb'

// The GLB is a single mesh sharing one material between the crown and the
// titanium post -- they are separated only by the metallicRoughness texture.
// So the whitening has to be gated per-fragment on metalness rather than per
// mesh, otherwise it washes the implant out too.
const ENAMEL_DESATURATE = 0.35 // 0 = raw texture, 1 = fully neutral grey
const ENAMEL_BRIGHTNESS = 1.05 // lift applied after desaturation
const ENAMEL_TINT = new THREE.Vector3(0.98, 0.99, 1.0) // faint cool cast, dielectric only

function whitenEnamel(mat: THREE.MeshPhysicalMaterial) {
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uDesaturate = { value: ENAMEL_DESATURATE }
        shader.uniforms.uBrightness = { value: ENAMEL_BRIGHTNESS }
        shader.uniforms.uTint = { value: ENAMEL_TINT }

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                uniform float uDesaturate;
                uniform float uBrightness;
                uniform vec3 uTint;`
            )
            // Injected after metalnessmap_fragment, not map_fragment: metalnessFactor
            // is only resolved by that point, and diffuseColor is still untouched.
            .replace(
                '#include <metalnessmap_fragment>',
                `#include <metalnessmap_fragment>
                float enamelMask = 1.0 - clamp(metalnessFactor, 0.0, 1.0);
                float enamelLuma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                vec3 enamelWhite = mix(diffuseColor.rgb, vec3(enamelLuma), uDesaturate);
                enamelWhite = clamp(enamelWhite * uBrightness * uTint, 0.0, 1.0);
                diffuseColor.rgb = mix(diffuseColor.rgb, enamelWhite, enamelMask);`
            )
    }

    // Keeps the shader variant from colliding with the untouched cache entry.
    mat.customProgramCacheKey = () => 'oris-enamel'

    return mat
}

// Stable identity: useLoader only reads the callback on the first (suspending)
// call, but keeping it out of the render body makes that explicit.
const handleModelProgress = (event: ProgressEvent) => {
    reportModelDownload(event.loaded, event.total)
}

function Model({ url }: { url: string }) {
    const { scene } = useLoader(GLTFLoader, url, undefined, handleModelProgress)

    useMemo(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
                const upgradeMaterial = (mat: any) => {
                    return whitenEnamel(new THREE.MeshPhysicalMaterial({
                        map: mat.map || null,
                        normalMap: mat.normalMap || null,
                        roughnessMap: mat.roughnessMap || null,
                        metalnessMap: mat.metalnessMap || null,
                        aoMap: mat.aoMap || null,
                        color: mat.color ? mat.color.clone() : new THREE.Color('#ffffff'),
                        // These are multipliers over the maps. The GLB authors both at
                        // 1.0, so anything lower silently flattens the titanium into a
                        // glossy dielectric -- keep the textures in charge where present.
                        roughness: mat.roughnessMap ? 1.0 : 0.35,
                        metalness: mat.metalnessMap ? 1.0 : 0.0,
                        clearcoat: 1.0,
                        clearcoatRoughness: 0.25,
                        ior: 2,
                        envMapIntensity: 1.0,
                        transparent: mat.transparent || false,
                        opacity: mat.opacity !== undefined ? mat.opacity : 1,
                        depthWrite: true,
                    }))
                }

                if (Array.isArray((child as THREE.Mesh).material)) {
                    ; (child as THREE.Mesh).material = ((child as THREE.Mesh).material as THREE.Material[]).map(upgradeMaterial)
                } else {
                    ; (child as THREE.Mesh).material = upgradeMaterial((child as THREE.Mesh).material)
                }
            }
        })
        markModelParsed()
    }, [scene])

    return (
        <>
            <primitive object={scene} />
            <ToothShield source={scene} />
        </>
    )
}

/**
 * Sits inside the Suspense boundary, so it only mounts once the model *and* the
 * environment map have resolved. Two rendered frames later the shader variants
 * are compiled and the first real paint is behind us -- that is the moment the
 * loader can safely uncover the hero without a freeze.
 */
function ReadyProbe() {
    const frames = useRef(0)

    useFrame(() => {
        if (frames.current > 2) return
        frames.current += 1
        if (frames.current === 3) markModelReady()
    })

    return null
}

function ScrollAnimatedGroup({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group | null>(null)

    useFrame((_, rawDelta) => {
        if (!groupRef.current) return
        const delta = Math.min(rawDelta, 1 / 30)

        // Scroll progress relative to viewport height
        const scrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0
        const vh = typeof window !== 'undefined' ? window.innerHeight || 800 : 800
        const progress = Math.min(Math.max(scrollY / vh, 0), 1.5)

        const targetRotY = progress * degToRad(120)
        const targetPosY = -progress * 0.2 // goes little down

        // Smooth physics-based lerp
        groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * delta * 5
        groupRef.current.position.y += (targetPosY - groupRef.current.position.y) * delta * 5
    })

    return <group ref={groupRef}>{children}</group>
}

function ModelEntranceGroup({ children }: { children: React.ReactNode }) {
    const groupRef = useRef<THREE.Group | null>(null)
    const animRef = useRef({
        y: -4.5,
        rotY: degToRad(720),
        entered: false,
    })

    useEffect(() => {
        const startEntrance = () => {
            if (animRef.current.entered) return
            animRef.current.entered = true

            gsap.to(animRef.current, {
                y: 0,
                rotY: 0,
                duration: 1.8,
                delay: 0.1,
                ease: 'power3.out',
            })
        }

        if (typeof window !== 'undefined' && (window as any).__orisLoaderFinished) {
            startEntrance()
            return
        }

        window.addEventListener('oris-loader-finished', startEntrance, { once: true })
        return () => window.removeEventListener('oris-loader-finished', startEntrance)
    }, [])

    useFrame(() => {
        if (!groupRef.current) return
        groupRef.current.position.y = animRef.current.y
        groupRef.current.rotation.y = animRef.current.rotY
    })

    return <group ref={groupRef}>{children}</group>
}

function ResponsiveModelGroup({ children }: { children: React.ReactNode }) {
    const { size } = useThree()
    const isMobile = size.width <= 640
    const isTablet = size.width <= 1025

    const scale = isMobile ? 2.0 : isTablet ? 2.5 : 3.5
    const posY = isMobile ? -1.3 : isTablet ? -1.2 : -0.7

    return (
        <group
            rotation={[degToRad(20), degToRad(0), degToRad(0)]}
            scale={scale}
            position={[0, posY, 0]}
        >
            {children}
        </group>
    )
}

export default function TeethCanvas() {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isInView, setIsInView] = useState(true)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting)
            },
            { threshold: 0 }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={containerRef} className='absolute inset-0 h-full w-full pointer-events-none z-0 max-md:top-[10%]'>
            <Canvas
                frameloop={isInView ? 'always' : 'never'}
                camera={{ position: [0, 0, 5], fov: 45 }}
                gl={{ antialias: true }}
                className="pointer-events-none"
            >
                <ambientLight intensity={1.35} color="#f4f8ff" />
                <directionalLight position={[10, 10, 10]} intensity={2.6} color="#ff0000" />
                <directionalLight position={[-10, 8, -5]} intensity={1.6} color="#eef4ff" />
                <pointLight position={[0, -5, 5]} intensity={1.1} color="#e0f2fe" />
                <Suspense fallback={null}>
                    {/* "studio" is a neutral HDRI -- "city" was pushing warm amber into the enamel. */}
                    <Environment preset="studio" environmentIntensity={0.9} />
                    <ReadyProbe />
                    <MouseTilt intensity={8}>
                        <ResponsiveModelGroup>
                            <ScrollAnimatedGroup>
                                <ModelEntranceGroup>
                                    <Center>
                                        <group rotation={[0, degToRad(180), 0]}>
                                            <Model url={MODEL_URL} />
                                        </group>
                                    </Center>
                                </ModelEntranceGroup>
                            </ScrollAnimatedGroup>
                        </ResponsiveModelGroup>
                    </MouseTilt>
                </Suspense>
            </Canvas>
        </div>
    )
}
