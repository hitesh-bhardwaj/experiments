"use client"
import React from 'react'
import Image from 'next/image'
import SplitLine from '../WebsiteComps/SplitLine'
import { useFadeUp } from '../Animations/gsapAnimations'
import LineReveal from '../Animations/LineReveal'

const Hero = () => {
    useFadeUp()
    return (
        <section className="relative z-20 pointer-events-none self-padd h-screen flex max-md:items-end max-md:pb-[20vw]! items-center w-full">
            {/* <Image
        src="/landing-page/hero-bg.webp"
        alt="hero-background image"
        aria-hidden="true"
        fill
        sizes="100vw"
        className="pointer-events-none -z-10 hidden object-cover max-lg:block"
      /> */}
            <div
                className="space-y-[2vw] max-lg:space-y-[8vw] mt-[2vw] max-lg:mt-0 relative z-2 w-[75%] max-lg:w-full"
            >

                <div className="h-fit flex max-md:flex-col max-md:justify-start items-center w-full">
                    <LineReveal
                        as="h1"
                        className="t96 max-md:text-left max-md:indent-0! relative w-full text-white"
                    >
                        <span className='gradient-text-animate'>Start Free Today.</span> Upgrade to Pro for Complete Access.
                    </LineReveal>
                </div>
                <SplitLine
                    as="p"
                    start="top 120%"
                    className="text24 max-sm:text-left text-[#C9C9C9] w-[65%] max-sm:w-[95%] max-md:w-[80%]"
                >
                    Free Core is open today with 50+ source-first React and Next.js effects. Vault Pro is available now, unlocking 150+ premium effects across scroll systems, cursor effects, text reveals, page transitions, loaders, backgrounds, and WebGL scenes.
                </SplitLine>
            </div>
        </section>
    )
}

export default Hero