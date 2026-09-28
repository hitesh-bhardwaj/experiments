'use client'

import { TransitionRouter } from'next-transition-router'
import { useEffect, useRef, type ReactNode } from'react'
import gsap from'gsap'
import { prefersReducedMotion } from '@/lib/motion'

const COLS = 30
const ROWS = 40
const COLOR ='#111111'
const DURATION_LEAVE = 1.0
const DURATION_ENTER = 0.8

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
 const next = Number(value)
 if (!Number.isFinite(next)) return fallback
 return Math.min(max, Math.max(min, next))
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

function drawGrid(canvas: HTMLCanvasElement | null, progress: number, isEnter: boolean, cols = COLS, rows = ROWS, fromTopLeft = false, pixelColor = COLOR) {
 if (!canvas) return

 const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
 const w = canvas.clientWidth
 const h = canvas.clientHeight

 // only mobile adjustments
 const isMobile = window.innerWidth < 640
 if (isMobile) {
  cols = 10
  rows = 50
 }

 const cellW = w / cols
 const cellH = h / rows
 const totalDiag = cols + rows

 ctx.clearRect(0, 0, w, h)
 ctx.fillStyle = pixelColor

 for (let c = 0; c < cols; c++) {
  for (let r = 0; r < rows; r++) {
   const rFlipped = rows - 1 - r
   const diag = fromTopLeft ? c + r : c + rFlipped

   const cellDelay = (diag / totalDiag) * 0.45
   const fast = (c + r) % 2 === 0
   const speed = fast ? 0.28 : 0.36

   let local = Math.max(0, Math.min(1, (progress - cellDelay) / speed))
   local = easeInOut(local)

   const fillAmount = isEnter ? 1 - local : local
   if (fillAmount <= 0.001) continue

   const x1 = Math.floor(c * cellW)

   // wider pixels only on mobile
   const x2 = Math.floor((c + 1) * cellW) + (isMobile ? 6 : 1)

   const y1 = Math.floor(r * cellH)
   const y2 = Math.floor((r + 1) * cellH) + 1

   const cellDrawH = y2 - y1
   const fillH = Math.ceil(cellDrawH * fillAmount)

   ctx.fillRect(
    x1,
    y2 - fillH,
    x2 - x1,
    fillH
   )
  }
 }
}

interface PixelTransitionProps {
  children?: ReactNode
  cols?: number
  rows?: number
  pixelColor?: string
  duration?: number
  enableContentShift?: boolean
}

export default function PixelTransition({
 children,
 cols = COLS,
 rows = ROWS,
 pixelColor = COLOR,
 duration = 1,
 enableContentShift = false,
}: PixelTransitionProps) {
 const wrapperRef = useRef<HTMLDivElement | null>(null)
 const canvasRef = useRef<HTMLCanvasElement | null>(null)
 const tweenRef = useRef<gsap.core.Tween | null>(null)
 const stateRef = useRef({ progress: 0 })
 const safeDuration = clampNumber(duration, 0.25, 3, 1)

 const resizeCanvas = () => {
 const canvas = canvasRef.current
 if (!canvas) return
 const dpr = Math.min(window.devicePixelRatio || 1, 2)
 const w = window.innerWidth
 const h = window.innerHeight
 canvas.width = Math.ceil(w * dpr)
 canvas.height = Math.ceil(h * dpr)
 canvas.style.width = `${w}px`
 canvas.style.height = `${h}px`
 const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
 ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
 }

 interface AnimateGridOptions {
   from: number
   to: number
   duration: number
   isEnter: boolean
   fromTopLeft?: boolean
   onComplete: () => void
 }

 const animateGrid = ({ from, to, duration, isEnter, fromTopLeft = false, onComplete }: AnimateGridOptions) => {
 const canvas = canvasRef.current
 if (!canvas) { onComplete(); return null }

 canvas.style.opacity ='1'
 stateRef.current.progress = from
 drawGrid(canvas, from, isEnter, cols, rows, fromTopLeft, pixelColor)

 tweenRef.current?.kill()
 const tween = gsap.to(stateRef.current, {
 progress: to,
 duration,
 ease:'none',
 onUpdate: () => drawGrid(canvas, stateRef.current.progress, isEnter, cols, rows, fromTopLeft, pixelColor),
 onComplete: () => {
 drawGrid(canvas, to, isEnter, cols, rows, fromTopLeft, pixelColor)
 if (isEnter) canvas.style.opacity ='0'
 onComplete()
 },
 })
 tweenRef.current = tween
 return tween
 }

 useEffect(() => {
 resizeCanvas()
 drawGrid(canvasRef.current, 0, false, cols, rows, false, pixelColor)
 window.addEventListener('resize', resizeCanvas)
 return () => {
 window.removeEventListener('resize', resizeCanvas)
 tweenRef.current?.kill()
 }
 }, [cols, rows, pixelColor])

 return (
 <TransitionRouter
 auto
 leave={(next) => {
 const timeline = gsap.timeline()

 if (prefersReducedMotion()) {
 timeline.to(wrapperRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out', onComplete: next })
 return () => timeline.kill()
 }

 if (enableContentShift) {
 timeline.fromTo(
 wrapperRef.current,
 { xPercent: 0, filter:'blur(0px)', opacity: 1 },
 { xPercent: 4, filter:'blur(2px)', opacity: 0.82, duration: DURATION_LEAVE * safeDuration, ease:'power2.inOut' },
 0
 )
 }

 const tween = animateGrid({
 from: 0,
 to: 1,
 duration: DURATION_LEAVE * safeDuration,
 isEnter: false,
 onComplete: next,
 })

 return () => { timeline.kill(); tween?.kill() }
 }}
 enter={(next) => {
 const timeline = gsap.timeline()

 if (prefersReducedMotion()) {
 timeline.to(wrapperRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out', clearProps: 'all', onComplete: next })
 return () => timeline.kill()
 }

 if (enableContentShift) {
 timeline.fromTo(
 wrapperRef.current,
 { xPercent: -3, filter:'blur(2px)', opacity: 0.86 },
 { xPercent: 0, filter:'blur(0px)', opacity: 1, duration: DURATION_ENTER * safeDuration, ease:'power2.out' },
 0
 )
 }

 const tween = animateGrid({
 from: 0,
 to: 1,
 duration: DURATION_ENTER * safeDuration,
 isEnter: true,
 fromTopLeft: true,
 onComplete: next,
 })

 return () => { timeline.kill(); tween?.kill() }
 }}
 >
 <canvas
 ref={canvasRef}
 className="pointer-events-none fixed top-0 left-0 z-999 h-screen w-screen opacity-0"
 />
 <div className="relative h-full w-full">
 <div ref={wrapperRef} className="h-full w-full will-change-transform">
 {children}
 </div>
 </div>
 </TransitionRouter>
 )
}
