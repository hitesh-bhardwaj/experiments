'use client'

import React, { useEffect, useRef } from 'react'

interface Dot {
    bx: number
    by: number
    x: number
    y: number
    r: number
    alpha: number
    gradFactor: number
}

interface DotsCanvasProps {
    spacing?: number
    baseRadius?: number
    maxRadius?: number
    interactionRadius?: number
    baseOpacity?: number
    maxOpacity?: number
    lerpFactor?: number
    gradient?: boolean
    shape?: 'square' | 'circle'
    className?: string
}

export default function DotsCanvas({
    spacing = 28,
    baseRadius = 1.5,
    maxRadius = 3.8,
    interactionRadius = 160,
    baseOpacity = 0.3,
    maxOpacity = 0.95,
    lerpFactor = 0.32,
    gradient = true,
    shape = 'square',
    className = ''
}: DotsCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number = 0
        let width = 0
        let height = 0
        let dpr = 1
        let isLooping = false
        let isVisible = false
        let isTabActive = !document.hidden

        const mouse = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
            active: false
        }

        // Grid dots store current animated state
        let dots: Dot[] = []

        const initGrid = () => {
            const rect = canvas.getBoundingClientRect()
            width = rect.width
            height = rect.height
            if (width === 0 || height === 0) return

            dpr = Math.min(window.devicePixelRatio || 1, 2)
            canvas.width = Math.floor(width * dpr)
            canvas.height = Math.floor(height * dpr)
            ctx.resetTransform?.()
            ctx.scale(dpr, dpr)

            dots = []
            const cols = Math.ceil(width / spacing) + 1
            const rows = Math.ceil(height / spacing) + 1

            // Center the grid offset
            const offsetX = (width - (cols - 1) * spacing) / 2
            const offsetY = (height - (rows - 1) * spacing) / 2

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const bx = offsetX + i * spacing
                    const by = offsetY + j * spacing

                    // Top to bottom gradient factor (0 near top, 1 near bottom)
                    const gradFactor = gradient
                        ? Math.min(1, Math.max(0.05, Math.pow(by / Math.max(1, height), 1.1)))
                        : 1

                    dots.push({
                        bx, // Base X
                        by, // Base Y
                        x: bx,
                        y: by,
                        r: baseRadius,
                        alpha: baseOpacity * gradFactor,
                        gradFactor
                    })
                }
            }

            drawStaticFrame()
        }

        const drawStaticFrame = () => {
            if (!ctx || width === 0 || height === 0) return
            ctx.clearRect(0, 0, width, height)

            for (let i = 0; i < dots.length; i++) {
                const dot = dots[i]
                dot.x = dot.bx
                dot.y = dot.by
                dot.r = baseRadius
                dot.alpha = baseOpacity * dot.gradFactor

                if (dot.alpha > 0.005) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`
                    if (shape === 'square') {
                        const size = dot.r * 1.9
                        ctx.fillRect(dot.x - size / 2, dot.y - size / 2, size, size)
                    } else {
                        ctx.beginPath()
                        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
                        ctx.fill()
                    }
                }
            }
        }

        const startLoop = () => {
            if (isLooping || !isVisible || !isTabActive) return
            isLooping = true
            animationFrameId = requestAnimationFrame(render)
        }

        const stopLoop = () => {
            isLooping = false
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
                animationFrameId = 0
            }
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!isVisible) return
            const rect = canvas.getBoundingClientRect()
            if (
                e.clientX < rect.left - interactionRadius ||
                e.clientX > rect.right + interactionRadius ||
                e.clientY < rect.top - interactionRadius ||
                e.clientY > rect.bottom + interactionRadius
            ) {
                if (mouse.active) {
                    mouse.targetX = -1000
                    mouse.targetY = -1000
                    mouse.active = false
                    startLoop()
                }
                return
            }
            mouse.targetX = e.clientX - rect.left
            mouse.targetY = e.clientY - rect.top
            mouse.active = true
            startLoop()
        }

        const handleMouseLeave = () => {
            if (mouse.active) {
                mouse.targetX = -1000
                mouse.targetY = -1000
                mouse.active = false
                startLoop()
            }
        }

        const render = () => {
            if (!isVisible || !isTabActive) {
                isLooping = false
                return
            }

            // Direct / snappy mouse tracking with higher lerp speed
            mouse.x += (mouse.targetX - mouse.x) * lerpFactor
            mouse.y += (mouse.targetY - mouse.y) * lerpFactor

            ctx.clearRect(0, 0, width, height)

            let isAnyDotMoving = false

            for (let i = 0; i < dots.length; i++) {
                const dot = dots[i]

                const dx = mouse.x - dot.bx
                const dy = mouse.y - dot.by
                const dist = Math.hypot(dx, dy)

                let targetX = dot.bx
                let targetY = dot.by
                let targetR = baseRadius
                let targetAlpha = baseOpacity * (dot.gradFactor || 1)

                if (dist < interactionRadius) {
                    const factor = 1 - dist / interactionRadius
                    const easeFactor = factor * factor // Ease curve

                    // Slight repulsion force away from cursor
                    const angle = Math.atan2(dy, dx)
                    const push = easeFactor * 14
                    targetX = dot.bx - Math.cos(angle) * push
                    targetY = dot.by - Math.sin(angle) * push

                    // Scale & brighten dot under cursor with gradient weighting
                    targetR = baseRadius + (maxRadius - baseRadius) * easeFactor
                    const activeAlpha = baseOpacity + (maxOpacity - baseOpacity) * easeFactor
                    targetAlpha = activeAlpha * (gradient ? Math.max(0.35, dot.gradFactor) : 1)
                }

                // Snappy physics lerp
                const diffX = targetX - dot.x
                const diffY = targetY - dot.y
                const diffR = targetR - dot.r
                const diffAlpha = targetAlpha - dot.alpha

                dot.x += diffX * lerpFactor
                dot.y += diffY * lerpFactor
                dot.r += diffR * lerpFactor
                dot.alpha += diffAlpha * lerpFactor

                if (
                    Math.abs(diffX) > 0.02 ||
                    Math.abs(diffY) > 0.02 ||
                    Math.abs(diffR) > 0.01 ||
                    Math.abs(diffAlpha) > 0.003
                ) {
                    isAnyDotMoving = true
                }

                if (dot.alpha > 0.005) {
                    // Draw square dot
                    ctx.fillStyle = `rgba(255, 255, 255, ${dot.alpha})`
                    if (shape === 'square') {
                        const size = dot.r * 1.9
                        ctx.fillRect(dot.x - size / 2, dot.y - size / 2, size, size)
                    } else {
                        ctx.beginPath()
                        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
                        ctx.fill()
                    }
                }
            }

            // Idle detection: when mouse is inactive and dots have settled back to base
            if (!mouse.active && !isAnyDotMoving && Math.abs(mouse.x - mouse.targetX) < 1) {
                // Snap cleanly to static state and stop rAF loop
                drawStaticFrame()
                isLooping = false
                return
            }

            animationFrameId = requestAnimationFrame(render)
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        isVisible = true
                        initGrid()
                    } else {
                        isVisible = false
                        stopLoop()
                    }
                }
            },
            { threshold: 0.01 }
        )

        const handleVisibilityChange = () => {
            isTabActive = !document.hidden
            if (isTabActive && isVisible) {
                startLoop()
            } else {
                stopLoop()
            }
        }

        observer.observe(canvas)
        window.addEventListener('resize', initGrid)
        window.addEventListener('mousemove', handleMouseMove, { passive: true })
        document.addEventListener('mouseleave', handleMouseLeave)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            stopLoop()
            observer.disconnect()
            window.removeEventListener('resize', initGrid)
            window.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseleave', handleMouseLeave)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [spacing, baseRadius, maxRadius, interactionRadius, baseOpacity, maxOpacity, lerpFactor, gradient, shape])

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-none z-0 ${
                gradient
                    ? '[mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.25)_20%,rgba(0,0,0,0.8)_60%,rgba(0,0,0,1)_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.25)_20%,rgba(0,0,0,0.8)_60%,rgba(0,0,0,1)_100%)]'
                    : ''
            } ${className}`}
        />
    )
}
