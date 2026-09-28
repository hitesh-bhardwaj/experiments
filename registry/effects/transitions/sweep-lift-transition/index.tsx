// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { TransitionRouter } from 'next-transition-router'
import React, { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

gsap.registerPlugin(ScrollTrigger)

const DURATION = 1.3
const EASE = 'power4.inOut'
const HIDDEN_CLIP = 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)'
const VISIBLE_CLIP = 'polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)'

interface SweepLiftTransitionProps {
  children: React.ReactNode
  bgColor?: string
  duration?: number
}

export default function SweepLiftTransition({
  children,
  bgColor = '#111111',
  duration = DURATION,
}: SweepLiftTransitionProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLElement | null>(null)

  const releaseTransition = () => {
    document.body.style.overflow = ''

    if (wrapperRef.current) {
      wrapperRef.current.style.clipPath = ''
      wrapperRef.current.style.opacity = ''
      wrapperRef.current.style.transform = ''
    }

    cloneRef.current?.remove()
    cloneRef.current = null
    ScrollTrigger.refresh()
  }

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        if (prefersReducedMotion()) {
          const tl = gsap.timeline({ onComplete: next })
          tl.to(wrapperRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out' })
          return () => tl.kill()
        }

        document.body.style.overflow = 'hidden'

        const clone = wrapperRef.current!.cloneNode(true) as HTMLElement
        clone.style.position = 'absolute'
        clone.style.inset = '0'
        clone.style.pointerEvents = 'none'
        clone.style.overflow = 'hidden'
        clone.style.transformOrigin = '50% 50%'
        clone.style.zIndex = '1'
        clone.style.clipPath = ''
        overlayRef.current!.appendChild(clone)
        cloneRef.current = clone

        gsap.to(clone, {
          opacity: 0.2,
          y: 50,
          scale: 0.9,
          borderRadius: 20,
          duration,
          ease: EASE,
        })

        if (wrapperRef.current) {
          wrapperRef.current.style.clipPath = HIDDEN_CLIP
          wrapperRef.current.style.opacity = '1'
        }

        next()
      }}
      enter={(next) => {
        const tl = gsap.timeline({
          onComplete: () => {
            releaseTransition()
            next()
          },
        })

        if (prefersReducedMotion()) {
          tl.to(wrapperRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out', clearProps: 'opacity' })
          return () => tl.kill()
        }

        tl.fromTo(
          wrapperRef.current,
          { clipPath: HIDDEN_CLIP },
          {
            clipPath: VISIBLE_CLIP,
            duration,
            ease: EASE,
          }
        )

        return () => tl.kill()
      }}
    >
      <div ref={frameRef} className='fixed inset-0 h-screen w-screen overflow-hidden' style={{ backgroundColor: bgColor }}>
        <div ref={overlayRef} className='absolute inset-0 z-10 pointer-events-none overflow-hidden' />
        <div ref={wrapperRef} className='relative z-20 h-full w-full overflow-hidden will-change-[clip-path]'>
          {children}
        </div>
      </div>
    </TransitionRouter>
  )
}
