'use client'

import Image, { StaticImageData } from 'next/image'
import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/dist/ScrollTrigger'
import SplitTextLines from './effects/split-text-lines/SplitTextLines'
import hc1 from './assets/hc1.webp'
import hc2 from './assets/hc2.webp'
import hc3 from './assets/hc3.webp'
import hc4 from './assets/hc4.webp'

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
}

interface GalleryImage {
    id: number
    src: StaticImageData | string
    alt: string
}

const GALLERY_IMAGES: GalleryImage[] = [
    { id: 1, src: hc1, alt: 'Dental consultation' },
    { id: 2, src: hc2, alt: 'Doctor reviewing treatment' },
    { id: 3, src: hc3, alt: 'Pediatric care' },
    { id: 4, src: hc4, alt: 'Patient care session' },
]

export default function PassionMeetPurpose() {
    const sectionRef = useRef<HTMLElement | null>(null)
    const runwayRef = useRef<HTMLDivElement | null>(null)
    const mobileGridRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (typeof window === 'undefined') return

        const ctx = gsap.context(() => {
            const mm = gsap.matchMedia(sectionRef)

            // Desktop sticky scrub animation
            mm.add('(min-width: 1025px)', () => {
                const runway = runwayRef.current
                if (!runway) return

                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: runway,
                        start: '-15% top',
                        end: '105% bottom',
                        scrub: true,
                        invalidateOnRefresh: true,
                    },
                })

                // Initial layout:
                // Cards 2 & 3 (center) sit below viewport.
                // Card 1 is tucked behind Card 2 (xPercent: 110), Card 4 is tucked behind Card 3 (xPercent: -110).
                gsap.set('.pmp-card-2, .pmp-card-3', {
                    y: () => window.innerHeight * 1.05,
                })
                gsap.set('.pmp-card-1', {
                    y: () => window.innerHeight * 1.05,
                    xPercent: 110,
                })
                gsap.set('.pmp-card-4', {
                    y: () => window.innerHeight * 1.05,
                    xPercent: -110,
                })

                // Phase 1 (0 -> 1.0): Center cards and tucked outer cards rise up together from bottom
                tl.to(
                    ['.pmp-card-2', '.pmp-card-3', '.pmp-card-1', '.pmp-card-4'],
                    {
                        y: 0,
                        ease: 'power1.out',
                        duration: 1,
                    },
                    0
                )

                // Phase 2 (0.6 -> 1.8): Card 1 slides left and Card 4 slides right smoothly
                tl.to(
                    '.pmp-card-1',
                    {
                        xPercent: 0,
                        ease: 'power2.inOut',
                        duration: 1.2,
                    },
                    0.6
                )

                tl.to(
                    '.pmp-card-4',
                    {
                        xPercent: 0,
                        ease: 'power2.inOut',
                        duration: 1.2,
                    },
                    0.6
                )

                // Phase 3 (1.8 -> 2.4): Hold beat before scrolling away
                tl.to({}, { duration: 0.6 })
            })

            // Tablet & Mobile layout entrance animation
            mm.add('(max-width: 1024px)', () => {
                if (!mobileGridRef.current) return
                const cards = mobileGridRef.current.querySelectorAll('.gallery-card')

                gsap.set(cards, { y: 50, opacity: 0 })

                gsap.to(cards, {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    stagger: 0.08,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: mobileGridRef.current,
                        start: 'top 80%',
                        once: true,
                    },
                })
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    return (
        <section
            id="passion-meet-purpose"
            ref={sectionRef}
            className="w-full bg-white relative z-10 text-oris-secondary"
        >
            {/* Desktop Sticky Scroll Runway */}
            <div
                ref={runwayRef}
                className="w-full h-[220vh] max-[1025px]:hidden relative"
            >
                <div className="sticky top-0 h-screen w-full flex flex-col justify-center items-center oris-paddx overflow-hidden">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mx-auto mb-[3.5vw]">
                        <SplitTextLines as="h2" className="text-[4.2vw] font-normal leading-[1.15]">
                            Passion Meet Purpose
                        </SplitTextLines>
                        <SplitTextLines as="p" className="oris-text22 text-oris-secondary/80 mt-[1.2vw] max-w-[38vw]" delay={0.15}>
                            Behind every treatment is a team united by one goal: creating better experiences for every patient.
                        </SplitTextLines>
                    </div>

                    {/* Desktop 4-Card Reveal Layer */}
                    <div className="flex items-center justify-center gap-[2.2vw] w-full max-w-[94vw] relative">
                        {/* Card 1: Outer Left (slides left from behind Card 2) */}
                        <div className="pmp-card pmp-card-1 relative w-[21.5vw] aspect-[3/4.2] rounded-[1.2vw] overflow-hidden z-10 will-change-transform shadow-lg">
                            <Image
                                src={GALLERY_IMAGES[0].src}
                                alt={GALLERY_IMAGES[0].alt}
                                fill
                                sizes="25vw"
                                className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                        {/* Card 2: Center Left (rises from bottom) */}
                        <div className="pmp-card pmp-card-2 relative w-[21.5vw] aspect-[3/4.2] rounded-[1.2vw] overflow-hidden z-20 will-change-transform shadow-2xl">
                            <Image
                                src={GALLERY_IMAGES[1].src}
                                alt={GALLERY_IMAGES[1].alt}
                                fill
                                sizes="25vw"
                                className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                        {/* Card 3: Center Right (rises from bottom) */}
                        <div className="pmp-card pmp-card-3 relative w-[21.5vw] aspect-[3/4.2] rounded-[1.2vw] overflow-hidden z-20 will-change-transform shadow-2xl">
                            <Image
                                src={GALLERY_IMAGES[2].src}
                                alt={GALLERY_IMAGES[2].alt}
                                fill
                                sizes="25vw"
                                className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                        {/* Card 4: Outer Right (slides right from behind Card 3) */}
                        <div className="pmp-card pmp-card-4 relative w-[21.5vw] aspect-[3/4.2] rounded-[1.2vw] overflow-hidden z-10 will-change-transform shadow-lg">
                            <Image
                                src={GALLERY_IMAGES[3].src}
                                alt={GALLERY_IMAGES[3].alt}
                                fill
                                sizes="25vw"
                                className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile & Tablet Fallback Section */}
            <div className="hidden max-[1025px]:flex max-[1025px]:flex-col max-[1025px]:items-center max-[1025px]:gap-10 oris-paddx py-20 max-md:py-14">
                {/* Header */}
                <div className="flex flex-col items-center text-center mx-auto">
                    <h2 className="text-[6vw] max-md:text-[7.5vw] font-normal leading-[1.15]">
                        Passion Meet Purpose
                    </h2>
                    <p className="oris-text22 text-oris-secondary/80 mt-3 max-w-xl">
                        Behind every treatment is a team united by one goal: creating better experiences for every patient.
                    </p>
                </div>

                {/* 2x2 Grid */}
                <div
                    ref={mobileGridRef}
                    className="grid grid-cols-2 gap-3 w-full max-w-2xl"
                >
                    {GALLERY_IMAGES.map((item) => (
                        <div
                            key={item.id}
                            className="gallery-card w-full aspect-[3/4.2] relative rounded-xl overflow-hidden will-change-transform"
                        >
                            <Image
                                src={item.src}
                                alt={item.alt}
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
