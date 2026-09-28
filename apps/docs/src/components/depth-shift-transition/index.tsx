'use client'


import { TransitionRouter } from 'next-transition-router'
import React, { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'

gsap.registerPlugin(ScrollTrigger)

gsap.ticker.lagSmoothing(0)


function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1025
}

const EXIT_DURATION = 0.65
const ENTER_DURATION = 0.4
const ENTER_DELAY = 0.35

interface DepthShiftTransitionProps {
  children: React.ReactNode
  bgColor?: string
  duration?: number
  exitOffsetX?: number
  exitOffsetY?: number
  exitRotate?: number
}

export default function DepthShiftTransition({
  children,
  bgColor = '#0b0b0c',
  duration = EXIT_DURATION,
  exitOffsetX = isCompactViewport() ? 8 : 20,
  exitOffsetY = isCompactViewport() ? 12 : 30,
  exitRotate = 3,
}: DepthShiftTransitionProps) {
  const durationScale = duration / EXIT_DURATION
  const wrapperRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLElement | null>(null)
  const isNavigatingRef = useRef(false)

  const setEnterStartState = () => {
    if (!wrapperRef.current || prefersReducedMotion()) return
    gsap.set(wrapperRef.current, {
      xPercent: isCompactViewport() ? -30 : -80,
      yPercent: 100,
      rotate: -3,
      scale: 0.85,
    })
  }

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        isNavigatingRef.current = true

        if (prefersReducedMotion()) {
          const tl = gsap.timeline({ onComplete: next })
          tl.to(wrapperRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }

        const clone = wrapperRef.current!.cloneNode(true) as HTMLElement
        clone.style.position = 'fixed'
        clone.style.inset = '0'
        clone.style.margin = '0'
        clone.style.pointerEvents = 'none'
        clone.style.transformOrigin = '50% 50%'
        overlayRef.current!.appendChild(clone)
        cloneRef.current = clone

     
        gsap.to(clone, {
          xPercent: exitOffsetX,
          yPercent: exitOffsetY,
          rotate: exitRotate,
          scale: 0.7,
          duration: EXIT_DURATION * durationScale,
          ease: 'power2.in',
        })


        next()
      }}
      enter={(next) => {
        if (isNavigatingRef.current) {
          setEnterStartState()
        }

        const tl = gsap.timeline({
          onComplete: () => {
            isNavigatingRef.current = false
            cloneRef.current?.remove()
            cloneRef.current = null
     
            ScrollTrigger.refresh()
            next()
          },
        })

        if (prefersReducedMotion()) {
          tl.to(wrapperRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out', clearProps: 'all' }, 0)
          return () => tl.kill()
        }

        tl.to(wrapperRef.current, {
          xPercent: 0,
          yPercent: 0,
          rotate: 0,
          scale: 1,
          duration: ENTER_DURATION * durationScale,
          delay: ENTER_DELAY * durationScale,
          ease: 'power2.out',
          clearProps: 'all',
        })

        return () => tl.kill()
      }}
    >
      <div className='fixed inset-0 h-screen w-screen overflow-hidden'>
        <div className='absolute inset-0 -z-10' style={{ backgroundColor: bgColor }} />
        <div ref={overlayRef} className='absolute inset-0 z-10 pointer-events-none' />

        <div
          ref={wrapperRef}
          className='relative z-20 h-full w-full'
          style={{ transformOrigin: '50% 50%' }}
        >
          {children}
        </div>
      </div>
    </TransitionRouter>
  )
}
