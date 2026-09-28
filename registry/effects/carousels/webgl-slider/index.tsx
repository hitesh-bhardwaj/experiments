// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client"

import React, { useEffect, useState } from'react'
import WebGLSliderComp, { type WebGLSliderImage } from './WebGLSliderComp';

const images: WebGLSliderImage[] = [
 { src:"https://picsum.photos/seed/wgl0/800/1200", text:"PR.00\n /10" },
 { src:"https://picsum.photos/seed/wgl1/800/1200", text:"PR.01\n /10" },
 { src:"https://picsum.photos/seed/wgl2/800/1200", text:"PR.02\n /10" },
 { src:"https://picsum.photos/seed/wgl3/800/1200", text:"PR.03\n /10" },
 { src:"https://picsum.photos/seed/wgl4/800/1200", text:"PR.04\n /10" },
 { src:"https://picsum.photos/seed/wgl5/800/1200", text:"PR.05\n /10" },
 { src:"https://picsum.photos/seed/wgl6/800/1200", text:"PR.06\n /10" },
 { src:"https://picsum.photos/seed/wgl7/800/1200", text:"PR.07\n /10" },
 { src:"https://picsum.photos/seed/wgl8/800/1200", text:"PR.08\n /10" },
 { src:"https://picsum.photos/seed/wgl9/800/1200", text:"PR.09\n /10" },
 { src:"https://picsum.photos/seed/wgl10/800/1200", text:"PR.10\n /10" },
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
 <p className="text-[11vw] font-light leading-none tracking-tight">Open on desktop</p>
 <p className="text-sm uppercase tracking-[0.3em] text-white/35">WebGL Slider</p>
 <p className="text-sm leading-relaxed text-white/55">
 For the full fold, depth, and motion experience, view this slider on a larger screen.
 </p>
 </div>
 </div>
 )
 }

 return (
 <WebGLSliderComp
 images={images}
            distortionStrength={distortionStrength}
            transitionDuration={transitionDuration}
            enableHoverEffect={enableHoverEffect}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
        />
 )
}

export default WebGLSlider;
