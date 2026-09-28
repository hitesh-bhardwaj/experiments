'use client'

import React, { useRef } from 'react'
import { useLenis } from 'lenis/react'
import TeethCanvas from "./teeth-3d/TeethCanvas";
import DotsCanvas from "./teeth-3d/DotsCanvas";
import PatientCard from "./effects/patient-card/PatientCard";
import SplitTextLines from "./effects/split-text-lines/SplitTextLines";

export default function Hero() {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useLenis(() => {
    if (!overlayRef.current) return;
    const scrollY = typeof window !== 'undefined' ? window.scrollY || 0 : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;

    // Progress from 0 (top of page) to 1 (when scrolled ~85% of hero viewport height)
    const progress = Math.min(Math.max(scrollY / (vh * 0.85), 0), 1);
    overlayRef.current.style.opacity = (progress * 0.95).toString();
  });

  return (
    <section id="oris-hero" className="h-dvh sticky top-0 z-0 bg-[linear-gradient(to_top,#3365E2_0%,#3365E2_20%,#4a78e7_40%,#789ef1_60%,#b9d0fb_80%,#ffffff_100%)] overflow-hidden w-full max-[1025px]:h-dvh max-md:h-dvh">
      <div className="h-full w-full relative flex flex-col justify-between">

        <DotsCanvas spacing={22} lerpFactor={0.15} baseRadius={1.4} maxRadius={3.8} interactionRadius={200} />
        <TeethCanvas />

        <div className="w-full oris-paddx flex items-center justify-between h-full max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:justify-start max-[1025px]:gap-[2.5vw] max-md:gap-[4vw] max-[1025px]:pt-[18vw] max-[1025px]:pb-[5vw] max-md:pt-[30vw] max-md:pb-6 z-10 pointer-events-none *:pointer-events-auto">

          <div className="w-1/2 max-[1025px]:w-full gap-[2vw] max-[1025px]:gap-[2.5vw] max-md:gap-[4vw] flex items-start justify-center flex-col max-[1025px]:h-auto">
            <SplitTextLines as="h1" className="oris-text64  font-medium! w-[62%] max-[1025px]:w-[75vw] max-md:w-[68%]" delay={1} waitForLoader>
              Brighten your smile with expert dental care
            </SplitTextLines>
            <SplitTextLines as="p" className="w-[20vw] max-[1025px]:w-[70vw] max-md:w-[85%] oris-text22 " delay={1.25} waitForLoader>
              We provide gentle, personalized dental treatments that help patients feel relaxed with greater confidence
            </SplitTextLines>
          </div>

          <div className="w-1/2 mt-auto max-[1025px]:mt-0 max-[1025px]:w-full flex gap-[7vw] max-[1025px]:gap-3 items-end max-[1025px]:items-start justify-end pb-[5vw] max-[1025px]:pb-0 flex-col max-[1025px]:h-auto">
            <SplitTextLines as="p" className="w-[62%] max-[1025px]:w-[70vw] max-md:w-[90%] pr-[1vw] max-[1025px]:pr-0 oris-text22" delay={1.5} waitForLoader>
              Our treatments are designed to support patients across diverse needs and clinical situations, from routine cleaning to complex restorative procedures. Every treatment plan is personalized to your specific dental health goals, budget considerations, and timeline preferences.
            </SplitTextLines>

            <PatientCard
              className="max-[1025px]:hidden"
              delay={1.4}
              waitForLoader
            />
          </div>

        </div>

        {/* Dynamic Dark Blue Scroll Overlay ON TOP of the entire hero */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none z-50 bg-linear-to-b from-[#13314a] via-[#0f283c] to-[#0a1b2a] opacity-0 will-change-opacity"
          aria-hidden="true"
        />
      </div>

    </section>
  )
}
