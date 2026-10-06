'use client'

import React, { useEffect, useRef } from 'react'
import Image from 'next/image'
import gsap from 'gsap'

const DEFAULT_PATIENTS = [
    {
        name: 'Sarah Jenkins',
        src: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
    {
        name: 'David Chen',
        src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    {
        name: 'Elena Rostova',
        src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    },
    {
        name: 'Marcus Brody',
        src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    },
    {
        name: 'Chloe Bennett',
        src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
]

export default function PatientCard({
    title = "Join 5000+",
    subtitle = "Satisfied members",
    trustedText = "Trusted by 5,000+ happy patients",
    avatars = DEFAULT_PATIENTS,
    className = "",
    delay = 1.4,
    waitForLoader = true,
}: {
    title?: string
    subtitle?: string
    trustedText?: string
    avatars?: (string | { name: string; src: string })[]
    className?: string
    delay?: number
    waitForLoader?: boolean
}) {
    const cardRef = useRef<HTMLDivElement | null>(null)
    const avatarRefs = useRef<(HTMLDivElement | null)[]>([])

    useEffect(() => {
        const card = cardRef.current
        if (!card) return

        const validAvatars = avatarRefs.current.filter(Boolean)

        // Initial hidden state for entrance animation
        gsap.set(card, {
            autoAlpha: 0,
            y: 36,
            scale: 0.94,
        })
        if (validAvatars.length > 0) {
            gsap.set(validAvatars, {
                scale: 0,
                autoAlpha: 0,
            })
        }

        let animated = false
        const playEntrance = () => {
            if (animated) return
            animated = true

            // Card entrance animation
            gsap.to(card, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 1.1,
                delay: delay,
                ease: 'power3.out',
            })

            // Staggered pop-in for avatar bubbles
            if (validAvatars.length > 0) {
                gsap.to(validAvatars, {
                    scale: 1,
                    autoAlpha: 1,
                    duration: 0.6,
                    stagger: 0.08,
                    delay: delay + 0.25,
                    ease: 'back.out(1.8)',
                })
            }
        }

        if (!waitForLoader) {
            playEntrance()
            return
        }

        if (typeof window !== 'undefined' && (window as any).__orisLoaderFinished) {
            playEntrance()
            return
        }

        window.addEventListener('oris-loader-finished', playEntrance, { once: true })
        return () => window.removeEventListener('oris-loader-finished', playEntrance)
    }, [delay, waitForLoader])

    return (
        <div
            ref={cardRef}
            className={`w-[62%] max-[1025px]:w-full h-fit rounded-[2vw] bg-white p-[2vw] max-[1025px]:p-5 flex flex-col max-[1025px]:flex-row! justify-between border border-white/60 relative z-10 will-change-transform ${className}`}
        >
            {/* Top Text Content */}
            <div className='mb-[2vw] max-[1025px]:mb-3'>
                <h3 className="text-oris-secondary oris-text48 font-medium!  tracking-tight">
                    {title}
                </h3>
                <p className="text-oris-secondary oris-text22 font-normal mt-0.5">
                    {subtitle}
                </p>
            </div>

            {/* Bottom Content with Avatar Stack & Right Text */}
            <div className="flex items-center justify-between max-[1025px]:justify-end max-[1025px]:w-fit w-full">
                {/* Overlapping Avatar Stack */}
                <div className="flex items-center space-x-[-0.8vw] max-[1025px]:space-x-[-8px]">
                    {avatars.map((item, idx) => {
                        const name = typeof item === 'string' ? `Patient ${idx + 1}` : item.name
                        const src = typeof item === 'string' ? item : item.src

                        return (
                            <div
                                key={idx}
                                ref={(el) => {
                                    avatarRefs.current[idx] = el
                                }}
                                className="relative group/avatar z-10 hover:z-30 will-change-transform"
                            >
                                <Image
                                    src={src}
                                    alt={name}
                                    width={128}
                                    height={128}
                                    // avatars is a public prop accepting any
                                    // caller-supplied URL (not just the
                                    // Unsplash defaults) - Next's optimizer
                                    // needs every source domain allowlisted
                                    // in next.config ahead of time, which a
                                    // reusable effect component can't assume.
                                    unoptimized
                                    className="w-[3.2vw] h-[3.2vw] max-[1025px]:w-10 max-[1025px]:h-10 rounded-full object-cover border-[0.18vw] max-[1025px]:border-2 border-white shadow-sm select-none relative transition-all duration-300 ease-out group-hover/avatar:scale-115 group-hover/avatar:shadow-md cursor-pointer"
                                />

                                {/* Bottom Tooltip */}
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 -translate-y-1 group-hover/avatar:opacity-100 group-hover/avatar:translate-y-0 pointer-events-none transition-all duration-200 ease-out z-40 whitespace-nowrap bg-[#13314a] text-white text-[0.7vw] max-[1025px]:text-[11px] max-[1025px]:text-[10px] font-medium py-1 px-2.5 rounded-md shadow-lg shadow-black/20 flex flex-col items-center">
                                    {/* Tooltip arrow pointing up */}
                                    <div className="absolute top-[-.2vw] max-[1025px]:-top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#13314a] rotate-45" />
                                    <span>{name}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Right Text */}
                <div className=" max-[1025px]:hidden  text-black/30 text-[1.05vw] max-[1025px]:text-xs font-normal">
                   Trusted by 5,000+<br/> happy patients
                </div>
            </div>
        </div>
    )
}
