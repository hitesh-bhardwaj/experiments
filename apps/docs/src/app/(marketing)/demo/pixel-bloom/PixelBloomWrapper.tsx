"use client";
import React, { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import PixelBloom from "@/components/pixel-bloom";
gsap.registerPlugin(ScrollTrigger);

export default function PixelBloomWrapper({ pixelBloomProps = {} }) {
    useEffect(() => {
        if (window.matchMedia("(max-width: 1025px)").matches) return;
        const ctx = gsap.context(() => {
            const boxes = gsap.utils.toArray(".curved-scroll-box") as HTMLElement[];
            boxes.forEach((box, index) => {
                const isLeft = index % 2 === 0;
                const radius = window.innerWidth * 0.15;
                ScrollTrigger.create({
                    trigger: box,
                    start: "top bottom",
                    end: "bottom top",
                    onUpdate: (self) => {
                        const progress = self.progress;
                        const theta = progress * Math.PI;
                        const xOffset = Math.sin(theta) * radius;
                        const finalX = isLeft ? -xOffset : xOffset;
                        gsap.set(box, { x: finalX });
                    },
                });
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <>
        <section className="w-screen overflow-x-hidden bg-gray-400 max-[1025px]:h-auto max-[1025px]:flex-col max-[1025px]:p-0 h-[750vh] max-md:h-full flex items-center justify-center relative">

            <h1 className=" text-[8vw] max-[1025px]:text-[5vw] mix-blend-difference  text-white fixed max-[1025px]:static max-[1025px]:pt-24  top-1/2 left-1/2 -translate-x-1/2 max-[1025px]:translate-x-0 max-[1025px]:top-0 max-[1025px]:left-0 max-[1025px]:translate-y-0 w-full max-md:text-[11vw] text-center leading-[.5] -translate-y-1/2 max-[1025px]:text-white z-1">
                PIXEL BLOOM <br />
                <span className="text-[1.6vw] max-md:text-[3vw] max-[1025px]:hidden">Glide over the images to uncover the motion.</span>
            </h1>
            <p className="max-[1025px]:block hidden max-md:pt-10 max-[1025px]:text-[3vw]  max-md:text-[5vw] mix-blend-difference  text-white    w-full text-center leading-relaxed   z-1">
                Click on the images to see the effect 
                <br />
                <span className="uppercase">

                 it’s way more fun on desktop
                </span>
            </p>
            <div className="h-[20vh] max-md:h-[10vh] max-[1025px]:h-[8vh] w-full"></div>
            <div className="relative w-full flex flex-col  gap-[10vh]  items-center">
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] rounded-[2vw] max-md:rounded-lg overflow-clip mr-[25vw] max-[1025px]:mx-auto transform-gpu backface-hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='video' src='/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/showreel.mp4' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden ml-[25vw] max-[1025px]:mx-auto  rounded-[2vw] transform-gpu backface-hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='image' src='https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden mr-[25vw] max-[1025px]:mx-auto  rounded-[2vw] transform-gpu backface-hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='image' src='https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden ml-[25vw]  max-[1025px]:mx-auto rounded-[2vw] transform-gpu backface-hidden max-[1025px]:hidden max-md:hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden mr-[25vw]  max-[1025px]:mx-auto rounded-[2vw] transform-gpu backface-hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='image' src='https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden ml-[25vw]  max-[1025px]:mx-auto rounded-[2vw] transform-gpu backface-hidden">
                        <PixelBloom {...pixelBloomProps} className='w-full h-full' type='image' src='https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden mr-[25vw]  max-[1025px]:mx-auto rounded-[2vw] transform-gpu backface-hidden">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='image' src='https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg' />
                </div>
                <div className="curved-scroll-box size-[30vw] max-[1025px]:size-[70vw] overflow-hidden ml-[25vw]  max-[1025px]:mx-auto  rounded-[2vw] transform-gpu backface-hidden ">
                    <PixelBloom {...pixelBloomProps} className='w-full h-full' type='video' />
                </div>
            </div>
            <div className="h-[20vh] max-[1025px]:h-[10vh]  w-full"></div>
        </section>
         </>
    );
}
