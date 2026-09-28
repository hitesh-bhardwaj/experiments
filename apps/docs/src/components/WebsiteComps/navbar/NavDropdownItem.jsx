'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { motion, useReducedMotion } from 'motion/react'

import { prefersReducedMotion } from '@/lib/motion'
import { DROPDOWN_TEXT_ANIM } from './constants'
import { useIsomorphicLayoutEffect } from './utils'

gsap.registerPlugin(SplitText)

export default function NavDropdownItem({ label, href, icon, hoverGroupRef }) {
    const reduceMotion = useReducedMotion()
    const [hovered, setHovered] = useState(false)

    const defaultLabelRef = useRef(null)
    const hoverLabelRef = useRef(null)

    const splitRef = useRef({
        default: null,
        hover: null,
    })

    const getChars = useCallback(() => {
        const { default: defaultSplit, hover: hoverSplit } = splitRef.current

        if (!defaultSplit?.chars?.length || !hoverSplit?.chars?.length) {
            return null
        }

        return {
            defaultChars: defaultSplit.chars,
            hoverChars: hoverSplit.chars,
            allChars: [...defaultSplit.chars, ...hoverSplit.chars],
        }
    }, [])

    // Reduced motion skips SplitText entirely, so there are no chars to drive:
    // the visible label is tinted in place and the hover copy stays hidden.
    const tintLabel = useCallback((color) => {
        const defaultEl = defaultLabelRef.current
        if (!defaultEl) return

        gsap.killTweensOf(defaultEl)

        gsap.to(defaultEl, {
            color,
            duration: DROPDOWN_TEXT_ANIM.duration,
            ease: DROPDOWN_TEXT_ANIM.ease,
            overwrite: true,
        })
    }, [])

    const setIdleText = useCallback(() => {
        if (prefersReducedMotion()) {
            const defaultEl = defaultLabelRef.current
            const hoverEl = hoverLabelRef.current

            if (!defaultEl || !hoverEl) return

            gsap.killTweensOf([defaultEl, hoverEl])

            gsap.set(defaultEl, { color: DROPDOWN_TEXT_ANIM.idleColor })
            gsap.set(hoverEl, { autoAlpha: 0 })

            return
        }

        const chars = getChars()
        if (!chars) return

        const { defaultChars, hoverChars, allChars } = chars

        gsap.killTweensOf(allChars)

        gsap.set(defaultChars, {
            yPercent: 0,
            autoAlpha: 1,
            color: DROPDOWN_TEXT_ANIM.idleColor,
            force3D: true,
        })

        gsap.set(hoverChars, {
            yPercent: 100,
            autoAlpha: 1,
            color: DROPDOWN_TEXT_ANIM.hoverColor,
            force3D: true,
        })
    }, [getChars])

    const playEnter = useCallback(() => {
        if (prefersReducedMotion()) {
            tintLabel(DROPDOWN_TEXT_ANIM.hoverColor)
            return
        }

        const chars = getChars()
        if (!chars) return

        const { defaultChars, hoverChars, allChars } = chars

        gsap.killTweensOf(allChars)

        gsap.to(defaultChars, {
            yPercent: -100,
            color: DROPDOWN_TEXT_ANIM.hoverColor,
            duration: DROPDOWN_TEXT_ANIM.duration,
            stagger: {
                each: DROPDOWN_TEXT_ANIM.stagger,
                from: 'start',
            },
            ease: DROPDOWN_TEXT_ANIM.ease,
            overwrite: true,
        })

        gsap.fromTo(
            hoverChars,
            {
                yPercent: 100,
                color: DROPDOWN_TEXT_ANIM.hoverColor,
            },
            {
                yPercent: 0,
                color: DROPDOWN_TEXT_ANIM.hoverColor,
                duration: DROPDOWN_TEXT_ANIM.duration,
                stagger: {
                    each: DROPDOWN_TEXT_ANIM.stagger,
                    from: 'start',
                },
                ease: DROPDOWN_TEXT_ANIM.ease,
                overwrite: true,
            }
        )
    }, [getChars, tintLabel])

    const playLeave = useCallback(() => {
        if (prefersReducedMotion()) {
            tintLabel(DROPDOWN_TEXT_ANIM.idleColor)
            return
        }

        const chars = getChars()
        if (!chars) return

        const { defaultChars, hoverChars, allChars } = chars

        gsap.killTweensOf(allChars)

        gsap.to(defaultChars, {
            yPercent: 0,
            color: DROPDOWN_TEXT_ANIM.idleColor,
            duration: DROPDOWN_TEXT_ANIM.leaveDuration,
            stagger: {
                each: DROPDOWN_TEXT_ANIM.leaveStagger,
                from: 'end',
            },
            ease: DROPDOWN_TEXT_ANIM.leaveEase,
            overwrite: true,
        })

        gsap.to(hoverChars, {
            yPercent: 100,
            color: DROPDOWN_TEXT_ANIM.hoverColor,
            duration: DROPDOWN_TEXT_ANIM.leaveDuration,
            stagger: {
                each: DROPDOWN_TEXT_ANIM.leaveStagger,
                from: 'end',
            },
            ease: DROPDOWN_TEXT_ANIM.leaveEase,
            overwrite: true,
        })
    }, [getChars, tintLabel])

    useIsomorphicLayoutEffect(() => {
        const defaultEl = defaultLabelRef.current
        const hoverEl = hoverLabelRef.current

        if (!defaultEl || !hoverEl) return

        if (prefersReducedMotion()) {
            setIdleText()
            return
        }

        let defaultSplit = null
        let hoverSplit = null
        let cancelled = false

        const initSplit = async () => {
            if (document.fonts?.ready) {
                try {
                    await document.fonts.ready
                } catch {}
            }

            if (
                cancelled ||
                !defaultLabelRef.current ||
                !hoverLabelRef.current
            ) {
                return
            }

            defaultSplit = SplitText.create(defaultLabelRef.current, {
                type: 'chars',
                mask: 'chars',
                charsClass: 'nav-dropdown-char',
                aria: 'none',
            })

            hoverSplit = SplitText.create(hoverLabelRef.current, {
                type: 'chars',
                mask: 'chars',
                charsClass: 'nav-dropdown-shadow-char',
                aria: 'none',
            })

            splitRef.current = {
                default: defaultSplit,
                hover: hoverSplit,
            }

            gsap.set([...defaultSplit.chars, ...hoverSplit.chars], {
                display: 'inline-block',
                willChange: 'transform',
                force3D: true,
            })

            setIdleText()
        }

        initSplit()

        return () => {
            cancelled = true

            gsap.killTweensOf([
                ...(defaultSplit?.chars || []),
                ...(hoverSplit?.chars || []),
            ])

            defaultSplit?.revert()
            hoverSplit?.revert()

            splitRef.current = {
                default: null,
                hover: null,
            }
        }
    }, [label, setIdleText])

    useEffect(() => {
        if (!hoverGroupRef) return

        const group = hoverGroupRef.current

        group.resetters.set(label, () => {
            setHovered(false)
            playLeave()
        })

        return () => {
            group.resetters.delete(label)

            if (group.activeKey === label) {
                group.activeKey = null
            }
        }
    }, [hoverGroupRef, label, playLeave])

    const handleTextEnter = useCallback(() => {
        if (hoverGroupRef) {
            const group = hoverGroupRef.current

            if (group.activeKey && group.activeKey !== label) {
                group.resetters.get(group.activeKey)?.()
            }

            group.activeKey = label
        }

        setHovered(true)
        playEnter()
    }, [hoverGroupRef, label, playEnter])

    const handleTextLeave = useCallback(
        (event) => {
            const related = event.relatedTarget

            const movingToSibling =
                related instanceof Element &&
                related.closest('[data-nav-dropdown-link]')

            setHovered(false)
            playLeave()

            if (!hoverGroupRef) return

            if (hoverGroupRef.current.activeKey === label) {
                hoverGroupRef.current.activeKey = null
            }

            if (movingToSibling) return
        },
        [hoverGroupRef, label, playLeave]
    )

    return (
        <Link
            href={href}
            data-nav-dropdown-link
            className="group relative isolate flex items-center gap-[0.75vw] rounded-[0.55vw] px-[0.7vw] py-[0.8vw]"
            onMouseEnter={handleTextEnter}
            onMouseLeave={handleTextLeave}
        >
            {hovered && (
                <motion.span
                    // Shared layoutId lets the pill slide down between items
                    // instead of fading in place on each one. Rendered without
                    // AnimatePresence on purpose: an exiting pill would keep a
                    // second element alive under the same layoutId during fast
                    // hover sweeps, making the pill flicker out and back.
                    layoutId={reduceMotion ? undefined : 'nav-dropdown-pill'}
                    className="absolute inset-0 z-0 rounded-[0.55vw] bg-black"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    transition={
                        reduceMotion
                            ? { duration: 0.2, ease: 'easeOut' }
                            : {
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 40,
                                  opacity: { duration: 0.2 },
                              }
                    }
                />
            )}

            <span className="relative z-10 flex size-[1.35vw] shrink-0 items-center justify-center">
                <Image
                    src={icon}
                    alt="icon"
                    width={35}
                    height={35}
                    aria-hidden="true"
                    className="size-full object-contain"
                />
            </span>

            <span className="relative z-10 block overflow-hidden text-[1.05vw] font-medium whitespace-nowrap leading-[1.15]">
                <span
                    ref={defaultLabelRef}
                    className="block"
                    aria-hidden="true"
                >
                    {label}
                </span>

                <span
                    ref={hoverLabelRef}
                    className="pointer-events-none absolute inset-0 block"
                    aria-hidden="true"
                >
                    {label}
                </span>

                <span className="sr-only">{label}</span>
            </span>
        </Link>
    )
}
