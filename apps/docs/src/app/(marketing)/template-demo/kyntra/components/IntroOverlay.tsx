// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "./Animations/reducedMotion";

gsap.registerPlugin(useGSAP);

// Long enough to read as "blank, then everything arrives in sequence"
const HOLD = 0.35;
const FADE = 0.6;

/**
 * A plain white sheet held over the page for the first few frames.
 *
 * It paints *over* the page rather than hiding it: the content underneath
 * renders and paints normally, so the browser still picks an LCP candidate.
 * An `opacity: 0` hero would have none.
 */
const IntroOverlay = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    // Styled here rather than in Tailwind so the cover is owned by one timeline
    gsap.set(el, {
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100svh",
      backgroundColor: "#ffffff",
      zIndex: 9999,
      pointerEvents: "none",
      opacity: 1,
    });

    if (prefersReducedMotion()) {
      gsap.set(el, { display: "none" });
      return;
    }

    gsap.to(el, {
      opacity: 0,
      duration: FADE,
      delay: HOLD,
      ease: "power2.out",
      // Drop the layer entirely once it is invisible
      onComplete: () => gsap.set(el, { display: "none" }),
    });
  }, []);

  return (
    <>
      {/* Without JS nothing would ever clear the sheet, and the page would be
          permanently blank */}
      <noscript>
        <style>{`[data-intro-overlay]{display:none!important}`}</style>
      </noscript>
      <div
        ref={ref}
        data-intro-overlay
        aria-hidden
        // Also present in the server HTML - a cover that only appears at
        // hydration lets the page flash through first
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100svh",
          backgroundColor: "#ffffff",
          zIndex: 9999,
          pointerEvents: "none",
          opacity: 1,
        }}
      />
    </>
  );
};

export default IntroOverlay;
