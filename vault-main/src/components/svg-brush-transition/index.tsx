// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { TransitionRouter } from 'next-transition-router'
import React, { useEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

function hasDrawSVGPlugin(): boolean {
  return Boolean((gsap as any).plugins?.drawSVG)
}

function getPathLength(path: SVGPathElement | null): number {
  return path?.getTotalLength?.() ?? 0
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const next = Number(value)
  if (!Number.isFinite(next)) return fallback
  return Math.min(max, Math.max(min, next))
}

function setPathDrawState(path: SVGPathElement | null, drawSVGValue: string, strokeWidth: number) {
  if (!path) return

  if (hasDrawSVGPlugin()) {
    gsap.set(path, { drawSVG: drawSVGValue, strokeWidth } as any)
    return
  }

  const length = getPathLength(path)
  const isVisible = drawSVGValue === '100%'
  const isHiddenAtEnd = drawSVGValue === '100% 100%'

  gsap.set(path, {
    strokeDasharray: length,
    strokeDashoffset: isVisible ? 0 : isHiddenAtEnd ? -length : length,
    strokeWidth,
  })
}

function getPathDrawTween(path: SVGPathElement | null, drawSVGValue: string, strokeWidth: number, tweenProps: Record<string, any> = {}) {
  if (hasDrawSVGPlugin()) {
    return { drawSVG: drawSVGValue, strokeWidth, ...tweenProps }
  }

  const length = getPathLength(path)
  const isVisible = drawSVGValue === '100%'
  const isHiddenAtEnd = drawSVGValue === '100% 100%'

  return {
    strokeDashoffset: isVisible ? 0 : isHiddenAtEnd ? -length : length,
    strokeWidth,
    ...tweenProps,
  }
}

interface SVGBrushTransitionConfig {
  enableBlur?: boolean
  strokeColor?: string
  strokeWidth?: number
  duration?: number
  drawSVGPlugin?: any
}

interface SVGBrushTransitionProps {
  children?: ReactNode
  config?: SVGBrushTransitionConfig
  strokeColor?: string
  strokeWidth?: number
  duration?: number
}

export default function SVGBrushTransition({
  children,
  config = {
    enableBlur: false,
    strokeColor: '#82A0FF',
    strokeWidth: 2,
    duration: 1.5,
  },
  strokeWidth,
  strokeColor,
  duration,
}: SVGBrushTransitionProps) {
  const resolvedStrokeWidth = clampNumber(strokeWidth ?? config.strokeWidth, 1, 320, 2)
  const resolvedStrokeColor = strokeColor ?? config.strokeColor ?? '#82A0FF'
  const resolvedDuration = clampNumber(duration ?? config.duration, 0.25, 4, 1.5)
  const { enableBlur, drawSVGPlugin } = config
  const transitionOverlayRef = useRef<HTMLDivElement | null>(null)
  const svgPathDesktopRef = useRef<SVGPathElement | null>(null)
  const svgPathMobileRef = useRef<SVGPathElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const getActivePath = () => {
    if (typeof window === 'undefined') return null
    return window.innerWidth < 1025 ? svgPathMobileRef.current : svgPathDesktopRef.current
  }

  useEffect(() => {
    if (drawSVGPlugin) {
      gsap.registerPlugin(drawSVGPlugin)
    }

    const initPaths = () => {
      ;[svgPathDesktopRef.current, svgPathMobileRef.current].forEach((path) => {
        setPathDrawState(path, '0%', resolvedStrokeWidth)
      })
    }

    initPaths()
    gsap.config({ force3D: true })
  }, [drawSVGPlugin, resolvedStrokeWidth])

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        const activePath = getActivePath()
        const tl = gsap.timeline({ onComplete: next })

        if (prefersReducedMotion()) {
          tl.to(contentRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }

        tl.to(transitionOverlayRef.current, {
          opacity: 1,
          backdropFilter: enableBlur ? 'blur(10px)' : 'none',
          duration: 0.5,
          ease: 'power2.inOut',
        }).to(
          activePath,
          getPathDrawTween(activePath, '100%', 300, {
            duration: resolvedDuration,
            ease: 'power2.inOut',
          }),
          0
        )

        return () => tl.kill()
      }}
      enter={(next) => {
        const activePath = getActivePath()
        const tl = gsap.timeline({ onComplete: next })

        if (prefersReducedMotion()) {
          tl.to(contentRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out', clearProps: 'all' }, 0)
          return () => tl.kill()
        }

        tl.to(activePath, getPathDrawTween(activePath, '100% 100%', resolvedStrokeWidth, {
          duration: resolvedDuration,
          ease: 'power2.inOut',
        }), 0)
          .to(
            transitionOverlayRef.current,
            {
              opacity: 0,
              backdropFilter: enableBlur ? 'blur(10px)' : 'none',
              duration: 0.5,
              ease: 'power2.inOut',
            },
            1
          )
          .call(() => setPathDrawState(activePath, '0%', resolvedStrokeWidth))

        return () => tl.kill()
      }}
    >
      <div
        ref={transitionOverlayRef}
        className="fixed inset-0 pointer-events-none z-999 flex items-center justify-center opacity-0"
      >

        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1316 664"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full scale-130 h-full hidden md:block"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            ref={svgPathDesktopRef}
            d="M13.4746 291.27C13.4746 291.27 100.646 -18.6724 255.617 16.8418C410.588 52.356 61.0296 431.197 233.017 546.326C431.659 679.299 444.494 21.0125 652.73 100.784C860.967 180.556 468.663 430.709 617.216 546.326C765.769 661.944 819.097 48.2722 988.501 120.156C1174.21 198.957 809.424 543.841 988.501 636.726C1189.37 740.915 1301.67 149.213 1301.67 149.213"
            stroke={resolvedStrokeColor}
            strokeWidth={resolvedStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* ── Mobile SVG (< 768 px) - same wave rhythm, portrait viewBox ── */}
        {/*
          The path mirrors the desktop wave pattern (3 peaks, 2 valleys) but
          is re-drawn for a 390 × 844 viewport so it fills the screen edge-to-
          edge without any extra scaling class.
        */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 390 844"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full scale-120 block md:hidden"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            ref={svgPathMobileRef}
            d="M-10 370C-10 370 30 80 110 130C190 180 20 520 110 640C215 775 220 60 310 160C400 260 195 520 270 640C345 760 375 100 460 180C555 268 370 640 460 750C560 870 610 200 610 200"
            stroke={resolvedStrokeColor}
            strokeWidth={resolvedStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div ref={contentRef}>{children}</div>
    </TransitionRouter>
  )
}
