// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { TransitionRouter } from 'next-transition-router'
import React, { useRef } from 'react'
import gsap from 'gsap'
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

const START_SCALE = 0.8
// Matches this project's `md` breakpoint (--breakpoint-md: 1025px in
// globals.css). The same 0.8 shrink reads as a much bigger margin on a
// phone/tablet's smaller viewport than on desktop, so compact screens get a
// closer-to-1 scale to keep the margin proportionally similar.
const COMPACT_START_SCALE = 0.9
const REVEAL_DURATION = 0.9
const SCALE_UP_DURATION = 0.5
const FADE_OUT_DURATION = 0.35
const HOLD_DELAY = 0.12

function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1025
}

function clipInset(top: number) {
  return `inset(${top}% 0% 0% 0%)`
}

const HIDDEN_CLIP = clipInset(100)

interface AscendTransitionProps {
  children: React.ReactNode
  bgColor?: string
  duration?: number
}

export default function AscendTransition({
  children,
  bgColor = '#ffffff',
  duration = REVEAL_DURATION,
}: AscendTransitionProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const durationScale = duration / REVEAL_DURATION

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        if (prefersReducedMotion()) {
          const tl = gsap.timeline({ onComplete: next })
          tl.to(panelRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }

        const tl = gsap.timeline({ onComplete: next })

        const startScale = isCompactViewport() ? COMPACT_START_SCALE : START_SCALE
        const state = { top: 100 }
        const applyClip = () => {
          if (panelRef.current) panelRef.current.style.clipPath = clipInset(state.top)
        }

        let scaleQueued = false

        tl.set(panelRef.current, { opacity: 1, scale: startScale })
        tl.set(state, { top: 100, onUpdate: applyClip })

        tl.to(state, {
          top: 0,
          duration,
          ease: 'power3.inOut',
          onUpdate: () => {
            applyClip()

            if (!scaleQueued && state.top <= 80) {
              scaleQueued = true

              tl.to(panelRef.current, {
                scale: 1,
                duration: SCALE_UP_DURATION * durationScale,
                ease: 'power2.inOut',
              }, tl.time())
            }
          },
        })

        return () => tl.kill()
      }}
      enter={(next) => {
        const tl = gsap.timeline({
          onComplete: () => {
            gsap.set(panelRef.current, { opacity: 0 })
            next()
          },
        })

        if (prefersReducedMotion()) {
          tl.to(panelRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }
        tl.to(panelRef.current, {
          opacity: 0,
          duration: FADE_OUT_DURATION * durationScale,
          delay: HOLD_DELAY * durationScale,
          ease: 'power1.out',
        })

        return () => tl.kill()
      }}
    >
      {children}
      <div
        ref={panelRef}
        aria-hidden
        className='fixed inset-0 z-50 pointer-events-none opacity-0'
        style={{ backgroundColor: bgColor, clipPath: HIDDEN_CLIP }}
      />
    </TransitionRouter>
  )
}
