"use client";

import React from'react'
import LenisSmoothScroll from'@/components/SmoothScroll/LenisScroll'
import StripSliderComp from './StripSliderComp';
import { usePrefersReducedMotion } from '@/lib/motion';

const P = "/api/media-proxy?url=";
const B = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images";

const items = [
 { id:'item-0',  url:`${P}${B}/v-01.jpg`, text:'Nature 1',  atlasIndex: 0,  colors: ['#333','#aaa'] },
 { id:'item-1',  url:`${P}${B}/v-02.jpg`, text:'Nature 2',  atlasIndex: 1,  colors: ['#333','#aaa'] },
 { id:'item-2',  url:`${P}${B}/v-03.jpg`, text:'Nature 3',  atlasIndex: 2,  colors: ['#333','#aaa'] },
 { id:'item-3',  url:`${P}${B}/v-04.jpg`, text:'Nature 4',  atlasIndex: 3,  colors: ['#333','#aaa'] },
 { id:'item-4',  url:`${P}${B}/v-05.jpg`, text:'Nature 5',  atlasIndex: 4,  colors: ['#333','#aaa'] },
 { id:'item-5',  url:`${P}${B}/v-06.jpg`, text:'Nature 6',  atlasIndex: 5,  colors: ['#333','#aaa'] },
 { id:'item-6',  url:`${P}${B}/v-07.jpg`, text:'Nature 7',  atlasIndex: 6,  colors: ['#333','#aaa'] },
 { id:'item-7',  url:`${P}${B}/v-08.jpg`, text:'Nature 8',  atlasIndex: 7,  colors: ['#333','#aaa'] },
 { id:'item-8',  url:`${P}${B}/v-09.jpg`, text:'Nature 9',  atlasIndex: 8,  colors: ['#333','#aaa'] },
 { id:'item-9',  url:`${P}${B}/v-10.jpg`, text:'Nature 10', atlasIndex: 9,  colors: ['#333','#aaa'] },
 { id:'item-10', url:`${P}${B}/h-03.jpg`, text:'Nature 11', atlasIndex: 10, colors: ['#333','#aaa'] },
 { id:'item-11', url:`${P}${B}/h-05.jpg`, text:'Nature 12', atlasIndex: 11, colors: ['#333','#aaa'] },
 { id:'item-12', url:`${P}${B}/h-06.jpg`, text:'Nature 13', atlasIndex: 12, colors: ['#333','#aaa'] },
 { id:'item-13', url:`${P}${B}/h-07.jpg`, text:'Nature 14', atlasIndex: 13, colors: ['#333','#aaa'] },
 { id:'item-14', url:`${P}${B}/h-08.jpg`, text:'Image 1',   atlasIndex: 14, colors: ['#333','#aaa'] },
 { id:'item-15', url:`${P}${B}/h-09.jpg`, text:'Image 2',   atlasIndex: 15, colors: ['#333','#aaa'] },
 { id:'item-16', url:`${P}${B}/h-10.jpg`, text:'Image 3',   atlasIndex: 16, colors: ['#333','#aaa'] },
 { id:'item-17', url:`${P}${B}/h-11.jpg`, text:'Image 4',   atlasIndex: 17, colors: ['#333','#aaa'] },
 { id:'item-18', url:`${P}${B}/h-01.jpg`, text:'Image 5',   atlasIndex: 18, colors: ['#333','#aaa'] },
 { id:'item-19', url:`${P}${B}/h-13.jpg`, text:'Image 6',   atlasIndex: 19, colors: ['#333','#aaa'] },
 { id:'item-20', url:`${P}${B}/h-14.jpg`, text:'Image 7',   atlasIndex: 20, colors: ['#333','#aaa'] },
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
 <LenisSmoothScroll />
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
 className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
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
