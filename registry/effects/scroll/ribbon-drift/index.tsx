// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import { RibbonDriftComp } from "./RibbonDriftComp";

function usePrefersReducedMotion() {
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

 useEffect(() => {
 const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
 const update = () => setPrefersReducedMotion(mediaQuery.matches)
 update()
 mediaQuery.addEventListener('change', update)
 return () => mediaQuery.removeEventListener('change', update)
 }, [])

 return prefersReducedMotion
}


const RibbonDrift = ({
 driftSpeed = 1,
 ribbonColor = "#000000",
 imageSize = 1,
 showNames = true,
}) => {
 const prefersReducedMotion = usePrefersReducedMotion();

 return (
 <ReactLenis root>
 <section className="w-screen h-fit max-md:h-full">
 <RibbonDriftComp
 driftSpeed={driftSpeed}
 ribbonColor={ribbonColor}
 imageSize={imageSize}
 showNames={showNames}
 />
 </section>
 {prefersReducedMotion && (
 <div
 aria-live="polite"
 className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-white/10 backdrop-blur-md p-3 text-center"
 >
 <h2 className="text-sm leading-none text-[#111111]">
 The ribbon keeps drifting.
 </h2>
 <p className="mt-2 text-xs leading-5 text-black/65">
 Ribbon Drift ties its image reveal and text splits to scroll
 position. Since the animation is driven by scroll motion itself,
 it can&apos;t be reduced without removing the effect.
 </p>
 </div>
 )}
 </ReactLenis>
 );
};

export default RibbonDrift;
