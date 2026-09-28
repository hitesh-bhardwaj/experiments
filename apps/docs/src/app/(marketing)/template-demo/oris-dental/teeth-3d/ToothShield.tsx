'use client'

import React, { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { buildToothShell } from './toothShellGeometry'
import { createToothShieldMaterial, MAX_HITS } from './toothShieldMaterial'

export interface ToothShieldProps {
    /** The loaded GLB root - the shield surface is a copy of its geometry. */
    source: THREE.Object3D
    color?: string
    edgeColor?: string
    /** Thickness of the layer over the enamel, as a fraction of the model size. */
    inflate?: number
    opacity?: number
    hexOpacity?: number
    hexScale?: number
    /** Rate and strength of the per-cell twinkle across the hex grid. */
    flashSpeed?: number
    flashIntensity?: number
    /** Scale of the dissolve noise. Higher = finer, more broken-up reveal. */
    noiseScale?: number
    fresnelStrength?: number
    flowIntensity?: number
    /** Height at which the shield has fully faded in, -1 = base, 1 = top of the crown. */
    fadeStart?: number
    revealDuration?: number
    /**
     * Metalness above this is treated as the titanium post and gets no shield.
     * glTF packs metalness in the blue channel of the metallicRoughness map.
     */
    metalThreshold?: number
    metalSoftness?: number
    /** Hover spotlight controls */
    hoverRadius?: number
    hoverIntensity?: number
    /** How strongly a ripple lights the shield up on click. */
    hitIntensity?: number
    hitAlpha?: number
    /** Ripples that fire on their own, the same effect a click produces. */
    autoPulse?: boolean
    autoPulseInterval?: number
}

/**
 * Hex-grid energy shield laid over the tooth with hover spotlight and click ripple effects.
 */
export default function ToothShield({
    source,
    color = '#3365e2',
    edgeColor = '#a8c4ff',
    inflate = 0.0,
    opacity = 0.72,
    hexOpacity = 0.13,
    hexScale = 8.7,
    flashSpeed = 1.85,
    flashIntensity = 0.07,
    noiseScale = 7.0,
    fresnelStrength = 1.9,
    flowIntensity = 2.8,
    fadeStart = 1.0,
    revealDuration = 1.4,
    metalThreshold = 0.13,
    metalSoftness = 0.5,
    hoverRadius = 0.5,
    hoverIntensity = 1.05,
    hitIntensity = 1.2,
    hitAlpha = 0.35,
    autoPulse = false,
    autoPulseInterval = 8.0,
}: ToothShieldProps) {
    const meshRef = useRef<THREE.Mesh | null>(null)
    const { gl, camera } = useThree()

    const shell = useMemo(() => buildToothShell(source, { inflate }), [source, inflate])

    const material = useMemo(
        () => createToothShieldMaterial({ color, edgeColor }),
        [color, edgeColor],
    )

    const clock = useRef({ time: 0, slot: 0, nextPulse: 2.6 })
    const hoverState = useRef({
        targetPos: new THREE.Vector3(),
        currentPos: new THREE.Vector3(),
        strength: 0,
        active: false,
    })

    const scratch = useMemo(
        () => ({
            camera: new THREE.Vector3(),
            point: new THREE.Vector3(),
            normal: new THREE.Vector3(),
            view: new THREE.Vector3(),
        }),
        [],
    )

    // react-hooks/immutability (below, and at every other uniforms.*.value
    // assignment / useFrame callback in this file) is a React Compiler
    // readiness rule: it assumes a useMemo'd value is never mutated after
    // render. Driving a THREE.ShaderMaterial's uniforms imperatively every
    // frame - not through setState/re-render - is the standard,
    // required-for-performance react-three-fiber pattern; going through
    // state here would mean a re-render on every animation frame. This repo
    // doesn't run React Compiler (no babel-plugin-react-compiler/
    // next.config reactCompiler flag), so the rule is only advisory today -
    // suppressed rather than restructured, since rebuilding this around a
    // ref-recreated material to satisfy a not-yet-enabled compiler isn't
    // worth the regression risk to a working shader.
    useEffect(() => {
        if (!shell) return
        const u = material.uniforms
        u.uCenter.value.copy(shell.center)
        // eslint-disable-next-line react-hooks/immutability -- see note above
        u.uInvSize.value = 2 / shell.size
        u.uMetalnessMap.value = shell.metalnessMap
        u.uUseMetalMask.value = shell.metalnessMap ? 1 : 0
    }, [shell, material])

    useEffect(() => {
        const u = material.uniforms
        // eslint-disable-next-line react-hooks/immutability -- see note above
        u.uOpacity.value = opacity
        u.uHexOpacity.value = hexOpacity
        u.uHexScale.value = hexScale
        u.uFlashSpeed.value = flashSpeed
        u.uFlashIntensity.value = flashIntensity
        u.uNoiseScale.value = noiseScale
        u.uFresnelStrength.value = fresnelStrength
        u.uFlowIntensity.value = flowIntensity
        u.uFadeStart.value = fadeStart
        u.uMetalThreshold.value = metalThreshold
        u.uMetalSoftness.value = metalSoftness
        u.uHoverRadius.value = hoverRadius
        u.uHoverIntensity.value = hoverIntensity
        u.uHitIntensity.value = hitIntensity
        u.uHitAlpha.value = hitAlpha
    }, [
        material,
        opacity,
        hexOpacity,
        hexScale,
        flashSpeed,
        flashIntensity,
        noiseScale,
        fresnelStrength,
        flowIntensity,
        fadeStart,
        metalThreshold,
        metalSoftness,
        hoverRadius,
        hoverIntensity,
        hitIntensity,
        hitAlpha,
    ])

    useEffect(() => {
        return () => {
            shell?.geometry.dispose()
            material.dispose()
        }
    }, [shell, material])

    // ── Reveal, chained to the loader event ───────────────────────────────────
    useEffect(() => {
        const reveal = { value: 1.05 }
        let tween: gsap.core.Tween | null = null

        const start = () => {
            tween = gsap.to(reveal, {
                value: 0,
                duration: revealDuration,
                delay: 0.35,
                ease: 'power2.inOut',
                onUpdate: () => {
                    material.uniforms.uReveal.value = reveal.value
                },
            })
        }

        if (typeof window !== 'undefined' && (window as any).__orisLoaderFinished) {
            start()
            return () => {
                tween?.kill()
            }
        }

        window.addEventListener('oris-loader-finished', start, { once: true })
        return () => {
            window.removeEventListener('oris-loader-finished', start)
            tween?.kill()
        }
    }, [material, revealDuration])

    // ── Hits ─────────────────────────────────────────────────────────────────
    // registerHit's returned closure mutates material.uniforms imperatively
    // (same r3f pattern noted above the first useEffect).
    // eslint-disable-next-line react-hooks/immutability -- see note above
    const registerHit = useMemo(() => {
        const normalised = new THREE.Vector3()
        return (localPoint: THREE.Vector3) => {
            if (!shell) return
            normalised.copy(localPoint).sub(shell.center).multiplyScalar(2 / shell.size)

            const slot = clock.current.slot % MAX_HITS
            const positions = material.uniforms.uHitPos.value as THREE.Vector3[]
            const times = material.uniforms.uHitTime.value as number[]
            positions[slot].copy(normalised)
            // eslint-disable-next-line react-hooks/immutability -- see note above
            times[slot] = clock.current.time
            clock.current.slot++
        }
    }, [shell, material])

    // This effect calls registerHit, which mutates material.uniforms - same
    // r3f pattern noted above.
    // eslint-disable-next-line react-hooks/immutability -- see note above
    useEffect(() => {
        if (!shell) return

        const raycaster = new THREE.Raycaster()
        const ndc = new THREE.Vector2()
        const local = new THREE.Vector3()

        const updateRaycast = (clientX: number, clientY: number) => {
            const mesh = meshRef.current
            if (!mesh) return null

            const rect = gl.domElement.getBoundingClientRect()
            if (!rect.width || !rect.height) return null

            ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
            ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
            if (ndc.x < -1 || ndc.x > 1 || ndc.y < -1 || ndc.y > 1) return null

            raycaster.setFromCamera(ndc, camera)
            const hit = raycaster.intersectObject(mesh, false)[0]
            if (!hit) return null

            local.copy(hit.point)
            mesh.worldToLocal(local)
            return local
        }

        const onPointerMove = (event: PointerEvent) => {
            const localPoint = updateRaycast(event.clientX, event.clientY)
            if (localPoint && shell) {
                hoverState.current.targetPos.copy(localPoint).sub(shell.center).multiplyScalar(2 / shell.size)
                hoverState.current.active = true
            } else {
                hoverState.current.active = false
            }
        }

        const onPointerDown = (event: PointerEvent) => {
            const localPoint = updateRaycast(event.clientX, event.clientY)
            if (localPoint) {
                registerHit(localPoint)
            }
        }

        const onPointerLeave = () => {
            hoverState.current.active = false
        }

        window.addEventListener('pointermove', onPointerMove, { passive: true })
        window.addEventListener('pointerdown', onPointerDown, { passive: true })
        window.addEventListener('pointerleave', onPointerLeave, { passive: true })
        window.addEventListener('blur', onPointerLeave)

        return () => {
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointerleave', onPointerLeave)
            window.removeEventListener('blur', onPointerLeave)
        }
    }, [shell, gl, camera, registerHit])

    // Per-frame uniform updates - same r3f pattern noted above; going
    // through setState here would re-render the component on every frame.
    // eslint-disable-next-line react-hooks/immutability -- see note above
    useFrame((state, rawDelta) => {
        if (!shell) return
        const delta = Math.min(rawDelta, 1 / 30)
        clock.current.time += delta
        // eslint-disable-next-line react-hooks/immutability -- see note above
        material.uniforms.uTime.value = clock.current.time

        // Smoothly lerp hover position and strength
        const targetStrength = hoverState.current.active ? 1.0 : 0.0
        hoverState.current.strength += (targetStrength - hoverState.current.strength) * Math.min(1, delta * 8.0)
        hoverState.current.currentPos.lerp(hoverState.current.targetPos, Math.min(1, delta * 12.0))

        material.uniforms.uHoverPos.value.copy(hoverState.current.currentPos)
        material.uniforms.uHoverStrength.value = hoverState.current.strength

        if (!autoPulse) return

        clock.current.nextPulse -= delta
        if (clock.current.nextPulse > 0) return
        clock.current.nextPulse = autoPulseInterval * (0.7 + Math.random() * 0.6)

        const mesh = meshRef.current
        if (!mesh) return

        const attribute = shell.geometry.attributes.position as THREE.BufferAttribute
        const normalAttribute = shell.geometry.attributes.normal as THREE.BufferAttribute
        const toCamera = mesh.worldToLocal(scratch.camera.copy(state.camera.position))

        let best = -1
        let bestScore = -Infinity
        for (let attempt = 0; attempt < 12; attempt++) {
            const candidate = Math.floor(Math.random() * attribute.count)
            scratch.point.fromBufferAttribute(attribute, candidate)
            scratch.normal.fromBufferAttribute(normalAttribute, candidate)
            const score =
                scratch.normal.dot(scratch.view.subVectors(toCamera, scratch.point).normalize()) +
                (scratch.point.y - shell.center.y) / shell.size
            if (score > bestScore) {
                bestScore = score
                best = candidate
            }
        }
        if (best < 0) return

        scratch.point.fromBufferAttribute(attribute, best)
        registerHit(scratch.point)
    })

    if (!shell) return null

    return (
        <group position={source.position} quaternion={source.quaternion} scale={source.scale}>
            <mesh ref={meshRef} geometry={shell.geometry} material={material} frustumCulled={false} renderOrder={2} />
        </group>
    )
}
