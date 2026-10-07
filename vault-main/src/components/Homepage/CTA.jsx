'use client'
import React, { Suspense, useEffect, useRef } from 'react'
import Button from '../WebsiteComps/Button'
import gsap from 'gsap'
import SplitLine from './SplitLine'
import { useWorkWithHyperiuxModal } from '../WebsiteComps/modals/WorkWithHyperiuxModal'
import LineReveal from '../Animations/LineReveal'

function CTAButtons() {
    const { open } = useWorkWithHyperiuxModal()
    return (
        <div className='w-fit flex max-lg:gap-[2vw] max-md:gap-[7vw] items-center max-md:flex-col max-lg:items-start max-lg:w-[75%] max-lg:mx-auto max-md:w-[88%] gap-[1.5vw]'>
            <Button variant='outline2'  className='max-lg:w-full border-white/40' text='See Our Work' href='https://www.hyperiux.com/hyperiux-creds-2026.pdf' target_blank />
            <Button variant='orange' className='max-lg:w-full' text='Work with Hyperiux' href='#' preventDefault onClick={open} />
        </div>
    )
}

export default function CTA() {
    const ctaRef = useRef(null)

    useEffect(() => {
        let mm = gsap.matchMedia();

        mm.add({
            isDesktop: "(min-width: 768px)",
            reduceMotion: "(prefers-reduced-motion: reduce)"
        }, (context) => {
            const { isDesktop, reduceMotion } = context.conditions;
            if (isDesktop) {
                gsap.to('.cta-line', {
                    opacity: 0,
                    duration: 1.2,
                    ease: 'sine.inOut',
                    stagger: {
                        each: 0.04,
                        repeat: reduceMotion ? 0 : -1,
                        yoyo: !reduceMotion
                    }
                })
            }
        }, ctaRef)

        return () => mm.revert()
    }, [])

    return (
        <section ref={ctaRef} id='CTA' className='h-fit gap-[7vw] max-lg:h-fit max-lg:py-[10vw] max-md:py-[15vw]! max-md:mb-[30vw] max-lg:mb-[10vw] overflow-x-hidden flex items-start justify-between max-md:gap-[24vw] max-lg:gap-[8vw] flex-col text-foreground self-padd relative z-500 w-full py-[7vw]!'>
            <LineReveal as="h2" className='text110 relative z-2 w-[90%]'>Need More Than a Component? We Build the Whole Interaction.</LineReveal>
            <div className='space-y-[3.5vw] max-lg:space-y-[10vw] relative z-2'>
                <SplitLine as="p" className='text24 max-lg:w-full w-[40vw]'>The Vault is a public slice of how Hyperiux thinks about interaction design - the same discipline behind premium websites, product experiences, and immersive digital systems. When a copy-paste effect isn&apos;t enough, we&apos;ll design and build the moment from scratch.</SplitLine>
                <Suspense fallback={
                    <div className='w-fit flex max-lg:gap-[2vw] max-md:gap-[7vw] items-center max-md:flex-col max-lg:items-start max-lg:w-[75%] max-lg:mx-auto max-md:w-[88%] gap-[1.5vw]'>
                        <Button variant='outline2' className='max-lg:w-full border-white/40' text='See Our Work' href='/hyperiux-creds-2026' />
                        <Button variant='orange' className='max-lg:w-full' text='Work with Hyperiux' href='#' />
                    </div>
                }>
                    <CTAButtons />
                </Suspense>
            </div>

            <div className='h-[15vw] max-lg:hidden z-0 w-[50vw] absolute bottom-0 right-0 pointer-events-none flex justify-between items-end'>
                {Array.from({ length: 75 }).map((_, i) => (
                    <div
                        key={i}
                        className='cta-line w-[1.5px] h-full bg-foreground'
                    />
                ))}
            </div>
        </section>
    )
}
