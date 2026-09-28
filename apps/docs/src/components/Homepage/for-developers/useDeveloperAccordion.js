'use client'

import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { SplitText } from 'gsap/dist/SplitText'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText)
}

export function useDeveloperAccordion(containerRef, accordionRef, headingRef) {
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let mm

        // ponytail: SplitText mutates the DOM for every card, then (on mobile/tablet)
        // immediately reads offsetHeight/getComputedStyle back off it - a forced-layout
        // reflow on mount. This section is below the fold, so defer setup until it
        // nears the viewport instead of paying that cost on every page load.
        const mount = () => {
        mm = gsap.matchMedia(containerRef)

        mm.add(
            {
                isMobile: '(max-width: 639px)',
                isTablet: '(min-width: 640px) and (max-width: 1024px)',
                isDesktop: '(min-width: 1025px)',
            },
            (context) => {
                const { isMobile, isTablet } = context.conditions
                const isStacked = isMobile || isTablet

                let splits = []
                const cards = gsap.utils.toArray('.dev-card')

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: accordionRef.current,
                        start: 'top top',
                        end: `${isMobile ? '100%' : '80%'} bottom`,
                        scrub: 0.5,
                    },
                })

                const cardData = cards.map((card) => {
                    const overlay = card.querySelector('.card-overlay')
                    const title = card.querySelector('.card-title')
                    const text = card.querySelector('.card-text')
                    const link = card.querySelector('.card-link')

                    const titleSplit = new SplitText(title, {
                        type: 'lines',
                        linesClass: 'overflow-hidden',
                        aria: 'none',
                    })
                    const titleLines = new SplitText(titleSplit.lines, {
                        type: 'lines',
                        aria: 'none',
                    })

                    let textSplit, textLines
                    if (text) {
                        textSplit = new SplitText(text, {
                            type: 'lines',
                            linesClass: 'overflow-hidden',
                            aria: 'none',
                        })
                        textLines = new SplitText(textSplit.lines, {
                            type: 'lines',
                            aria: 'none',
                        })
                        splits.push(textSplit, textLines)
                    }

                    splits.push(titleSplit, titleLines)

                    return { card, overlay, title, text, textLines, link }
                })

                // On mobile AND tablet the copy length varies per card, but the
                // open/closed heights MUST be uniform across all cards - otherwise the
                // total stack height changes as different cards open/close and the
                // whole column shifts (exactly like desktop, where every card is 22vw
                // open / 6vw closed so the total stays constant). Both breakpoints use
                // the full-width stacked layout, so measure every card and use the
                // tallest open height (fits the longest card without clipping) and the
                // tallest closed height (fits 2-line titles) for all of them.
                let stackedOpen = null
                let stackedClosed = null
                if (isStacked) {
                    const buffer = isMobile ? 1.15 : 1.2
                    const opens = cardData.map(({ card }) =>
                        Math.ceil(card.offsetHeight * buffer)
                    )
                    const closeds = cardData.map(({ card, title }) => {
                        const cs = getComputedStyle(card)
                        const padY =
                            parseFloat(cs.paddingTop) +
                            parseFloat(cs.paddingBottom)
                        return Math.ceil(title.offsetHeight + padY)
                    })
                    stackedOpen = Math.max(...opens)
                    stackedClosed = Math.max(...closeds)
                }

                const openH = () => (isStacked ? stackedOpen : '22vw')
                const closedH = () => (isStacked ? stackedClosed : '6vw')
                // The open title is enlarged with a transform scale, which on the
                // narrow stacked cards pushes long titles past the edge. Scale less on
                // mobile/tablet so it stays in bounds; desktop keeps its original 1.6.
                const openTitleScale = isMobile ? 1.2 : isTablet ? 1.1 : 1.6

                // Setup
                cardData.forEach((data, i) => {
                    const blobs = data.card.querySelectorAll('.blob')
                    gsap.set(
                        [data.title, data.text, data.link].filter(Boolean),
                        { opacity: 1 }
                    )
                    gsap.set(data.title, { transformOrigin: 'left top' })

                    // Base closed background
                    gsap.set(data.card, {
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    })

                    if (i === 0) {
                        gsap.set(data.card, { height: openH() })
                        gsap.set(data.overlay, { opacity: 1 }) // fully open
                        gsap.set(blobs, { scale: 5.5, opacity: 1 })
                        gsap.set(
                            [data.title, data.text, data.link].filter(Boolean),
                            { color: '#000000' }
                        )
                        gsap.set(data.title, {
                            y: '0vw',
                            scale: openTitleScale,
                        })
                        if (data.textLines)
                            gsap.set(data.textLines.lines, {
                                yPercent: 0,
                                opacity: 1,
                            })
                        if (data.link) gsap.set(data.link, { opacity: 1, y: 0 })
                    } else {
                        gsap.set(data.card, { height: closedH() })
                        gsap.set(data.overlay, { opacity: 0 }) // fully closed
                        gsap.set(blobs, { scale: 0, opacity: 0 })
                        gsap.set(
                            [data.title, data.text, data.link].filter(Boolean),
                            { color: '#ffffff' }
                        )
                        gsap.set(data.title, { y: '0vw', scale: 1 })
                        if (data.textLines)
                            gsap.set(data.textLines.lines, {
                                yPercent: 100,
                                opacity: 0,
                            })
                        if (data.link)
                            gsap.set(data.link, { opacity: 0, y: 20 })
                    }
                })

                for (let i = 0; i < cardData.length - 1; i++) {
                    const cur = cardData[i]
                    const nxt = cardData[i + 1]
                    const time = i
                    const curSolidFill = cur.card.querySelector('.solid-fill')
                    const nxtSolidFill = nxt.card.querySelector('.solid-fill')

                    // Close current
                    let curAnim = tl
                        .to(
                            cur.card,
                            { height: closedH(), duration: 1, ease: 'none' },
                            time
                        )
                        .to(
                            cur.overlay,
                            { opacity: 0, duration: 1, ease: 'none' },
                            time
                        )
                        .to(
                            cur.card.querySelectorAll('.blob'),
                            {
                                scale: 0,
                                opacity: 0,
                                duration: 0.8,
                                stagger: 0.05,
                                ease: 'power2.inOut',
                            },
                            time
                        )
                        .to(
                            cur.title,
                            { y: '0vw', scale: 1, duration: 1, ease: 'none' },
                            time
                        )
                        .to(
                            [cur.title, cur.text].filter(Boolean),
                            { color: '#ffffff', duration: 0.2 },
                            time + 0.2
                        )

                    if (curSolidFill) {
                        curAnim.to(
                            curSolidFill,
                            { opacity: 0, duration: 0.5, ease: 'none' },
                            time
                        )
                    }
                    if (cur.textLines) {
                        curAnim.to(
                            cur.textLines.lines,
                            {
                                yPercent: -50,
                                opacity: 0,
                                duration: 0.3,
                                stagger: 0.02,
                                ease: 'power2.in',
                            },
                            time
                        )
                    }
                    if (cur.link) {
                        curAnim.to(
                            cur.link,
                            {
                                opacity: 0,
                                y: -20,
                                duration: 0.2,
                                ease: 'power2.in',
                            },
                            time
                        )
                    }

                    // Open next
                    let nxtAnim = tl
                        .to(
                            nxt.card,
                            { height: openH(), duration: 1, ease: 'none' },
                            time
                        )
                        .to(
                            nxt.overlay,
                            { opacity: 1, duration: 0.2, ease: 'none' },
                            time
                        )
                        .to(
                            nxt.card.querySelectorAll('.blob'),
                            {
                                scale: 1.5,
                                opacity: 1,
                                duration: 1,
                                stagger: 0.1,
                                ease: 'power2.out',
                            },
                            time
                        )
                        .to(
                            nxt.title,
                            {
                                y: '0vw',
                                scale: openTitleScale,
                                duration: 1,
                                ease: 'none',
                            },
                            time
                        )
                        .to(
                            [nxt.title, nxt.text, nxt.link].filter(Boolean),
                            { color: '#000000', duration: 0.2 },
                            time + 0.2
                        )

                    if (nxtSolidFill) {
                        nxtAnim.to(
                            nxtSolidFill,
                            {
                                opacity: 1,
                                duration: 0.5,
                                ease: 'power2.inOut',
                            },
                            time + 0.5
                        )
                    }

                    if (nxt.textLines) {
                        nxtAnim.to(
                            nxt.textLines.lines,
                            {
                                yPercent: 0,
                                opacity: 1,
                                stagger: 0.02,
                                duration: 0.3,
                                ease: 'power2.out',
                            },
                            time + 0.3
                        )
                    }
                    if (nxt.link) {
                        nxtAnim.fromTo(
                            nxt.link,
                            { y: 20, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.3,
                                ease: 'power2.out',
                            },
                            time + 0.4
                        )
                    }
                }

                // Desktop only: the heading drifts as the cards open/close. On
                // mobile/tablet it sits directly above the stacked cards, so keep it
                // completely static (no translate) while cards open and close.
                if (!isStacked) {
                    tl.fromTo(
                        headingRef.current,
                        {
                            yPercent: 10,
                        },
                        {
                            yPercent: 90,
                            duration: 5,
                            ease: 'linear',
                        },
                        0
                    )
                }

                return () => {
                    splits.forEach((s) => s.revert())
                }
            }
        )
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    observer.disconnect()
                    mount()
                }
            },
            { rootMargin: "500px 0px" }
        )
        observer.observe(container)

        return () => {
            observer.disconnect()
            mm?.revert()
        }
    }, [accordionRef, containerRef, headingRef])
}
