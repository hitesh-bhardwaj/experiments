import React from 'react'
import Button from '../WebsiteComps/Button';
import RandomBlur from './RandomBlur';
import ShimmerText from '../WebsiteComps/ShimmerText';
import { UnlockIcon } from 'lucide-react';

export default function CTA2({
    animations = true,
    href = "/sign-up",
    isHomePage = false,
    isHomepage = false,
}) {
    // const shouldOffsetPricingScroll = isHomePage || isHomepage;

    return (
        <div className=" z-100 h-fit py-[5vw] pt-[12vw]  overflow-hidden flex items-end justify-end relative max-lg:min-h-0 max-md:py-[15vw] max-md:px-[7vw]">
            <div className="w-full max-lg:space-y-[6vw] max-md:space-y-[8vw] h-fit relative z-2">
                {
                    animations ? (
                        <RandomBlur
                            as="h2"
                            className="text110 pointer-events-auto max-md:w-full max-md:px-0! w-[70%] mx-auto text-center"
                        >
                            Build The Interaction Layer Your Website Is Missing.
                        </RandomBlur>
                    ) : (
                        <h2
                            className="text110 pointer-events-auto max-md:w-full max-md:px-0! w-[70%] mx-auto text-center"
                        >
                            Build The Interaction Layer Your Website Is Missing.
                        </h2>
                    )
                }

                <p className="text-center text24 py-[2vw]">Start with Free Core today. Upgrade to Pro for Complete Access.
                </p>

                <div className="flex max-md:flex-col items-center max-md:gap-[4vw] pb-[2vw] mb-[4.5vw] max-lg:mb-[15vw] relative max-md:mb-[10vw] justify-center gap-[2vw] fadeup">
                    <Button variant='outline2' text="Browse the Effects" href="/effects" className='max-md:w-[88%]' />
                    <Button text="Upgrade to Pro" className="max-md:w-[88%]" href={href} variant="orange" />
                    <p
                        className="shimmer-text w-full flex justify-center items-center gap-[0.5vw] text-[#939393] leading-none max-lg:justify-center max-lg:gap-2 absolute max-md:bottom-[-12vw] max-lg:bottom-[-5vw] bottom-[-.8vw] left-1/2 -translate-x-1/2"
                    >
                        <span className="inline-block size-[0.9vw] shrink-0 text-[#d2d2d2] max-lg:size-3">
                            <UnlockIcon className="h-full w-full" />
                        </span>
                        <ShimmerText baseColor="#d2d2d2" shimmerColor="#ffffff" className="max-md:text-sm max-md:leading-[1.2]">
                            150+ effects · 32 free · 83 Pro · React + Next.js · CLI install · Source-first code
                        </ShimmerText>
                    </p>
                </div>

            </div>
            <div
                className='radial-glow w-screen max-md:left-1/2 max-md:w- h-[50vw] max-lg:h-[60vh] max-md:h-[60vh] max-lg:w-[150vw] max-md:w-[170vw] absolute bottom-[-15vw] max-md:bottom-[-20vw] left-1/2 rounded-full -translate-x-1/2 pointer-events-none z-0'
                style={{ background: 'radial-gradient(50% 50% at 50% 50%, #ff5f00 0%, transparent 100%)' }}
            ></div>
        </div>
    )
}
