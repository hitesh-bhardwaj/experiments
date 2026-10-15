// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import React, { useEffect, useRef, useState, type CSSProperties } from "react";

gsap.registerPlugin(ScrollTrigger)

interface ColorfulCursorAuraColors {
 color1?: string
 color2?: string
 color3?: string
}

interface ColorfulCursorAuraCompProps {
 text?: string
 colors?: ColorfulCursorAuraColors
 enableEntryAnimation?: boolean
 textColor?: string
 color1?: string
 color2?: string
 color3?: string
 auraSize?: number
 followSpeed?: number
}

function ColorfulCursorAuraComp({
 text,
 color1 = '#a78bfa',
 color2 = '#fb7185',
 color3 = '#fde68a',
 auraSize = 325,
 followSpeed = 0.12,
 enableEntryAnimation = true,
 textColor ='#000000',
}: ColorfulCursorAuraCompProps) {
 const container = useRef<HTMLElement | null>(null)
 const aeroText = useRef<HTMLDivElement | null>(null)
 const maskedText = useRef<HTMLParagraphElement | null>(null)
 const [isDesktop, setIsDesktop] = useState(false)
 const resolvedAuraSize = Math.max(0, Number(auraSize) || 0)
 const resolvedFollowSpeed = Math.max(0.01, Number(followSpeed) || 0.12)
 const circleTrackers = useRef([
 { x: 0, y: 0 }, // color1
 { x: 0, y: 0 }, // color2
 { x: 0, y: 0 }, // color3
 ])

 useEffect(() => {
 const checkWidth = () => {
 setIsDesktop(window.innerWidth >= 1025)
 }

 checkWidth() // initial check

 window.addEventListener('resize', checkWidth)

 return () => window.removeEventListener('resize', checkWidth)
}, [])

 useEffect(() => {
 const el = container.current
 const maskEl = maskedText.current
 const trackers = circleTrackers.current
 if (!el || !maskEl || !isDesktop) {
 gsap.killTweensOf(trackers)
 return
 }

 const syncMaskVars = () => {
 maskEl.style.setProperty('--x-color1', `${trackers[0].x}px`)
 maskEl.style.setProperty('--y-color1', `${trackers[0].y}px`)
 maskEl.style.setProperty('--x-color2', `${trackers[1].x}px`)
 maskEl.style.setProperty('--y-color2', `${trackers[1].y}px`)
 maskEl.style.setProperty('--x-color3', `${trackers[2].x}px`)
 maskEl.style.setProperty('--y-color3', `${trackers[2].y}px`)
 }

 const initRect = maskEl.getBoundingClientRect()
 const cx = initRect.width / 2
 const cy = initRect.height / 2
 trackers.forEach((item) => {
 item.x = cx
 item.y = cy
 })
 syncMaskVars()

 const onMove = (evt: MouseEvent) => {
 const rect = maskEl.getBoundingClientRect()
 const localX = evt.clientX - rect.left
 const localY = evt.clientY - rect.top

 gsap.to(trackers, {
 x: localX,
 y: localY,
 duration: Math.min(Math.max(0.06 / resolvedFollowSpeed, 0.04), 2),
 ease:'power1.out',
 stagger: -0.1,
 overwrite:'auto',
 onUpdate: syncMaskVars,
 })
 }

 el.addEventListener('mousemove', onMove)
 return () => {
 el.removeEventListener('mousemove', onMove)
 gsap.killTweensOf(trackers)
 }
 }, [isDesktop, resolvedFollowSpeed])

 useEffect(() => {
 if (!enableEntryAnimation) return

 const ctx = gsap.context(() => {
 gsap.from(aeroText.current, {
 scrollTrigger: {
 trigger: container.current,
 start:'top 60%',
 },
 opacity: 0,
 yPercent: 320,
 skewY: 30,
 duration: 3,
 ease:'expo.out',
 })
 }, container)

 return () => ctx.revert()
 }, [enableEntryAnimation])

 return (
 <section
 ref={container}
 data-cursor-color="#000"
 data-cursor-size="0px"
 className="relative w-screen h-screen overflow-hidden  max-lg:h-[70vh]"
 >
 <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
 <div
 ref={aeroText}
 className="relative w-[70%] max-lg:w-[80%]"
 >
 <p
 className="text-center font-heading text-[6vw] font-medium max-lg:text-[8vw] max-md:text-[10vw]"
 style={{ color: textColor }}
 >
 {text}
 </p>

 {isDesktop && (
 <p
 ref={maskedText}
 aria-hidden
 className="pointer-events-none absolute inset-0 text-center font-heading text-[6vw] font-medium text-transparent bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent] max-lg:text-[8vw] max-md:text-[10vw]"
 style={{
'--x-color1':'50%',
'--y-color1':'50%',
'--x-color2':'50%',
'--y-color2':'50%',
'--x-color3':'50%',
'--y-color3':'50%',
 backgroundImage: `
 radial-gradient(circle ${resolvedAuraSize * 0.42}px at var(--x-color3) var(--y-color3), ${color3} 0 99%, transparent 100%),
 radial-gradient(circle ${resolvedAuraSize * 0.68}px at var(--x-color2) var(--y-color2), ${color2} 0 99%, transparent 100%),
 radial-gradient(circle ${resolvedAuraSize}px at var(--x-color1) var(--y-color1), ${color1} 0 99%, transparent 100%)
 `,
 } as CSSProperties & Record<string, string | number>}
 >
 {text}
 </p>
 )}
 </div>
 </div>
 </section>
 )
}

const ColorfulCursorAura = ({
  auraSize = 325,
  color1 = '#a78bfa',
  color2 = '#fb7185',
  color3 = '#fde68a',
  followSpeed = 0.12,
}) => {

  return (
     <div className="relative min-h-screen bg-white">
      <ColorfulCursorAuraComp
        text="One hover, and suddenly your UI has personality"
        auraSize={auraSize}
        color1={color1}
        color2={color2}
        color3={color3}
        followSpeed={followSpeed}
        enableEntryAnimation={true}
      />

      {/* Mobile only notice */}
      <div className="hidden max-lg:block absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-zinc-700 max-lg:text-[3vw] max-md:text-[4vw] leading-[1.2] font-medium">
           Open on desktop to experience the mouse effect
        </p>
      </div>

    </div>
  )
}

export default ColorfulCursorAura
