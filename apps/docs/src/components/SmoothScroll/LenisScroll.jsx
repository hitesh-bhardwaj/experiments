"use client";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { ReactLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import { prefersReducedMotion } from "@/lib/motion";

const LenisSmoothScroll = ({
  duration = 1.35,
  lerp = 0.075,
  smoothWheel = true,
  wheelMultiplier = 0.8,
  touchMultiplier = .8,
  allowNestedScroll = false,
}) => {
  const lenisRef = useRef(null);

  useEffect(() => {
    function update(time) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);

    return () => gsap.ticker.remove(update);
  }, []);

  // Reduced motion: don't mount Lenis at all - lerp tuning still routes
  // wheel/touch input through Lenis's own virtual-scroll interpolation,
  // which isn't identical to native scrolling. Rendering nothing here means
  // the page falls back to plain native scroll, exactly as if this
  // component weren't present.
  if (prefersReducedMotion()) {
    return null;
  }

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        duration: duration,
        lerp: lerp,
        smoothWheel: smoothWheel,
        // syncTouch:true,
        wheelMultiplier: wheelMultiplier,
        touchMultiplier: touchMultiplier,
        // Nested overflow areas (e.g. code blocks) scroll natively while they
        // have room in the wheel direction, then hand off to Lenis for the
        // page - unlike data-lenis-prevent, which traps the wheel inside them.
        allowNestedScroll: allowNestedScroll,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      }}
      ref={lenisRef}
    />
  );
};

export default LenisSmoothScroll;
