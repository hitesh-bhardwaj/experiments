'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

import { prefersReducedMotion } from '@/lib/motion'
import { MENU_ANIM, REDUCED_MENU_ANIM } from './constants'
import { getPaneHeight, useIsomorphicLayoutEffect } from './utils'
import { PANELS } from './NavDropdownPanels'

export default function NavDropdown({ panel }) {
    const shellRef = useRef(null)
    const viewportRef = useRef(null)
    const currentPaneRef = useRef(null)
    const nextPaneRef = useRef(null)
    const tlRef = useRef(null)
    const hoverGroupRef = useRef({ activeKey: null, resetters: new Map() })

    const [currentPanel, setCurrentPanel] = useState(null)
    const [nextPanel, setNextPanel] = useState(null)

    const animRef = useRef({
        isOpen: false,
        hasOpenedOnce: false,
        isAnimating: false,
        direction: 1,
        queued: null,
        current: null,
        pending: null,
    })

    const killTweens = () => {
        tlRef.current?.kill()
        tlRef.current = null

        gsap.killTweensOf([
            shellRef.current,
            viewportRef.current,
            currentPaneRef.current,
            nextPaneRef.current,
        ])

        // Stop the per-link open stagger if a close/switch interrupts it.
        ;[currentPaneRef.current, nextPaneRef.current].forEach((pane) => {
            if (!pane) return
            gsap.killTweensOf(
                pane.querySelectorAll('[data-nav-dropdown-link]')
            )
        })
    }

    const reset = () => {
        hoverGroupRef.current.resetters.forEach((resetItem) => resetItem())
        hoverGroupRef.current.activeKey = null

        animRef.current = {
            isOpen: false,
            hasOpenedOnce: false,
            isAnimating: false,
            direction: 1,
            queued: null,
            current: null,
            pending: null,
        }

        setCurrentPanel(null)
        setNextPanel(null)
    }

    const closeMenu = () => {
        const anim = animRef.current
        if (!anim.isOpen) return

        anim.isOpen = false
        anim.current = null
        anim.pending = null

        if (!shellRef.current) {
            reset()
            return
        }

        killTweens()

        const { openY } = prefersReducedMotion()
            ? REDUCED_MENU_ANIM
            : MENU_ANIM

        gsap.to(shellRef.current, {
            opacity: 0,
            y: openY,
            duration: MENU_ANIM.fadeDuration,
            ease: 'power2.out',
            onComplete: () => {
                if (animRef.current.isOpen) return
                reset()
            },
        })
    }

    const openAt = (target) => {
        killTweens()

        const wasOpen = animRef.current.isOpen

        animRef.current.isOpen = true
        animRef.current.current = target
        animRef.current.pending = null
        animRef.current.isAnimating = false
        animRef.current.queued = null
        animRef.current.direction = 1

        if (!wasOpen) {
            animRef.current.hasOpenedOnce = false
        }

        setCurrentPanel(target)
        setNextPanel(null)
    }

    const requestSwitch = (target) => {
        const anim = animRef.current

        if (!target) {
            closeMenu()
            return
        }

        if (!anim.isOpen || anim.current === null) {
            openAt(target)
            return
        }

        if (target === anim.current && anim.pending === null) return
        if (target === anim.pending) return

        const base = anim.queued ?? anim.pending ?? anim.current
        const dir = PANELS[target].index > PANELS[base].index ? 1 : -1

        if (anim.isAnimating) {
            anim.queued = target
            anim.direction = dir
            return
        }

        anim.direction = dir
        anim.pending = target

        setNextPanel(target)
    }

    useIsomorphicLayoutEffect(() => {
        requestSwitch(panel)
    }, [panel])

    useIsomorphicLayoutEffect(() => {
        if (
            !animRef.current.isOpen ||
            !currentPanel ||
            !viewportRef.current ||
            !currentPaneRef.current
        ) {
            return
        }

        killTweens()

        const contentHeight = getPaneHeight(currentPaneRef.current)
        const anim = animRef.current

        if (shellRef.current) {
            gsap.set(shellRef.current, {
                width: PANELS[currentPanel].width,
            })
        }

        if (!anim.hasOpenedOnce) {
            const {
                openY,
                openDuration,
                openEase,
                itemY,
                itemDuration,
                itemStagger,
                itemDelay,
                itemEase,
            } = prefersReducedMotion() ? REDUCED_MENU_ANIM : MENU_ANIM

            gsap.set(viewportRef.current, {
                height: contentHeight,
            })

            gsap.set(shellRef.current, {
                opacity: 0,
                y: openY,
            })

            gsap.to(shellRef.current, {
                opacity: 1,
                y: 0,
                duration: openDuration,
                ease: openEase,
                onComplete: () => {
                    animRef.current.hasOpenedOnce = true
                },
            })

            const links = currentPaneRef.current.querySelectorAll(
                '[data-nav-dropdown-link]'
            )

            if (links.length) {
                gsap.fromTo(
                    links,
                    {
                        opacity: 0,
                        y: itemY,
                    },
                    {
                        opacity: 1,
                        y: 0,
                        duration: itemDuration,
                        ease: itemEase,
                        stagger: itemStagger,
                        delay: itemDelay,
                        clearProps: 'opacity,transform',
                    }
                )
            }

            return
        }

        gsap.set(viewportRef.current, {
            height: contentHeight,
        })
    }, [currentPanel])

    useIsomorphicLayoutEffect(() => {
        if (
            !currentPanel ||
            !currentPaneRef.current ||
            !viewportRef.current ||
            nextPanel !== null
        ) {
            return
        }

        gsap.set(viewportRef.current, {
            height: getPaneHeight(currentPaneRef.current),
        })
    }, [currentPanel, nextPanel])

    useIsomorphicLayoutEffect(() => {
        if (
            nextPanel === null ||
            !currentPaneRef.current ||
            !nextPaneRef.current ||
            !viewportRef.current
        ) {
            return
        }

        const currentEl = currentPaneRef.current
        const nextEl = nextPaneRef.current
        const targetPanel = nextPanel
        const dir = animRef.current.direction

        const {
            distance,
            duration,
            ease,
            fade,
            heightDuration,
            heightEase,
            widthDuration,
            widthEase,
        } = prefersReducedMotion() ? REDUCED_MENU_ANIM : MENU_ANIM

        animRef.current.isAnimating = true

        killTweens()

        gsap.set(currentEl, {
            position: 'absolute',
            inset: 0,
            x: 0,
            opacity: 1,
            zIndex: 1,
            pointerEvents: 'none',
        })

        gsap.set(nextEl, {
            position: 'absolute',
            inset: 0,
            x: dir > 0 ? distance : -distance,
            opacity: fade ? 0 : 1,
            zIndex: 2,
            pointerEvents: 'auto',
        })

        gsap.set(viewportRef.current, {
            height: getPaneHeight(currentEl),
        })

        tlRef.current = gsap.timeline({
            onComplete: () => {
                animRef.current.isOpen = true
                animRef.current.current = targetPanel
                animRef.current.pending = null
                animRef.current.isAnimating = false

                setCurrentPanel(targetPanel)
                setNextPanel(null)

                const queued = animRef.current.queued
                animRef.current.queued = null

                if (queued && queued !== targetPanel) {
                    requestSwitch(queued)
                }
            },
        })

        tlRef.current
            .to(
                viewportRef.current,
                {
                    height: getPaneHeight(nextEl),
                    duration: heightDuration,
                    ease: heightEase,
                },
                0
            )
            .to(
                shellRef.current,
                {
                    width: PANELS[targetPanel].width,
                    duration: widthDuration,
                    ease: widthEase,
                },
                0
            )
            .to(
                currentEl,
                {
                    x: dir > 0 ? -distance : distance,
                    opacity: fade ? 0 : 1,
                    duration,
                    ease,
                },
                0
            )
            .to(
                nextEl,
                {
                    x: 0,
                    opacity: 1,
                    duration,
                    ease,
                },
                0
            )
    }, [nextPanel])

    useEffect(() => {
        return () => {
            killTweens()
        }
    }, [])

    if (!currentPanel) return null

    const Panel = currentPanel ? PANELS[currentPanel].Panel : null
    const NextPanel = nextPanel ? PANELS[nextPanel].Panel : null

    return (
        <div className="absolute top-full left-1/2 z-50 w-max -translate-x-1/2 pt-[0.75vw]">
            <div
                ref={shellRef}
                className="overflow-hidden rounded-[1.1vw] border border-white/8 bg-grey p-[1vw] shadow-[0_1.2vw_3.5vw_rgba(0,0,0,0.55)]"
                style={{
                    width: currentPanel
                        ? PANELS[currentPanel].width
                        : PANELS.categories.width,
                }}
            >
                <div ref={viewportRef} className="relative">
                    {Panel && (
                        <div
                            key={`current-${currentPanel}`}
                            ref={currentPaneRef}
                            className="relative w-full"
                        >
                            <Panel hoverGroupRef={hoverGroupRef} />
                        </div>
                    )}

                    {NextPanel && (
                        <div
                            key={`next-${nextPanel}`}
                            ref={nextPaneRef}
                            className="absolute top-0 left-0 w-full"
                        >
                            <NextPanel hoverGroupRef={hoverGroupRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
