'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useLenis } from 'lenis/react'
import DotFillBtn from './effects/dot-fill-btn/DotFillBtn'

export default function Header() {
    const [hidden, setHidden] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const prevScrollRef = useRef(0)
    // The callback form of useLenis below only subscribes to scroll events;
    // this returns the instance itself, needed to drive scrollTo.
    const lenis = useLenis()

    useEffect(() => {
        const handleLoaderFinished = () => {
            setTimeout(() => {
                setLoaded(true)
            }, 300)
        }

        if (typeof window !== 'undefined' && (window as any).__orisLoaderFinished) {
            // Deferred a frame so this isn't a synchronous setState call
            // inside the effect body itself (which forces a cascading
            // extra render right after mount).
            const frameId = window.requestAnimationFrame(() => setLoaded(true))
            return () => window.cancelAnimationFrame(frameId)
        }

        window.addEventListener('oris-loader-finished', handleLoaderFinished, { once: true })
        return () => window.removeEventListener('oris-loader-finished', handleLoaderFinished)
    }, [])

    useLenis(({ scroll, velocity, direction }) => {
        if (!loaded) return

        // At the very top, always show navbar
        if (scroll <= 60) {
            setHidden(false)
            prevScrollRef.current = scroll
            return
        }

        // When scrolling down (direction === 1), hide navbar
        if (direction === 1 || velocity > 0.1) {
            setHidden(true)
        }
        // When scrolling up (direction === -1), reveal navbar
        else if (direction === -1 || velocity < -0.1) {
            setHidden(false)
        }

        prevScrollRef.current = scroll
    })

    const isVisible = loaded && !hidden

    return (
        <header
            className={`text-oris-primary max-[1025px]:py-[4vw] max-[1025px]:bg-white/20 max-[1025px]:backdrop-blur-xs max-[1025px]:border-b max-[1025px]:border-[#c4c4c4]/40 fixed top-0 left-0 z-100 flex items-center w-full justify-between oris-paddx py-[1.5vw] transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                isVisible ? 'translate-y-0' : '-translate-y-full'
            }`}
        >
            <p className="oris-text32 max-[1025px]:text-shadow-xs">OrisDental</p>

            <DotFillBtn
                btnText="Book Appointment"
                href="#oris-form"
                onClick={(event) => {
                    if (!lenis) return
                    event.preventDefault()
                    lenis.scrollTo('#oris-form')
                }}
                bgColor="#3365e2"
                textColor="#ffffff"
                hoverTextColor="#3365e2"
                dotColor="#ffffff"
                className="border border-[#3365e2]"
                textClassName="text-[1vw] max-md:text-sm max-[1025px]:text-xl font-medium"
            />
        </header>
    )
}
