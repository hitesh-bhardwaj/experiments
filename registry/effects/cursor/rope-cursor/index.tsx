// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client"

import React, { useEffect, useRef, useState } from'react'
import { createSuspendedRaf } from './createSuspendedRaf'

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

interface RopeSegment {
	x: number
	y: number
}

interface RopeCursorProps {
	ropeColor?: string
	ropeWidth?: number
	ropeOpacity?: number
	segmentLength?: number
	segmentCount?: number
}

export default function RopeCursor({
	ropeColor ='#bda985',
	ropeWidth = 2,
	ropeOpacity = 0.6,
	segmentLength = 0,
	segmentCount = 8,
}: RopeCursorProps) {
	const svgRef = useRef<SVGSVGElement | null>(null)
	const pathRef = useRef<SVGPathElement | null>(null)
	const ropeSegments = useRef<RopeSegment[]>([])
	const mousePosition = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })
	const [isVisible, setIsVisible] = useState(false)
	const [isMobile, setIsMobile] = useState(false)
	const prefersReducedMotion = usePrefersReducedMotion()

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 1025)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)

		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	useEffect(() => {
		if (isMobile) return

 let isInitialized = false

 const initializeRopeSegments = (startX: number, startY: number) => {
 ropeSegments.current = Array.from({ length: segmentCount }, () => ({
 x: startX,
 y: startY
 }))
 isInitialized = true
 setIsVisible(true)
 }

 const handleMouseMove = (event: MouseEvent) => {
 mousePosition.current.x = event.clientX
 mousePosition.current.y = event.clientY

 if (!isInitialized && mousePosition.current.x !== null) {
 initializeRopeSegments(mousePosition.current.x, mousePosition.current.y)
 }
 }

 // Time-based smoothing factor equivalent to the settle time of a short
 // eased tween, applied directly each frame instead of allocating a new
 // gsap tween per segment per frame (previously ~480 tweens/sec).
 const smoothingAmount = (durationSeconds: number, deltaSeconds: number) =>
 1 - Math.exp((-3 * deltaSeconds) / durationSeconds)

 const updateLeadingSegment = (segments: RopeSegment[], targetX: number, targetY: number, deltaSeconds: number) => {
 const amount = smoothingAmount(0.05, deltaSeconds)
 segments[0].x += (targetX - segments[0].x) * amount
 segments[0].y += (targetY - segments[0].y) * amount
 }

 const updateFollowingSegments = (segments: RopeSegment[], deltaSeconds: number) => {
 for (let i = 1; i < segmentCount; i++) {
 const previousSegment = segments[i - 1]
 const currentSegment = segments[i]

 const deltaX = previousSegment.x - currentSegment.x
 const deltaY = previousSegment.y - currentSegment.y
 const distanceBetweenSegments = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

 if (distanceBetweenSegments > segmentLength) {
 const angleToTarget = Math.atan2(deltaY, deltaX)
 const constrainedX = previousSegment.x - Math.cos(angleToTarget) * segmentLength
 const constrainedY = previousSegment.y - Math.sin(angleToTarget) * segmentLength

 const amount = smoothingAmount(0.15 + i * 0.01, deltaSeconds)
 currentSegment.x += (constrainedX - currentSegment.x) * amount
 currentSegment.y += (constrainedY - currentSegment.y) * amount
 }
 }
 }

 const generateSmoothPath = (segments: RopeSegment[]) => {
 let pathData = `M ${segments[0].x} ${segments[0].y}`

 for (let i = 1; i < segmentCount - 1; i++) {
 const controlPointX = (segments[i].x + segments[i + 1].x) / 2
 const controlPointY = (segments[i].y + segments[i + 1].y) / 2
 pathData += ` Q ${segments[i].x} ${segments[i].y} ${controlPointX} ${controlPointY}`
 }

 const lastSegment = segments[segmentCount - 1]
 pathData += ` L ${lastSegment.x} ${lastSegment.y}`

 return pathData
 }

 let lastFrameTime: number | null = null

 const loop = createSuspendedRaf({
 root: svgRef.current,
 onFrame: (time: number) => {
 const segments = ropeSegments.current
 const mouse = mousePosition.current

 // Clamp delta so a resume after suspension doesn't snap the rope.
 const deltaSeconds =
 lastFrameTime === null ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 1 / 30)
 lastFrameTime = time

 if (!isInitialized || mouse.x === null) {
 return
 }

 updateLeadingSegment(segments, mouse.x, mouse.y as number, deltaSeconds)
 updateFollowingSegments(segments, deltaSeconds)

 if (pathRef.current) {
 pathRef.current.setAttribute('d', generateSmoothPath(segments))
 }
 },
 })

 window.addEventListener('mousemove', handleMouseMove)
 loop.start()

 return () => {
 window.removeEventListener('mousemove', handleMouseMove)
 loop.destroy()
 }
	}, [segmentCount, segmentLength, isMobile])

	if (isMobile) return null

	return (
 <>
 <svg
 ref={svgRef}
 className="w-full h-full absolute inset-0"
 style={{ opacity: isVisible ? 1 : 0 }}
 >
 <path
 ref={pathRef}
 fill="none"
 stroke={ropeColor}
 strokeWidth={ropeWidth}
 strokeLinecap="round"
 strokeLinejoin="round"
 opacity={ropeOpacity}
 />
 </svg>
 {prefersReducedMotion && (
 <div
   aria-live="polite"
   className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-white p-3 text-center max-md:hidden"
 >
   <h2 className="text-sm leading-none text-black">
     The rope keeps swinging.
   </h2>
   <p className="mt-2 text-xs leading-5 text-black">
     Rope Cursor is a live trail of your cursor&apos;s movement. The
     motion is the entire effect, so it can&apos;t be swapped for a
     reduced motion alternative.
   </p>
 </div>
 )}
 </>
	)
}