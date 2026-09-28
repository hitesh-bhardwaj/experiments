'use client'

import { useCallback, useEffect, useRef } from 'react'
import gsap from 'gsap'

import { prefersReducedMotion } from '@/lib/motion'
import {
    LOADER_COMPLETE_EVENT,
    HYPERIUX_LOADER_COMPLETE_EVENT,
} from './constants'
import {
    hasLoaderCompleted,
    isLoaderRunning,
    markLoaderCompleted,
} from './utils'

export function useNavbarLoader(navbarRef, pathname, setActiveItem) {
    const hidden = useRef(false)
    const hasRevealedRef = useRef(false)

    const showNavbar = useCallback((animate = false) => {
        const navbar = navbarRef.current

        if (!navbar) return

        hidden.current = false

        gsap.killTweensOf(navbar)

        if (animate) {
            const reduceMotion = prefersReducedMotion()

            // Reduced motion drops the slide but keeps a fade, so the navbar
            // still eases in rather than popping once the loader clears.
            if (reduceMotion) {
                gsap.set(navbar, {
                    y: 0,
                    yPercent: 0,
                })
            }

            gsap.to(navbar, {
                autoAlpha: 1,
                y: 0,
                yPercent: 0,
                duration: reduceMotion ? 0.3 : 0.45,
                ease: 'power2.out',
                overwrite: true,
                onComplete: () => {
                    gsap.set(navbar, {
                        clearProps: 'transform',
                    })
                },
            })

            return
        }

        gsap.set(navbar, {
            autoAlpha: 1,
            y: 0,
            yPercent: 0,
            clearProps: 'transform',
        })
    }, [navbarRef])

    const hideNavbarForLoader = useCallback(() => {
        const navbar = navbarRef.current

        if (!navbar) return

        hidden.current = true

        gsap.killTweensOf(navbar)

        gsap.set(navbar, {
            autoAlpha: 0,
            y: -18,
            yPercent: 0,
        })
    }, [navbarRef])

    const toggleNavbar = useCallback(
        (hide) => {
            const navbar = navbarRef.current

            if (!navbar || hidden.current === hide) return

            hidden.current = hide

            if (hide) {
                setActiveItem(null)
            }

            gsap.killTweensOf(navbar)

            gsap.to(navbar, {
                yPercent: hide ? -100 : 0,
                autoAlpha: 1,
                duration: 0.45,
                ease: 'power2.out',
                overwrite: true,
            })
        },
        [navbarRef, setActiveItem]
    )

    useEffect(() => {
        if (typeof window === 'undefined') return

        let pollId = null
        let revealFrame = null
        let fallbackTimer = null

        const revealNavbar = (animate = true) => {
            if (hasRevealedRef.current) return
            if (!navbarRef.current) return

            hasRevealedRef.current = true
            hidden.current = false

            showNavbar(animate)
        }

        const syncNavbarWithLoader = () => {
            if (!navbarRef.current) return

            const loaderRunning = isLoaderRunning()
            const loaderCompleted = hasLoaderCompleted()

            if (loaderRunning && !loaderCompleted) {
                hasRevealedRef.current = false
                hideNavbarForLoader()
                return
            }

            if (loaderCompleted || !loaderRunning) {
                revealNavbar(true)
            }
        }

        const handleLoaderComplete = () => {
            markLoaderCompleted()

            if (revealFrame) {
                window.cancelAnimationFrame(revealFrame)
            }

            revealFrame = window.requestAnimationFrame(() => {
                revealNavbar(true)
            })
        }

        syncNavbarWithLoader()

        pollId = window.setInterval(() => {
            syncNavbarWithLoader()

            if (hasRevealedRef.current && pollId) {
                window.clearInterval(pollId)
                pollId = null
            }
        }, 80)

        fallbackTimer = window.setTimeout(() => {
            if (!hasRevealedRef.current && !isLoaderRunning()) {
                revealNavbar(true)
            }
        }, 900)

        window.addEventListener(LOADER_COMPLETE_EVENT, handleLoaderComplete)
        window.addEventListener(
            HYPERIUX_LOADER_COMPLETE_EVENT,
            handleLoaderComplete
        )

        return () => {
            if (pollId) {
                window.clearInterval(pollId)
            }

            if (revealFrame) {
                window.cancelAnimationFrame(revealFrame)
            }

            if (fallbackTimer) {
                window.clearTimeout(fallbackTimer)
            }

            window.removeEventListener(
                LOADER_COMPLETE_EVENT,
                handleLoaderComplete
            )

            window.removeEventListener(
                HYPERIUX_LOADER_COMPLETE_EVENT,
                handleLoaderComplete
            )
        }
    }, [pathname, hideNavbarForLoader, showNavbar, navbarRef])

    return { hidden, hasRevealedRef, toggleNavbar }
}
