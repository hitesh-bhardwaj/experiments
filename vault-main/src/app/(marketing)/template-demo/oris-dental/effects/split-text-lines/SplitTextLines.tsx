'use client'

import React, { useLayoutEffect, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(SplitText, ScrollTrigger)
}

const useIsomorphicEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export interface SplitTextLinesProps {
    children?: React.ReactNode
    text?: string
    as?: React.ElementType
    className?: string
    delay?: number
    duration?: number
    stagger?: number
    start?: string
    yOffset?: string | number
    once?: boolean
    isReady?: boolean
    waitForLoader?: boolean
}

export default function SplitTextLines({
    children,
    text,
    as: Component = 'div',
    className = '',
    delay = 0,
    duration = 0.85,
    stagger = 0.08,
    start = 'top 90%',
    yOffset = '100%',
    once = true,
    isReady = true,
    waitForLoader = false,
}: SplitTextLinesProps) {
    const elRef = useRef<HTMLElement | null>(null)

    useIsomorphicEffect(() => {
        const el = elRef.current
        if (!el) return

        let split: SplitText | null = null
        let trigger: ScrollTrigger | null = null
        let hasAnimated = false

        const playAnimation = (lines: Element[]) => {
            if (hasAnimated) return
            hasAnimated = true
            gsap.to(lines, {
                y: '0%',
                duration: duration,
                stagger: stagger,
                delay: delay,
                ease: 'power3.out',
            })
        }

        // Wait for font load to ensure accurate line breaking
        const initSplit = () => {
            if (!el) return

            split = SplitText.create(el, {
                type: 'lines',
                linesClass: ' line-wrapper',
                mask: 'lines'
            })

            const lines = split.lines
            if (!lines || lines.length === 0) return

            gsap.set(lines, {
                y: yOffset,
            })

            if (waitForLoader || !isReady) {
                const handleLoaderFinished = () => {
                    playAnimation(lines)
                }

                if (!isReady) {
                    return
                }

                if (typeof window !== 'undefined' && (window as any).__orisLoaderFinished) {
                    playAnimation(lines)
                    return
                }

                window.addEventListener('oris-loader-finished', handleLoaderFinished, { once: true })
                return
            }

            trigger = ScrollTrigger.create({
                trigger: el,
                start: start,
                once: once,
                onEnter: () => {
                    playAnimation(lines)
                },
            })
        }

        if (document.fonts?.ready) {
            document.fonts.ready.then(initSplit)
        } else {
            initSplit()
        }

        return () => {
            trigger?.kill()
            split?.revert()
        }
    }, [delay, duration, stagger, start, yOffset, once, isReady, waitForLoader])

    const content = text !== undefined ? text : children

    // React.createElement instead of JSX here on purpose: with `Component`
    // typed as the generic React.ElementType, TSX's JSX checker infers an
    // overly-narrow overload once a `ref` is also passed - it ends up
    // typing `children` as `never` even though every concrete element
    // Component can resolve to (div, span, h1, p, ...) accepts children
    // fine at runtime. createElement isn't subject to that inference path.
    return React.createElement(Component, { ref: elRef, className }, content)
}
