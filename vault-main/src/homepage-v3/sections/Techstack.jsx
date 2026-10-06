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
        <section className="relative z-10 w-full  px-[3.5vw] py-[12vw] text-white max-[1025px]:px-[5vw] max-[1025px]:pt-[25vw]! max-[1025px]:pb-[14vw] max-md:px-[6vw] max-md:py-24 max-sm:px-[7vw] max-md:pt-[50vw]! max-sm:py-20" id="techstack">
            <div className="relative flex max-[1025px]:flex-col max-[1025px]:pr-0 max-[1025px]:gap-[8vw] max-md:flex-col justify-between w-full h-fit pr-[4vw] max-sm:pr-0 max-md:gap-14 max-sm:gap-8">
                <div className="sticky h-fit top-[12vh] max-[1025px]:static max-md:static">
                    <MaskTextReveal stagger={0.08} scrub={false} duration={2} >
                        <h2 ref={paragraphText} className="w-[40vw] text64 font-normal text-white max-[1025px]:w-full max-md:max-w-[95vw] max-md:w-[85vw]  max-sm:max-w-full  ">
                            Give your product the perception lift of a custom interaction
                            system without commissioning one from scratch.
                        </h2>
                    </MaskTextReveal>
                </div>
                <div className="flex items-start max-[1025px]:justify-center max-md:justify-center max-sm:items-start gap-0">
                    <div className="flex flex-col bg-background/30 z-2 relative max-sm:flex- w-[19vw] max-[1025px]:w-[38%] max-md:w-[40%] max-sm:w-[50%] strip-1 translate-y-[5%]">
                        <StatCard
                            label="Effects"
                            className="min-h-[24vw] max-[1025px]:min-h-[32vw] max-md:min-h-[42vw] max-sm:min-h-[56vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-[1025px]:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                130
                            </span>
                        </StatCard>

                        <StatCard
                            label="Effects Monthly"
                            className="-mt-px min-h-[24vw] max-[1025px]:min-h-[32vw] max-md:min-h-[40vw] max-sm:min-h-[54vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-[1025px]:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                New
                            </span>
                        </StatCard>

                        <StatCard
                            framed
                            label="WebGL | Three.js"
                            className="-mt-px min-h-[24vw] max-[1025px]:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-start justify-between gap-[1vw] pt-[1vw] max-[1025px]:gap-[2vw] max-[1025px]:pt-[2vw]"
                        >
                            <WebGLMark className={"size-[5vw] max-[1025px]:size-[7vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <ThreeMark className={"size-[5vw] max-[1025px]:size-[7vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                        </StatCard>
                    </div>
                    <div className="translate-y-[20%] max-[1025px]:w-[38%] max-md:w-[40%] flex flex-col max-[1025px]:mt-[6vw] max-md:mt-8  w-[19vw] strip-2  z-4 relative bg-background/30 translate-x-[-.3%] max-sm:w-[50%]">
                        <StatCard
                            label="Free"
                            className="min-h-[24vw] max-[1025px]:min-h-[32vw] max-md:min-h-[42vw] max-sm:min-h-[56vw]"
                            contentClassName="flex h-full items-start"
                        >
                            <span className="text140 font-normal font-heading leading-none text-primary max-[1025px]:text-[10vw] max-md:text-[12vw] max-sm:text-[16vw]!">
                                40
                            </span>
                        </StatCard>

                        <StatCard
                            framed
                            label="Motion | GSAP"
                            className="-mt-px min-h-[24vw] max-[1025px]:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-center justify-between pt-[1vw] max-[1025px]:pt-[2vw]"
                        >
                            <MotionMark className={"size-[4.5vw] max-[1025px]:size-[6.5vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <HeroFigure className={"size-[4vw] max-[1025px]:size-[6vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                        </StatCard>

                        <StatCard
                            framed
                            label="React | Next.js"
                            className="-mt-px min-h-[24vw] max-[1025px]:min-h-[30vw] max-md:min-h-[36vw] max-sm:min-h-[52vw]"
                            contentClassName="flex h-full items-center gap-[1vw] pt-[1vw] max-[1025px]:justify-between max-[1025px]:pt-[2vw] max-md:justify-between"
                        >
                            <ReactMark className={"size-[4vw] max-[1025px]:size-[6vw] max-md:size-[8vw] max-sm:size-[11vw]"} />
                            <NextMark className={"size-[5.5vw] max-[1025px]:size-[7.5vw] max-md:size-[9vw] max-sm:size-[11vw]"} />
                        </StatCard>
                    </div>
                </div>
            </div>
        </section>
    );
}
