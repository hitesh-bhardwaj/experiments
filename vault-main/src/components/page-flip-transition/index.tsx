// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { TransitionRouter } from 'next-transition-router'
import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

interface PageFlipTransitionProps {
  children?: ReactNode
  duration?: number
  bgColor?: string
  /** Color of the loading blocks shown during the flip. */
  loaderColor?: string
  /** Direction the page flips across the screen. */
  direction?: 'left-to-right' | 'right-to-left'
  config?: { strokeColor?: string; strokeWidth?: number; duration?: number }
}

export default function PageFlipTransition({
  children,
  duration = 0.9,
  bgColor = '#ff5f00',
  loaderColor = '#000000',
  direction = 'left-to-right',
}: PageFlipTransitionProps) {
  // left-to-right: exit pivots on the bottom-left corner, enter on the
  // bottom-right. right-to-left mirrors the corners and rotation signs.
  const ltr = direction !== 'right-to-left'
  const sign = ltr ? 1 : -1
  const exitOrigin = ltr ? 'bottom left' : 'bottom right'
  const enterOrigin = ltr ? 'bottom right' : 'bottom left'

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const exitOverlayRef = useRef<HTMLDivElement | null>(null)
  const enterOverlayRef = useRef<HTMLDivElement | null>(null)
  const boxesRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // EXIT overlay: hidden - folded off-screen to the left (-90deg from bottom-left)
    gsap.set(exitOverlayRef.current, {
      rotation: -90 * sign,
      transformOrigin: exitOrigin,
    })

    // ENTER overlay: hidden - folded off-screen (-90deg from bottom-right)
    gsap.set(enterOverlayRef.current, {
      rotation: -90 * sign,
      transformOrigin: enterOrigin,
    })

    // Boxes hidden initially
    gsap.set((boxesRef.current as HTMLDivElement).children, { scaleY: 0 })

    requestAnimationFrame(() => setMounted(true))
  }, [sign, exitOrigin, enterOrigin])

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        const tl = gsap.timeline({ onComplete: next })

        if (prefersReducedMotion()) {
          tl.set(exitOverlayRef.current, { rotation: -90 * sign, transformOrigin: exitOrigin }, 0)
          tl.set(enterOverlayRef.current, { rotation: -90 * sign, transformOrigin: enterOrigin }, 0)
          tl.set((boxesRef.current as HTMLDivElement).children, { scaleY: 0 }, 0)
          tl.to(wrapperRef.current, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }

        // Fade + shift old content out
        tl.to(wrapperRef.current, {
          opacity: 0,
          y: 0,
          duration: 0.5,
          ease: 'power2.in',
        }, 0)

        // Keep enter overlay hidden during exit
        tl.set(enterOverlayRef.current, { rotation: -90 * sign, transformOrigin: enterOrigin }, 0)

        // EXIT: bottom-left origin, -90deg → 0deg
        tl.fromTo(
          exitOverlayRef.current,
          { rotation: -90 * sign, transformOrigin: exitOrigin },
          { rotation: 0, transformOrigin: exitOrigin, duration, ease: 'power3.inOut' },
          0
        )

        // Boxes scale up from bottom once overlay is mostly covering screen
        tl.to((boxesRef.current as HTMLDivElement).children, {
          scaleY: 1,
          transformOrigin: 'bottom',
          duration: 0.4,
          stagger: 0.08,
          ease: 'power2.out',
        }, 0.5)

        return () => tl.kill()
      }}
      enter={(next) => {
        const tl = gsap.timeline({
          onComplete: () => {
            document.documentElement.style.overflow = ''
            next()
          },
        })

        if (prefersReducedMotion()) {
          tl.set(exitOverlayRef.current, { rotation: -90 * sign, transformOrigin: exitOrigin }, 0)
          tl.set(enterOverlayRef.current, { rotation: -90 * sign, transformOrigin: enterOrigin }, 0)
          tl.set((boxesRef.current as HTMLDivElement).children, { scaleY: 0 }, 0)
          tl.fromTo(wrapperRef.current,
            { opacity: 0 },
            { opacity: 1, duration: 0.25, ease: 'power1.out', clearProps: 'all' },
            0
          )
          return () => tl.kill()
        }

        // Snap exit overlay away
        tl.set(exitOverlayRef.current, { rotation: -90 * sign, transformOrigin: exitOrigin }, 0)

        // Snap enter overlay flat (covering screen)
        tl.set(enterOverlayRef.current, { rotation: 0, transformOrigin: enterOrigin }, 0)

        // Boxes scale down from top first
        tl.to((boxesRef.current as HTMLDivElement).children, {
          scaleY: 0,
          transformOrigin: 'top',
          duration: 0.35,
          stagger: 0.06,
          ease: 'power2.in',
        }, 0)

        // Fade new content in
        tl.fromTo(wrapperRef.current,
          { opacity: 0, y: 0 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', clearProps: "all" },
          0.45
        )

        // ENTER: bottom-right origin, 0deg → +90deg (clockwise)
        tl.fromTo(
          enterOverlayRef.current,
          { rotation: 0, transformOrigin: enterOrigin },
          { rotation: 90 * sign, transformOrigin: enterOrigin, duration, ease: 'power3.inOut' },
          0.3
        )

        return () => tl.kill()
      }}
    >
      {/* EXIT overlay - bottom-left anchor */}
      <div
        ref={exitOverlayRef}
        className={`fixed bottom-0 pointer-events-none ${ltr ? 'left-0' : 'right-0'}`}
        style={{
          width: '150vmax',
          height: '150vmax',
          transformOrigin: exitOrigin,
          zIndex: 9999,
          opacity: mounted ? 1 : 0,
          backgroundColor: bgColor,
          overflow: 'hidden',
        }}
      />

      {/* ENTER overlay - bottom-right anchor */}
      <div
        ref={enterOverlayRef}
        className={`fixed bottom-0 pointer-events-none ${ltr ? 'right-0' : 'left-0'}`}
        style={{
          width: '150vmax',
          height: '150vmax',
          transformOrigin: enterOrigin,
          zIndex: 9998,
          opacity: mounted ? 1 : 0,
          backgroundColor: bgColor,
          overflow: 'hidden',
        }}
      />

      {/* Boxes - fixed to screen center, above both overlays */}
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: 10000 }}
      >
        <div ref={boxesRef} className="flex gap-2">
          <span className="block w-4 h-7 scale-y-0" style={{ backgroundColor: loaderColor }} />
          <span className="block w-4 h-7 scale-y-0" style={{ backgroundColor: loaderColor }} />
          <span className="block w-4 h-7 scale-y-0" style={{ backgroundColor: loaderColor }} />
          <span className="block w-4 h-7 scale-y-0" style={{ backgroundColor: loaderColor }} />
        </div>
      </div>

      {/* Page content */}
      <div ref={wrapperRef} className="relative w-full min-h-screen" style={{ zIndex: 2 }}>
        {children}
      </div>
    </TransitionRouter>
  )
}
