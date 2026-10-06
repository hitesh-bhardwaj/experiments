'use client'

import { TransitionRouter } from 'next-transition-router'
import { usePathname } from 'next/navigation'
import React, { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'

gsap.registerPlugin(ScrollTrigger)

const SHRINK_SCALE = 0.82
const COMPACT_SHRINK_SCALE = 0.9


const LEAVE_SHRINK_DURATION = 0.6
const ENTER_CLIP_DURATION = 0.6
const ENTER_EXPAND_DURATION = 0.6

function isCompactViewport() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1025
}

function clipInset(offset: number, direction: 'top' | 'bottom') {
  return direction === 'top'
    ? `inset(0% 0% ${offset}vh 0%)`
    : `inset(${offset}vh 0% 0% 0%)`
}

interface ApertureTransitionProps {
  children: React.ReactNode

  scale?: number

  duration?: number

  revealDirection?: 'top' | 'bottom'

  bgColor?: string

  overlayClassName?: string

  frameClassName?: string

  onLeaveStart?: () => void
 
  onEnterComplete?: () => void
}

export default function ApertureTransition({
  children,
  scale = isCompactViewport() ? COMPACT_SHRINK_SCALE : SHRINK_SCALE,
  duration = LEAVE_SHRINK_DURATION,
  revealDirection = 'bottom',
  bgColor = '#0b0b0c',
  overlayClassName = '',
  frameClassName = '',
  onLeaveStart = () => {},
  onEnterComplete = () => {},
}: ApertureTransitionProps) {
  const HIDDEN_CLIP = clipInset(100, revealDirection)
  const durationScale = duration / LEAVE_SHRINK_DURATION

  const frameRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cloneRef = useRef<HTMLElement | null>(null)
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)

  useLayoutEffect(() => {
    if (prevPathnameRef.current === pathname) return
    prevPathnameRef.current = pathname
    if (prefersReducedMotion()) return

    if (wrapperRef.current) {
      wrapperRef.current.style.transform = 'translateY(0px)'
      wrapperRef.current.style.clipPath = HIDDEN_CLIP
    }
  }, [pathname, HIDDEN_CLIP])

  return (
    <TransitionRouter
      auto
      leave={(next) => {
        onLeaveStart()

        if (prefersReducedMotion()) {
          const tl = gsap.timeline({ onComplete: next })
          tl.to(wrapperRef.current, { opacity: 0, duration: 0.2, ease: 'power1.out' }, 0)
          return () => tl.kill()
        }

        const scrollY = window.scrollY || document.documentElement.scrollTop || 0
        document.body.style.overflow = 'hidden'

        frameRef.current!.style.position = 'fixed'
        frameRef.current!.style.inset = '0'
        frameRef.current!.style.overflow = 'hidden'

        wrapperRef.current!.style.position = 'fixed'
        wrapperRef.current!.style.top = '0'
        wrapperRef.current!.style.left = '0'
        wrapperRef.current!.style.width = '100%'
        wrapperRef.current!.style.transform = `translateY(-${scrollY}px)`

        const tl = gsap.timeline({
          onComplete: () => {
            const clone = wrapperRef.current!.cloneNode(true) as HTMLElement
            clone.style.pointerEvents = 'none'
            overlayRef.current!.appendChild(clone)
            cloneRef.current = clone

            next()
          },
        })

        tl.to(frameRef.current, {
          scale,
          duration: LEAVE_SHRINK_DURATION * durationScale,
          ease: 'power2.inOut',
        })

        return () => tl.kill()
      }}
      enter={(next) => {
        const tl = gsap.timeline({
          onComplete: () => {
            cloneRef.current?.remove()
            cloneRef.current = null

            document.body.style.overflow = ''
            if (frameRef.current) {
              frameRef.current.style.position = ''
              frameRef.current.style.inset = ''
              frameRef.current.style.overflow = ''
            }
            if (wrapperRef.current) {
              wrapperRef.current.style.position = ''
              wrapperRef.current.style.top = ''
              wrapperRef.current.style.left = ''
              wrapperRef.current.style.width = ''
              wrapperRef.current.style.transform = ''
            }

            ScrollTrigger.refresh()
            onEnterComplete()
            next()
          },
        })

        if (prefersReducedMotion()) {
          tl.to(wrapperRef.current, { opacity: 1, duration: 0.2, ease: 'power1.out', clearProps: 'all' }, 0)
          return () => tl.kill()
        }

        const state = { top: 100 }
        const applyClip = () => {
          if (wrapperRef.current) wrapperRef.current.style.clipPath = clipInset(state.top, revealDirection)
        }

        tl.to(state, {
          top: 0,
          duration: ENTER_CLIP_DURATION * durationScale ,
          ease: 'power4.inOut',
          delay:-0.2,
          onUpdate: applyClip,
          onComplete: () => {
            if (wrapperRef.current) wrapperRef.current.style.clipPath = ''
          },
        })

        tl.to(frameRef.current, {
          scale: 1,
          duration: ENTER_EXPAND_DURATION * durationScale,
          ease: 'power3.inOut',
          clearProps: 'transform',
         }, `-=${0.2 * durationScale}`)

        return () => tl.kill()
      }}
    >
      <div ref={frameRef} className={`relative w-full ${frameClassName}`} style={{ transformOrigin: '50% 50%', backgroundColor: bgColor }}>
        <div ref={overlayRef} className={`absolute inset-0 z-10 pointer-events-none ${overlayClassName}`} />

        <div ref={wrapperRef} className='relative z-20 w-full'>
          {children}
        </div>
      </div>
    </TransitionRouter>
  )
}
