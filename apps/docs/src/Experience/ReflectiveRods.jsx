'use client'

import { Environment, Instances, RoundedBoxGeometry } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { usePathname } from 'next/navigation'
import React, { useMemo, useEffect, useRef, useState } from 'react'
import { Vector2 } from 'three'
import RodsGroup1 from './RodsGroup1'
import RodsGroup2 from './RodsGroup2'
import { createRollState, ROLL_SENSITIVITY } from './rollDrive'

const ctr = (degrees) => degrees * (Math.PI / 180)

const isInteractive = (target) =>
    target?.closest?.('a, button, input, textarea, select, [role="button"]')

// Drives drag-to-roll. The canvas is pointer-events:none (so it never blocks
// the footer buttons), so instead of relying on R3F's DOM events we raycast
// from the camera through the pointer on each drag and roll only the group the
// pointer is actually over - keeping the two groups independent.
function DragController({ group1Ref, group2Ref, roll1Ref, roll2Ref, active }) {
    const camera = useThree((state) => state.camera)
    const raycaster = useThree((state) => state.raycaster)
    const gl = useThree((state) => state.gl)

    useEffect(() => {
        if (!active) {
            roll1Ref.current.dragging = false
            roll2Ref.current.dragging = false
            return
        }

        const ndc = new Vector2()
        let activeRoll = null
        let lastY = 0

        // Returns the roll state of the nearest group under the pointer, or null.
        const pickGroup = (clientX, clientY) => {
            const rect = gl.domElement.getBoundingClientRect()
            ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
            ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
            raycaster.setFromCamera(ndc, camera)

            const h1 = group1Ref.current
                ? raycaster.intersectObject(group1Ref.current, true)
                : []
            const h2 = group2Ref.current
                ? raycaster.intersectObject(group2Ref.current, true)
                : []
            const d1 = h1.length ? h1[0].distance : Infinity
            const d2 = h2.length ? h2[0].distance : Infinity

            if (d1 === Infinity && d2 === Infinity) return null
            return d1 <= d2 ? roll1Ref : roll2Ref
        }

        const handlePointerDown = (e) => {
            if (isInteractive(e.target)) return
            const picked = pickGroup(e.clientX, e.clientY)
            if (!picked) return
            activeRoll = picked
            lastY = e.clientY
            picked.current.dragging = true
            picked.current.velocity = 0
            picked.current.pendingDelta = 0
        }

        const handlePointerMove = (e) => {
            if (!activeRoll) return
            // Vertical swipe rolls the bars around their own length.
            activeRoll.current.pendingDelta += (e.clientY - lastY) * ROLL_SENSITIVITY
            lastY = e.clientY
        }

        const handlePointerUp = () => {
            if (activeRoll) activeRoll.current.dragging = false
            activeRoll = null
        }

        window.addEventListener('pointerdown', handlePointerDown)
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        return () => {
            window.removeEventListener('pointerdown', handlePointerDown)
            window.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('pointerup', handlePointerUp)
        }
    }, [active, camera, raycaster, gl, group1Ref, group2Ref, roll1Ref, roll2Ref])

    return null
}

function RenderKickstart({ active }) {
    const invalidate = useThree((state) => state.invalidate)

    useEffect(() => {
        if (!active) return

        invalidate()

        let frame = 0
        let rafId = 0
        const tick = () => {
            invalidate()
            frame += 1
            if (frame < 8) rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)

        return () => cancelAnimationFrame(rafId)
    }, [active, invalidate])

    return null
}

// Subtle mouse-follow parallax tilt of the whole assembly (the original effect).
function ParallaxTilt({ mouse, active, children }) {
    const groupRef = useRef()

    useFrame(() => {
        if (!active || !groupRef.current) return

        const targetRotX = mouse.current.y * 0.05
        const targetRotY = mouse.current.x * 0.05

        groupRef.current.rotation.x +=
            (targetRotX - groupRef.current.rotation.x) * 0.05
        groupRef.current.rotation.y +=
            (targetRotY - groupRef.current.rotation.y) * 0.05
    })

    return <group ref={groupRef}>{children}</group>
}

function RodsScene({ mouse, active, roll1, roll2 }) {
    const group1Ref = useRef()
    const group2Ref = useRef()
    const commonProps = useMemo(
        () => ({
            radius: 0.18,
            smoothness: 6,
            materialProps: {
                color: '#ffffff',
                metalness: 1.0,
                roughness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0,
                envMapIntensity: 4.0,
                iridescence: 1.0,
                iridescenceIOR: 2.4,
                iridescenceThicknessRange: [100, 600],
            },
        }),
        [],
    )

    return (
        <>
            <RenderKickstart active={active} />
            <Environment files="/studio.exr" />
            <ambientLight intensity={0.5} />
            <pointLight
                position={[-10, 5, 5]}
                color="#00e5ff"
                intensity={8}
                distance={30}
                decay={2}
            />
            <pointLight
                position={[10, 5, 5]}
                color="#ff007f"
                intensity={8}
                distance={30}
                decay={2}
            />
            <pointLight position={[0, 8, 10]} color="#ffffff" intensity={3} />

            <DragController
                group1Ref={group1Ref}
                group2Ref={group2Ref}
                roll1Ref={roll1}
                roll2Ref={roll2}
                active={active}
            />

            <Instances limit={6}>
                {(RodInstance) => (
                    <>
                        <RoundedBoxGeometry
                            args={[1, 1, 1]}
                            radius={commonProps.radius}
                            smoothness={commonProps.smoothness}
                        />
                        <meshPhysicalMaterial {...commonProps.materialProps} />
                        <ParallaxTilt mouse={mouse} active={active}>
                            <group ref={group1Ref}>
                                <RodsGroup1
                                    ctr={ctr}
                                    RodInstance={RodInstance}
                                    rollStateRef={roll1}
                                    active={active}
                                />
                            </group>
                            <group ref={group2Ref}>
                                <RodsGroup2
                                    ctr={ctr}
                                    RodInstance={RodInstance}
                                    rollStateRef={roll2}
                                    active={active}
                                />
                            </group>
                        </ParallaxTilt>
                    </>
                )}
            </Instances>
        </>
    )
}

export default function ReflectiveRods() {
    const pathname = usePathname()
    const containerRef = useRef(null)
    const mouse = useRef({ x: 0, y: 0 })
    const roll1 = useRef(null)
    const roll2 = useRef(null)
    if (roll1.current == null) roll1.current = createRollState()
    if (roll2.current == null) roll2.current = createRollState()
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const syncVisibility = () => {
            const rect = el.getBoundingClientRect()
            return rect.bottom > 0 && rect.top < window.innerHeight
        }

        // IntersectionObserver can miss the initial state after client navigations
        setInView(syncVisibility())

        const observer = new IntersectionObserver(
            ([entry]) => setInView(entry.isIntersecting),
            { threshold: 0, rootMargin: '120px 0px' },
        )
        observer.observe(el)

        return () => observer.disconnect()
    }, [pathname])

    // Parallax follows the pointer at the window level so the canvas can stay
    // pointer-events:none and never swallow footer clicks. Drag-to-roll lives
    // in DragController (inside the Canvas) where it can raycast per group.
    useEffect(() => {
        if (!inView) {
            mouse.current.x = 0
            mouse.current.y = 0
            return
        }

        const handleMouseMove = (e) => {
            mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
            mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
        }

        const handleMouseLeave = () => {
            mouse.current.x = 0
            mouse.current.y = 0
        }

        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [inView])

    return (
        <section
            ref={containerRef}
            className="h-[110vw] max-md:hidden w-full z-999 absolute bottom-[-20%] left-0 flex flex-col items-center justify-center pointer-events-none"
            id="reflectiveRoadsCanvas"
        >
            <Canvas
                key={pathname}
                frameloop={inView ? 'always' : 'never'}
                camera={{ fov: 55, position: [0, 0.3, 8] }}
                dpr={[0.8, 1]}
                gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    // R3F forces the container to pointer-events:auto, which
                    // would swallow clicks/hovers meant for the footer buttons.
                    // We drive drag/parallax from window events, so disable it.
                    pointerEvents: 'none',
                }}
            >
                <RodsScene
                    mouse={mouse}
                    active={inView}
                    roll1={roll1}
                    roll2={roll2}
                />
            </Canvas>
        </section>
    )
}
