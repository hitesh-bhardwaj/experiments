"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ReactLenis, useLenis } from "lenis/react";
import DitherTransition from "@/components/dither-transition";
import FlickeringText from "@/components/flickering-text";
import FocusText from "@/components/focus-text";
import DemoHeader from "@/components/preview-chrome/DemoHeader";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function Demo() {
  const rootRef = useRef<HTMLElement>(null);

  useLenis(() => {
    ScrollTrigger.update();
  });

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const effects = gsap.utils.toArray<HTMLElement>(".demo-text-effect", root);

      if (reducedMotion) {
        gsap.set(effects, {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        });
        return;
      }

      effects.forEach((effect) => {
        gsap.fromTo(
          effect,
          {
            opacity: 0,
            y: 90,
            filter: "blur(16px)",
          },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            ease: "power3.out",
            scrollTrigger: {
              trigger: effect,
              start: "top 82%",
              end: "top 42%",
              scrub: 0.8,
            },
          },
        );
      });
    },
    { scope: rootRef },
  );

  return (
    <main ref={rootRef} className="bg-white">
      <DemoHeader />

      <FlickeringText
        className="demo-text-effect dither-demo-flicker bg-[#050505]"
        textColor="#ffffff"
        fontSize="clamp(4.25rem, 12vw, 11rem)"
        wigglesPerSecond={2.4}
        correlation={0.62}
        minOpacity={0.18}
        glowIntensity={0.85}
        glowRadius={0.9}
      />

      <DitherTransition
        markers={false}
        mobileStartTriggers="-10% bottom"
        mobileEndTriggers="bottom -50%"
        className="relative z-10 -mt-px -mb-[60vw] h-[60vw] bg-[#050505] max-md:-mb-[150vw]! max-md:h-[150vw]!"
      />

      <FocusText
        className="dither-demo-focus bg-white text-[#111111]"
        text={
          "Clarity lands in the light.\nA fuller message resolves after the dither handoff.\nScroll turns texture into readable intent."
        }
        fontSize={4.8}
        characterStagger={0.018}
        revealDuration={2.2}
        startScale={0.68}
        blurAmount={14}
        scrub
        scrollStart="top 74%"
        scrollEnd="center 42%"
        backgroundColor="#ffffff"
        textColor="#111111"
        showReplayButton={false}
      />

      <style>{`
        .dither-demo-flicker {
          padding: 0 1.5rem;
        }

        .dither-demo-flicker > [aria-hidden="true"] {
          display: none;
        }

        .dither-demo-flicker > div:not([aria-hidden="true"]) {
          transform: none;
        }

        .dither-demo-focus {
          min-height: 100vh;
          height: 100vh;
          justify-content: center;
          padding: 0 1.5rem;
          text-align: center;
          color: #111111;
          background-image: none !important;
        }

        .dither-demo-focus h1 {
          position: relative;
          z-index: 20;
          max-width: 72rem;
          color: #111111 !important;
          text-align: center;
          font-weight: 650;
          letter-spacing: 0;
          text-transform: none;
        }
      `}</style>
    </main>
  );
}

export default function DemoContent() {
  return (
    <ReactLenis root options={{ duration: 1.35, smoothWheel: true }}>
      <Demo />
    </ReactLenis>
  );
}
