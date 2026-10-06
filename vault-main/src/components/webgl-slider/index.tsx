'use client'
import React, { useEffect, useState } from 'react'
import WebGLSliderComp, { type WebGLSliderImage } from './WebGLSliderComp';

const P = "/api/media-proxy?url=";
const B = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images";

const images: WebGLSliderImage[] = [
    { src: `${P}${B}/h-06.jpg`, text: "PR.00\n /10" },
    { src: `${P}${B}/h-09.jpg`, text: "PR.01\n /10" },
    { src: `${P}${B}/h-10.jpg`, text: "PR.02\n /10" },
    { src: `${P}${B}/h-11.jpg`, text: "PR.03\n /10" },
    { src: `${P}${B}/h-08.jpg`, text: "PR.04\n /10" },
    { src: `${P}${B}/h-13.jpg`, text: "PR.05\n /10" },
    { src: `${P}${B}/h-14.jpg`, text: "PR.06\n /10" },
    { src: `${P}${B}/h-15.jpg`, text: "PR.07\n /10" },
    { src: `${P}${B}/h-01.jpg`, text: "PR.08\n /10" },
    { src: `${P}${B}/h-02.jpg`, text: "PR.09\n /10" },
    { src: `${P}${B}/h-03.jpg`, text: "PR.10\n /10" },
];

const WebGLSlider = ({
    distortionStrength = 1,
    transitionDuration = 0.6,
    enableHoverEffect = true,
    imageWidth = 3.2,
    imageHeight = 3,
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updateViewport = () => setIsMobile(window.innerWidth < 768);
        updateViewport();
        window.addEventListener("resize", updateViewport);
        return () => window.removeEventListener("resize", updateViewport);
    }, []);

    if (isMobile) {
        return (
            <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#050505] px-8 text-white">
                <div className="pointer-events-none flex max-w-sm flex-col items-center gap-3 text-center">
                    <p className="text-[8vw] font-light leading-none tracking-tight">Open on desktop</p>
                    <p className="text-sm leading-relaxed text-white/55">
                        For the full fold, depth, and motion experience, view this slider on a larger screen.
                    </p>
                </div>
            </div>
        )
    }

    return (
        //  <ReactLenis root options={{  infinite: true,  autoRaf: true,  duration: 1.5,  lerp: 0.075  }}>
        <WebGLSliderComp
            images={images}
            distortionStrength={distortionStrength}
            transitionDuration={transitionDuration}
            enableHoverEffect={enableHoverEffect}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
        />
        //  </ReactLenis>
    )
}

export default WebGLSlider;
