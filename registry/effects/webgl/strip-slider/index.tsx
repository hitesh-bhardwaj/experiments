// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useState } from'react'
import StripSliderComp from './StripSliderComp';

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

/** @type {import('./StripSliderComp').StripSliderItem[]} */
const items = [
 { id:'item-0',  url:'https://picsum.photos/seed/strip0/600/900',  text:'Nature 1',  atlasIndex: 0,  colors: ['#333','#aaa'] },
 { id:'item-1',  url:'https://picsum.photos/seed/strip1/600/900',  text:'Nature 2',  atlasIndex: 1,  colors: ['#333','#aaa'] },
 { id:'item-2',  url:'https://picsum.photos/seed/strip2/600/900',  text:'Nature 3',  atlasIndex: 2,  colors: ['#333','#aaa'] },
 { id:'item-3',  url:'https://picsum.photos/seed/strip3/600/900',  text:'Nature 4',  atlasIndex: 3,  colors: ['#333','#aaa'] },
 { id:'item-4',  url:'https://picsum.photos/seed/strip4/600/900',  text:'Nature 5',  atlasIndex: 4,  colors: ['#333','#aaa'] },
 { id:'item-5',  url:'https://picsum.photos/seed/strip5/600/900',  text:'Nature 6',  atlasIndex: 5,  colors: ['#333','#aaa'] },
 { id:'item-6',  url:'https://picsum.photos/seed/strip6/600/900',  text:'Nature 7',  atlasIndex: 6,  colors: ['#333','#aaa'] },
 { id:'item-7',  url:'https://picsum.photos/seed/strip7/600/900',  text:'Nature 8',  atlasIndex: 7,  colors: ['#333','#aaa'] },
 { id:'item-8',  url:'https://picsum.photos/seed/strip8/600/900',  text:'Nature 9',  atlasIndex: 8,  colors: ['#333','#aaa'] },
 { id:'item-9',  url:'https://picsum.photos/seed/strip9/600/900',  text:'Nature 10', atlasIndex: 9,  colors: ['#333','#aaa'] },
 { id:'item-10', url:'https://picsum.photos/seed/strip10/800/600', text:'Nature 11', atlasIndex: 10, colors: ['#333','#aaa'] },
 { id:'item-11', url:'https://picsum.photos/seed/strip11/800/600', text:'Nature 12', atlasIndex: 11, colors: ['#333','#aaa'] },
 { id:'item-12', url:'https://picsum.photos/seed/strip12/800/600', text:'Nature 13', atlasIndex: 12, colors: ['#333','#aaa'] },
 { id:'item-13', url:'https://picsum.photos/seed/strip13/800/600', text:'Nature 14', atlasIndex: 13, colors: ['#333','#aaa'] },
 { id:'item-14', url:'https://picsum.photos/seed/strip14/800/600', text:'Image 1',   atlasIndex: 14, colors: ['#333','#aaa'] },
 { id:'item-15', url:'https://picsum.photos/seed/strip15/800/600', text:'Image 2',   atlasIndex: 15, colors: ['#333','#aaa'] },
 { id:'item-16', url:'https://picsum.photos/seed/strip16/800/600', text:'Image 3',   atlasIndex: 16, colors: ['#333','#aaa'] },
 { id:'item-17', url:'https://picsum.photos/seed/strip17/800/600', text:'Image 4',   atlasIndex: 17, colors: ['#333','#aaa'] },
 { id:'item-18', url:'https://picsum.photos/seed/strip18/800/600', text:'Image 5',   atlasIndex: 18, colors: ['#333','#aaa'] },
 { id:'item-19', url:'https://picsum.photos/seed/strip19/800/600', text:'Image 6',   atlasIndex: 19, colors: ['#333','#aaa'] },
 { id:'item-20', url:'https://picsum.photos/seed/strip20/800/600', text:'Image 7',   atlasIndex: 20, colors: ['#333','#aaa'] },
];

const StripSlider = ({
 dispScale = 1,
 cameraSway = 0.03,
 hideCentralStrip = false,
 imageSize = 1,
}) => {
 const prefersReducedMotion = usePrefersReducedMotion();

 return (
 <div className="w-full h-screen bg-black">
 <StripSliderComp
 items={items}
 dispScale={dispScale}
 cameraSway={cameraSway}
 hideCentralStrip={hideCentralStrip}
 imageSize={imageSize}
 />

 {prefersReducedMotion && (
 <div
 aria-live="polite"
 className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-md:hidden"
 >
 <h2 className="text-sm leading-none text-white">
 The strip keeps sliding.
 </h2>
 <p className="mt-2 text-xs leading-5 text-white/65">
 Strip Slider ties its horizontal motion to scroll position via
 smooth-scroll physics. Since the animation is driven by scroll
 motion itself, it can&apos;t be reduced without removing the
 effect.
 </p>
 </div>
 )}
 </div>
 )
}

export default StripSlider
