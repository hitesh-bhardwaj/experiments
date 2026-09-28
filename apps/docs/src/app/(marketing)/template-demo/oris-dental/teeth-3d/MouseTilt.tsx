'use client'

import React, { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { degToRad } from 'three/src/math/MathUtils.js'

interface MouseTiltProps {
    children: React.ReactNode
    intensity?: number
}

export default function MouseTilt({ children, intensity = 8 }: MouseTiltProps) {
    const groupRef = useRef<THREE.Group | null>(null)
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const width = typeof window !== 'undefined' ? window.innerWidth || 1 : 1
            const height = typeof window !== 'undefined' ? window.innerHeight || 1 : 1
            // Normalize to [-1, 1] range across entire window
            mouseRef.current.x = (e.clientX / width) * 2 - 1
            mouseRef.current.y = -(e.clientY / height) * 2 + 1
        }

        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    useFrame((_, rawDelta) => {
        if (!groupRef.current) return

        // Clamped to a 30fps step to prevent frame jump spikes
        const delta = Math.min(rawDelta, 1 / 30)

        const targetX = -mouseRef.current.y * degToRad(intensity)
        const targetY = mouseRef.current.x * degToRad(intensity)

        // Faster lerp towards target rotation (less lag)
        groupRef.current.rotation.x += (targetX - groupRef.current.rotation.x) * delta * 6
        groupRef.current.rotation.y += (targetY - groupRef.current.rotation.y) * delta * 6
    })

    return (
        <group ref={groupRef}>
            {children}
        </group>
    )
}
