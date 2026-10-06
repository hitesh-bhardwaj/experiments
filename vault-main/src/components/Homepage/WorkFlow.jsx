'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { Eye, Download, Sliders, Rocket } from 'lucide-react'
import LazyVideo from '../WebsiteComps/LazyVideo'
import LineReveal from '../Animations/LineReveal'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

const STEPS = [
    {
        num: '01',
        title: 'Preview',
        text: 'Browse by the moment you need: a sharper scroll, a cursor with presence, a cleaner transition. See exactly what it does before it touches your project.',
        Icon: Eye,
    },
    {
        num: '02',
        title: 'Install',
        text: 'Use the Hyperiux CLI to add only the effect you need. Vault adds only the files that effect needs, not an entire animation framework. You can inspect and own the implementation.',
        Icon: Download,
    },
    {
        num: '03',
        title: 'Tune',
        text: 'Edit copy, layout, timing, easing, breakpoints, hover states, mobile fallbacks, and reduced-motion behavior to match your brand and product.',
        Icon: Sliders,
    },
    {
        num: '04',
        title: 'Ship',
        text: 'Deploy a website that feels sharper, more responsive, and more memorable, without rebuilding every interaction from scratch.',
        Icon: Rocket,
    },
]

/* ── Video sources  ── */
const VIDEO_SRC = 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/tutorial-new.mp4'

/* ── Shared animation config ── */
const ACTIVE_BG = '#ffffff'
const ACTIVE_COLOR = '#161616'
const INACTIVE_BG = '#161616'
const INACTIVE_COLOR = '#ffffff'
const EASE = 'power1.inOut'
const STEP_DURATION = 1.8
const HOLD_DURATION = 1.2

export default function Workflow() {
    const containerRef = useRef(null)
    const accordionRef = useRef(null)
    const videoRef = useRef(null)
    const videoSectionRef = useRef(null)

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia()

            mm.add(
                {
                    isMobile: '(max-width: 640px)',
                    isTablet: '(min-width: 641px) and (max-width: 1025px)',
                    isDesktop: '(min-width: 1025px)',
                    reduceMotion: '(prefers-reduced-motion: reduce)',
                },
                (context) => {
                    const { isMobile, isTablet, reduceMotion } = context.conditions

                    /* ── Responsive accordion heights (desktop values unchanged) ── */
                    const OPEN_HEIGHT = isMobile
                        ? '60vw'
                        : isTablet
                            ? '40vw'
                            : '16vw'
                    const CLOSED_HEIGHT = isMobile
                        ? '12vw'
                        : isTablet
                            ? '10vw'
                            : '5vw'

                    /* ── Query DOM groups (scoped by gsap.context) ── */
                    const numBoxes = gsap.utils.toArray('.wf-num-box')
                    const contentBoxes = gsap.utils.toArray('.wf-content-box')
                    const nums = gsap.utils.toArray('.wf-num')
                    const icons = gsap.utils.toArray('.wf-icon')
                    const texts = gsap.utils.toArray('.wf-text')
                    const lineFills = gsap.utils.toArray('.wf-line-fill')

                    /* ── Helper: set a step to its closed state ── */
                    const setInactive = (i) => {
                        gsap.set(contentBoxes[i], {
                            height: CLOSED_HEIGHT,
                            backgroundColor: INACTIVE_BG,
                            color: INACTIVE_COLOR,
                        })
                        gsap.set(numBoxes[i], {
                            backgroundColor: INACTIVE_BG,
                            color: INACTIVE_COLOR,
                        })
                        gsap.set(nums[i], { opacity: 1, scale: 1 })
                        gsap.set(icons[i], { opacity: 0, scale: 0.6 })
                        gsap.set(texts[i], { opacity: 0 })
                    }

                    /* ── Helper: set a step to its open state ── */
                    const setActive = (i) => {
                        gsap.set(contentBoxes[i], {
                            height: OPEN_HEIGHT,
                            backgroundColor: ACTIVE_BG,
                            color: ACTIVE_COLOR,
                        })
                        gsap.set(numBoxes[i], {
                            backgroundColor: ACTIVE_BG,
                            color: ACTIVE_COLOR,
                        })
                        gsap.set(nums[i], { opacity: 0, scale: 0.6 })
                        gsap.set(icons[i], { opacity: 1, scale: 1 })
                        gsap.set(texts[i], { opacity: 1 })
                    }

                    /* ── Initial state: first open, rest closed ── */
                    STEPS.forEach((_, i) =>
                        i === 0 ? setActive(i) : setInactive(i)
                    )
                    gsap.set(lineFills, {
                        scaleY: 0,
                        transformOrigin: 'top center',
                    })

                    /* ── Main scrub timeline ── */
                    const tl = gsap.timeline({
                        scrollTrigger: {
                            trigger: accordionRef.current,
                            start: 'top 30%',
                            end: 'bottom bottom',
                            // Instant scrub - lagged scrub (2) felt like a late-loading trigger
                            // and fought Lenis when layout above (storytelling) settled.
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    })

                    /* ── Radial glow (runs across the whole timeline) ── */
                    gsap.set('.radial-glow', {
                        opacity: 0.2,
                        scale: 0.5,
                        transformOrigin: 'bottom center',
                    })
                    tl.to(
                        '.radial-glow',
                        {
                            opacity: 1,
                            scale: 1,
                            ease: 'none',
                            duration:
                                STEPS.length * (STEP_DURATION + HOLD_DURATION),
                        },
                        0
                    )

                    /* ── Build the accordion sequence ── */
                    const SEGMENT = STEP_DURATION + HOLD_DURATION

                    STEPS.forEach((_, i) => {
                        const segmentStart = i * SEGMENT

                        if (i === 0) {
                            /* Step 0 is already open - just fill the first connecting line */
                            if (lineFills[0]) {
                                tl.to(
                                    lineFills[0],
                                    {
                                        scaleY: 1,
                                        ease: 'none',
                                        duration: HOLD_DURATION,
                                    },
                                    segmentStart + STEP_DURATION
                                )
                            }
                            tl.to({}, { duration: SEGMENT }, segmentStart)
                            return
                        }

                        const t = segmentStart

                        /* Close previous step - fade text out early to avoid squish glitch */
                        tl.to(
                            texts[i - 1],
                            {
                                opacity: 0,
                                duration: STEP_DURATION * 0.35,
                                ease: 'power2.in',
                            },
                            t
                        )
                        tl.to(
                            contentBoxes[i - 1],
                            {
                                height: CLOSED_HEIGHT,
                                backgroundColor: INACTIVE_BG,
                                color: INACTIVE_COLOR,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            numBoxes[i - 1],
                            {
                                backgroundColor: INACTIVE_BG,
                                color: INACTIVE_COLOR,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            nums[i - 1],
                            {
                                opacity: 1,
                                scale: 1,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            icons[i - 1],
                            {
                                opacity: 0,
                                scale: 0.6,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )

                        /* Open current step - expand first, then fade text in late */
                        tl.to(
                            contentBoxes[i],
                            {
                                height: OPEN_HEIGHT,
                                backgroundColor: ACTIVE_BG,
                                color: ACTIVE_COLOR,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            numBoxes[i],
                            {
                                backgroundColor: ACTIVE_BG,
                                color: ACTIVE_COLOR,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            nums[i],
                            {
                                opacity: 0,
                                scale: 0.6,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            icons[i],
                            {
                                opacity: 1,
                                scale: 1,
                                duration: STEP_DURATION,
                                ease: EASE,
                            },
                            t
                        )
                        tl.to(
                            texts[i],
                            {
                                opacity: 1,
                                duration: STEP_DURATION * 0.5,
                                ease: 'power2.out',
                            },
                            t + STEP_DURATION * 0.5
                        )

                        /* Hold & fill the connecting line to the next step */
                        if (lineFills[i]) {
                            tl.to(
                                lineFills[i],
                                {
                                    scaleY: 1,
                                    ease: 'none',
                                    duration: HOLD_DURATION,
                                },
                                t + STEP_DURATION
                            )
                        }
                    })

                    /* ── Video reveal ── */
                    if (!reduceMotion) {
                      
                    } else {
                        gsap.set(videoRef.current, {
                            clipPath: 'inset(0% 0% 0% 0%)',
                            backgroundColor: '#0A1B4B',
                        })
                    }
                }
            )
        }, container)

        return () => ctx.revert()
    }, [])

    return (
        <div ref={containerRef} className="text-white mt-[10vw] max-[1025px]:pt-[10vh] max-md:pt-[14vh] max-[1025px]:overflow-x-clip">
            {/* ── Accordion Section ── */}
            <section
                ref={accordionRef}
                id="Workflow"
                className="h-[200vh] max-md:mb-4 max-md:h-[300vh] relative"
            >
                <LineReveal as="h2" className="text110 max-[1025px]:hidden w-[80vw] mx-auto text-center">
                    Preview. Install. Tune. <span className='gradient-text-animate'>Ship.</span>
                </LineReveal>

                <div className="h-screen max-md:h-[85vh] max-[1025px]:h-[80vh]  w-full  sticky top-0 flex flex-col justify-center max-[1025px]:pt-0">
                    <LineReveal as="h2" className="text110 w-[80vw] mx-auto hidden max-[1025px]:block max-[1025px]:pt-[12vh] max-md:pt-[14vh] text-center">
                        Preview. Install. Tune. <span className='gradient-text-animate'>Ship.</span>
                    </LineReveal>
                    <div className="w-full h-full flex items-center justify-center flex-col relative z-10">
                        {/* Radial glow */}
                        {/* <div
                            className="radial-glow w-screen h-[50vw] absolute bottom-[-15vw] left-1/2 rounded-full -translate-x-1/2 pointer-events-none z-0"
                            style={{ background: 'radial-gradient(50% 50% at 50% 50%, #ff5f00 0%, transparent 100%)' }}
                        /> */}
                        <div
                            className="radial-glow  size-[75vw]  absolute bottom-0 left-1/2 rounded-full -translate-x-1/2 pointer-events-none z-0 bg-[#ff5f00] blur-[200px] max-md:size-[150vw] max-md:left-1/2 max-md:blur-[100px] max-md:bottom-[40%]"

                        ></div>

                        {/* Steps */}
                        <div className="h-full w-full flex-col gap-0 flex items-center justify-center relative pt-[5vw] max-[1025px]:pt-[15vw] max-md:pt-[25vw] z-100">
                            {STEPS.map((step, idx) => (
                                <div key={idx} className="flex items-stretch w-[52vw] max-md:w-[80vw] max-[1025px]:w-[80vw]">
                                    {/* Left column: number box + connecting line */}
                                    <div className="flex flex-col items-center w-[5vw] max-md:w-[10vw] max-[1025px]:w-[10vw] shrink-0">
                                        {/* Number / Icon box */}
                                        <div className="wf-num-box h-[5vw] w-[5vw] max-md:h-[12vw] max-md:w-[12vw] max-[1025px]:h-[10vw] max-[1025px]:w-[10vw] aspect-square flex items-center justify-center rounded-sm bg-dark-card relative overflow-hidden shrink-0">
                                            <div className="wf-num absolute inset-0 flex items-center justify-center">
                                                <p className="text34 pr-[.2vw] ">{step.num}</p>
                                            </div>
                                            <div className="wf-icon absolute inset-0 flex items-center justify-center">
                                                <step.Icon className="w-[2.5vw] h-[2.5vw] max-md:w-[5vw] max-md:h-[5vw] max-[1025px]:w-[4vw] max-[1025px]:h-[4vw]" />
                                            </div>
                                        </div>

                                        {/* Connecting line (not rendered after the last step) */}
                                        {idx < STEPS.length - 1 && (
                                            <div className="flex-1 w-0.75 bg-white/10 relative my-0">
                                                <div className="wf-line-fill absolute inset-0 bg-white/70" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Right column: content box */}
                                    <div className="flex flex-col ml-[1vw] max-[1025px]:ml-[2vw] max-md:ml-[4vw] flex-1 mb-[1.5vw] max-[1025px]:mb-[3vw] max-md:mb-[6vw]">
                                        <div className="wf-content-box h-[5vw] max-[1025px]:h-[10vw] max-md:h-[12vw] flex-col flex justify-between w-full text34 rounded-sm px-[2vw] py-[1.4vw] max-[1025px]:px-[3vw] max-[1025px]:py-[2.5vw] max-md:px-[4vw] max-md:py-[3.5vw] bg-dark-card overflow-hidden">
                                            <p className="leading-none mt-[.25vw] max-md:text-[5.5vw] font-heading font-medium">{step.title}</p>
                                            <div className="wf-text w-[85%] max-md:w-full overflow-hidden">
                                                <p className="text24 max-md:text-[4vw]! pt-[1.5vw] max-[1025px]:pt-[2vw] max-md:pt-[3vw] leading-[1.3]">{step.text}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Video Section ── */}
            <section ref={videoSectionRef} className="w-full flex items-center justify-center py-[10vw] max-md:py-[20vw] h-screen max-md:h-[100vw] max-[1025px]:h-[80vw]">
                <div ref={videoRef} className="w-screen h-auto max-[1025px]:p-0 max-[1025px]:h-full max-md:rounded-0 overflow-hidden bg-primary rounded-md">
                    <LazyVideo
                        src={VIDEO_SRC}
                        className="w-full h-full object-cover rounded-sm"
                    />
                </div>
            </section>
        </div>
    )
}
