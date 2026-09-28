'use client'

import React, { useEffect, useRef, memo } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

interface DigitColumnProps {
    digit: number
    delay?: number
    duration?: number
    triggerRef: React.RefObject<HTMLElement | null>
}

const DigitColumn = memo(({ digit, delay = 0, duration = 1.6, triggerRef }: DigitColumnProps) => {
    const columnRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const col = columnRef.current
        const trigger = triggerRef.current || col
        if (!col || !trigger) return

        gsap.set(col, { y: '0%' })

        const st = ScrollTrigger.create({
            trigger: trigger,
            start: 'top 85%',
            once: true,
            onEnter: () => {
                gsap.to(col, {
                    y: `-${digit * 10}%`,
                    duration: duration,
                    delay: delay,
                    ease: 'power3.out',
                })
            },
        })

        return () => {
            st.kill()
        }
    }, [digit, delay, duration, triggerRef])

    return (
        <span className="inline-block h-[1em] overflow-hidden leading-none align-baseline">
            <span ref={columnRef} className="flex flex-col select-none">
                {DIGITS.map((d) => (
                    <span
                        key={d}
                        className="flex h-[1em] items-center justify-center leading-none"
                    >
                        {d}
                    </span>
                ))}
            </span>
        </span>
    )
})

DigitColumn.displayName = 'DigitColumn'

interface SlotCounterProps {
    value: string
    className?: string
    duration?: number
    stagger?: number
    baseDelay?: number
}

export default function SlotCounter({
    value,
    className = '',
    duration = 1.6,
    stagger = 0.1,
    baseDelay = 0,
}: SlotCounterProps) {
    const containerRef = useRef<HTMLSpanElement>(null)
    const chars = value.split('')
    let digitCount = 0

    return (
        <span ref={containerRef} className={`inline-flex items-baseline ${className}`}>
            {chars.map((char, i) => {
                if (/\d/.test(char)) {
                    const digit = parseInt(char, 10)
                    const delay = baseDelay + digitCount * stagger
                    digitCount++
                    return (
                        <DigitColumn
                            key={i}
                            digit={digit}
                            delay={delay}
                            duration={duration}
                            triggerRef={containerRef}
                        />
                    )
                }
                return (
                    <span key={i} className="inline-block leading-none">
                        {char}
                    </span>
                )
            })}
        </span>
    )
}
