"use client";
import gsap from "gsap";
import Image from "next/image";
import React, { useEffect, useRef } from "react";
import {
    MotionMark,
    NextMark,
    ReactMark,
    ThreeMark,
    WebGLMark,
} from "@/utils/Icons";
import MaskTextReveal from "@/components/mask-text-reveal";
import StatCard from "@/homepage-v3/components/StatCard";

const HeroFigure = ({ className }) => (
    <Image src="/icons/gsap-icon.svg" className={` ${className}`} width={100} height={100} alt="gsap image" />
);

export default function Techstack() {
    const paragraphText = useRef()
    useEffect(() => {
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#techstack",
                start: "top bottom",
                end: "bottom top",
                // markers:true,
                scrub: true
            }
        })
        tl.to(".strip-1", {
            yPercent: 15,
            ease: "none"
        })
        tl.to(".strip-2", {
            yPercent: -20,
            ease: "none"
        }, "<")
        tl.to(paragraphText.current, {
            yPercent: 20,
            ease: 'none',
        }, "<")
    }, [])
    return (
        <section className="relative z-10 w-full  px-[3.5vw] py-[12vw] text-white max-lg:px-[5vw] max-lg:pt-[25vw]! max-lg:pb-[14vw] max-md:px-[6vw] max-md:py-24 max-sm:px-[7vw] max-md:pt-[50vw]! max-sm:py-20" id="techstack">
            <div className="relative flex max-lg:flex-col max-lg:pr-0 max-lg:gap-[8vw] max-md:flex-col justify-between w-full h-fit pr-[4vw] max-sm:pr-0 max-md:gap-14 max-sm:gap-8">
                <div className="sticky h-fit top-[12vh] max-lg:static max-md:static">
                    <MaskTextReveal stagger={0.08} scrub={false} duration={2} >
                        <h2 ref={paragraphText} className="w-[40vw] text64 font-normal text-white max-lg:w-full max-md:max-w-[95vw] max-md:w-[85vw]  max-sm:max-w-full  ">
                            Give your product the perception lift of a custom interaction
                            system without commissioning one from scratch.
                        </h2>
                    </MaskTextReveal>
                </div>
                <div className="flex items-start max-lg:justify-center max-md:justify-center max-sm:items-start gap-0">
                    <div className="flex flex-col bg-background/30 z-2 relative max-sm:flex- w-[19vw] max-lg:w-[38%] max-md:w-[40%] max-sm:w-[50%] strip-1 translate-y-[5%]">
                        <StatCard
                            label="Effects"
                            className="min-h-[24vw] max-lg:min-h-[32vw] max-md:min-h-[42vw] max-sm:min-h-[56vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-lg:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                130
                            </span>
                        </StatCard>

                        <StatCard
                            label="Effects Monthly"
                            className="-mt-px min-h-[24vw] max-lg:min-h-[32vw] max-md:min-h-[40vw] max-sm:min-h-[54vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-lg:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                New
                            </span>
                        </StatCard>

                        <StatCard
                            framed
                            label="WebGL | Three.js"
                            className="-mt-px min-h-[24vw] max-lg:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-start justify-between gap-[1vw] pt-[1vw] max-lg:gap-[2vw] max-lg:pt-[2vw]"
                        >
                            <WebGLMark className={"size-[5vw] max-lg:size-[7vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <ThreeMark className={"size-[5vw] max-lg:size-[7vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                        </StatCard>
                    </div>
                    <div className="translate-y-[20%] max-lg:w-[38%] max-md:w-[40%] flex flex-col max-lg:mt-[6vw] max-md:mt-8  w-[19vw] strip-2  z-4 relative bg-background/30 translate-x-[-.3%] max-sm:w-[50%]">
                        <StatCard
                            label="Free"
                            className="min-h-[24vw] max-lg:min-h-[32vw] max-md:min-h-[42vw] max-sm:min-h-[56vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-lg:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                40
                            </span>
                        </StatCard>

                        <StatCard
                            framed
                            label="Motion | GSAP"
                            className="-mt-px min-h-[24vw] max-lg:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-center justify-between pt-[1vw] max-lg:pt-[2vw]"
                        >
                            <MotionMark className={"size-[4.5vw] max-lg:size-[6.5vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <HeroFigure className={"size-[4vw] max-lg:size-[6vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                        </StatCard>

                        <StatCard
                            framed
                            label="React | Next.js"
                            className="-mt-px min-h-[24vw] max-lg:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-center gap-[1vw] pt-[1vw] max-lg:justify-between max-lg:pt-[2vw] max-md:justify-between"
                        >
                            <ReactMark className={"size-[4vw] max-lg:size-[6vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <NextMark className={"size-[5.5vw] max-lg:size-[7.5vw] max-md:size-[9vw] max-sm:size-[11vw]"} />
                        </StatCard>
                    </div>
                </div>
            </div>
        </section>
    );
}
