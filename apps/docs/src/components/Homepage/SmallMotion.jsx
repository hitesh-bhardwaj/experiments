'use client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import SplitText from 'gsap/dist/SplitText'
import React, { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/motion'

gsap.registerPlugin(ScrollTrigger, SplitText)

export default function SmallMotion() {
    const sectionRef = useRef()
    const textRef = useRef()
    const textRef2 = useRef()

    useEffect(() => {
        const section = sectionRef.current
        if (!section) return

        let smallSplit, bigSplit, tl

        // ponytail: defer the SplitText calls until this below-fold section
        // nears the viewport instead of splitting on page mount.
        const mount = () => {
        const reduceMotion = prefersReducedMotion()

        smallSplit = SplitText.create(textRef.current, { type: 'chars', aria: 'none' })
        bigSplit = SplitText.create(textRef2.current, { type: 'chars', aria: 'none' })

        gsap.set([textRef.current, textRef2.current], { perspective: 1000 })

        if (!reduceMotion) {
            gsap.set(smallSplit.chars, { yPercent: 100, rotationX: -90, opacity: 0, transformOrigin: '50% 50% -50', filter: 'blur(10px)' })
            gsap.set(bigSplit.chars, { yPercent: 100, rotationX: -90, opacity: 0, transformOrigin: '50% 50% -50', filter: 'blur(10px)' })
        } else {
            gsap.set(smallSplit.chars, { opacity: 0 })
            gsap.set(bigSplit.chars, { opacity: 0 })
        }

        tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 20%',
                end: 'bottom bottom',
                scrub: true,
            },
        })

        if (!reduceMotion) {
            tl.to(smallSplit.chars, {
                yPercent: 0, rotationX: 0, opacity: 1, filter: 'blur(0px)',
                stagger: 0.04, ease: 'power2.out', duration: 1,
            })
            .to(smallSplit.chars, {
                yPercent: -100, rotationX: 90, opacity: 0, filter: 'blur(10px)',
                stagger: 0.04, ease: 'power2.in', duration: 1,
            })
            .to(bigSplit.chars, {
                yPercent: 0, rotationX: 0, opacity: 1, filter: 'blur(0px)',
                stagger: 0.04, ease: 'power2.out', duration: 1,
            }, "<0.5")
            .to(bigSplit.chars, {
                yPercent: -100, rotationX: 90, opacity: 0, filter: 'blur(10px)',
                stagger: 0.04, ease: 'power2.in', duration: 1,
            })
        } else {
            tl.to(smallSplit.chars, { opacity: 1, ease: 'power2.out', duration: 1 })
            .to(smallSplit.chars, { opacity: 0, ease: 'power2.in', duration: 1 })
            .to(bigSplit.chars, { opacity: 1, ease: 'power2.out', duration: 1 })
            .to(bigSplit.chars, { opacity: 0, ease: 'power2.in', duration: 1 })
        }

        }

        const io = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    io.disconnect()
                    mount()
                }
            },
            { rootMargin: "500px 0px" }
        )
        io.observe(section)

        return () => {
            io.disconnect()
            tl?.kill()
            smallSplit?.revert()
            bigSplit?.revert()
        }
    }, [])

    return (
        <section ref={sectionRef} className='h-[280vh] max-md:h-[200vh] mt-[-5vw] max-sm:h-[200vh] w-full relative'>
            <div className='h-screen w-full max-sm:w-[85vw] max-md:w-[85vw] max-md:mx-auto sticky top-0 flex items-center justify-center overflow-hidden'>
                <h2 ref={textRef} className='text-[15vw] max-md:text-[12vw] max-sm:text-[13vw] max-sm:font-medium! absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center font-black'>Small Motion.</h2>
                <h2 ref={textRef2} className='text-[17vw] w-full text-center absolute max-sm:text-[13vw] max-md:text-[12vw] max-sm:font-medium! left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 leading-none text-primary font-black'>Big Signal.</h2>
            </div>
        </section>
    )
}
