"use client"
import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// True when the user has asked the OS to minimise animation. Safe to call
// during render - returns false on the server.
function prefersReducedMotion() {
    if (typeof window === "undefined") return false
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
}

const defaultItems = [
    "Websites, web apps, landing pages",
    "Animation and interaction design",
    "Figma to production code",
    "Core Web Vitals and load time optimization",
    "Webflow development",
    "React / Next.js / Vue / Nuxt development",
    "GSAP / Framer Motion animation",
    "Unlimited revisions",
    "Direct Slack communication",
    "Senior developers on every project",
]

interface SquareTranslateCompProps {
    items?: string[]
    textClassName?: string
    textColor?: string
    squareClassName?: string
    containerClassName?: string
    translateValue?: number
    borderColor?: string
    totalTranslateImpact?: number
    squareColor?: string
    maxRotation?: number
    transitionDuration?: number
}

export default function SquareTranslateComp({
    items = defaultItems,
    textClassName = 'text-[1vw]',
    textColor = 'text-black',
    squareClassName = 'w-[.6vw] h-[.6vw]',
    containerClassName = 'w-[50vw]',
    translateValue = 55,
    borderColor = 'border-black/10',
    totalTranslateImpact = 3,
    squareColor = '#FB450F',
    maxRotation = 360,
    transitionDuration = 0.4,
}: SquareTranslateCompProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const squareRef = useRef<HTMLDivElement | null>(null)
    const itemRefs = useRef<(HTMLUListElement | null)[]>([])
    const textRefs = useRef<(HTMLLIElement | null)[]>([])

    useEffect(() => {
        const container = containerRef.current as HTMLDivElement
        const square = squareRef.current as HTMLDivElement
        const itemEls = itemRefs.current.filter(Boolean)
        const textEls = textRefs.current.filter(Boolean)
        const reducedMotion = prefersReducedMotion()
        // Reduced motion: shift only the text (li), not the row (ul) that
        // carries the border - the divider line stays put.
        const targetEls = reducedMotion ? textEls : itemEls
        // Enable GPU acceleration
        gsap.set([square, ...itemEls, ...textEls], { willChange: 'transform', force3D: true })
        gsap.set(square, { scale: 0, y: 0, rotation: 0 })

        // Scale phase: 0-10% of scroll
        // Translate phase: 10-90% of scroll
        // Scale out phase: 90-100% of scroll
        const getScale = (p: number) => {
            if (p < 0.1) return p / 0.1 // Scale in from 0 to 1
            if (p > 0.9) return (1 - p) / 0.1 // Scale out from 1 to 0
            return 1 // Full scale during translate
        }
        const getTranslateProgress = (p: number) => {
            if (p < 0.1) return 0 // No translate during scale in
            if (p > 0.9) return 1 // Stay at end during scale out
            return (p - 0.1) / 0.8 // Translate during middle phase
        }
        const getRotation = (p: number) => {
            if (p < 0.1) return 0 // No rotation during scale in
            if (p > 0.9) return maxRotation // Full rotation at end
            return ((p - 0.1) / 0.8) * maxRotation // Rotate during translate
        }

        const trigger = ScrollTrigger.create({
            trigger: container,
            start: "top 50%",
            end: "bottom 50%",
            scrub: true,
            onUpdate: ({ progress }) => {
                const totalTravel = container.offsetHeight - square.offsetHeight
                const translateProgress = getTranslateProgress(progress)
                const currentIndex = translateProgress * (items.length - 1)

                gsap.to(square, {
                    rotation: getRotation(progress),
                    y: translateProgress * totalTravel,
                    scale: getScale(progress),
                    duration: transitionDuration,
                    ease: "power2.out",
                    overwrite: true,
                })

                targetEls.forEach((target, i) => {
                    // Reduced motion: only the item the cube is currently
                    // aligned with shifts - everything else stays at its
                    // initial position, no falloff ripple across neighbors.
                    // The shift also targets the text (li), not the row
                    // (ul) that carries the border, so the divider stays put.
                    const x = reducedMotion
                        ? (i === Math.round(currentIndex) ? translateValue : 0)
                        : translateValue * (1 - Math.min(Math.abs(i - currentIndex) / totalTranslateImpact, 1))
                    gsap.to(target, {
                        x, duration: transitionDuration, ease: "power2.out",
                        overwrite: true,
                    })
                })
            },
            onLeave: () => gsap.to(targetEls, { x: 0, duration: 0.6, ease: "power2.out", overwrite: true }),
            onLeaveBack: () => gsap.to(targetEls, { x: 0, duration: 0.6, ease: "power2.out", overwrite: true }),
        })

        return () => {
            trigger.kill()
            gsap.set([square, ...itemEls, ...textEls], { clearProps: 'willChange' })
        }
    }, [items, translateValue, totalTranslateImpact, maxRotation, transitionDuration])

    return (
        <div ref={containerRef} className={`${containerClassName} relative h-fit`}>
            <div ref={squareRef}
                style={{ backgroundColor: squareColor }}
                className={`${squareClassName} scale-0 absolute top-0 left-0 pointer-events-none z-10`} />
            {items.map((item, i) => (
                <ul key={i}
                    ref={el => { itemRefs.current[i] = el }}
                    className={`list-none py-[.8vw] max-md:py-[2vw] ${textColor} ${i > 0 ? `border-t ${borderColor}` : ''} ${i === items.length - 1 ? '' : ''}`}
                >
                    <li ref={el => { textRefs.current[i] = el }} className={textClassName}>{item}</li>
                </ul>
            ))}
        </div>
    )
}
