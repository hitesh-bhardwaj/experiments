// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useState } from "react";
import Arrows from "./arrows";
import ArrowsOpacity from "./ArrowsOpacity";
import ArrowsLimit from "./ArrowsLimit";
import ArrowsPlay from "./ArrowsPlay";
import Lines from "./lines";


const variations = [
  {
    id: "dynamic-arrow",
    label: "Dynamic Arrow",
    frameClassName: "border-black/15 bg-white",
    component: Arrows,
  },
  {
    id: "dynamic-opacity",
    label: "Opacity",
    frameClassName: "border-black/15 bg-white",
    component: ArrowsOpacity,
  },
  {
    id: "smooth-response",
    label: "Smooth",
    frameClassName: "border-black/15 bg-white",
    component: ArrowsLimit,
  },
  {
    id: "vector-lines",
    label: "Lines",
    frameClassName: "border-black/15 bg-white",
    component: Lines,
  },
  {
    id: "playful-arrows",
    label: "Play",
    frameClassName: "border-black/15 bg-white",
    component: ArrowsPlay,
  },
];

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

const InteractiveArrows = (props: Record<string, unknown>) => {
  const [active, setActive] = useState(variations[0].id);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const updateMobile = () => setIsMobile(mobileQuery.matches);

    updateMobile();
    mobileQuery.addEventListener("change", updateMobile);
    return () => mobileQuery.removeEventListener("change", updateMobile);
  }, []);

  const activeVariation =
    variations.find((variation) => variation.id === active) ?? variations[0];
  const ActiveComponent = activeVariation.component;

  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white px-6 text-center text-black">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Open on desktop</h2>
          <p className="mt-3 text-sm leading-6 text-black/60">
            Interactive Arrows needs a desktop pointer for the full hover response.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-black">
      <div className="flex min-h-screen flex-col px-8 py-8 max-md:px-6 max-md:py-6">
        <div className="mx-auto flex w-full max-w-350 justify-center">
          <div className="inline-flex flex-wrap  relative z-400 justify-center gap-2 rounded-full border p-2 backdrop-blur-sm border-black/10 bg-black/5">
            {variations.map((variation) => (
              <button
                key={variation.id}
                onClick={() => setActive(variation.id)}
                className={`cursor-pointer rounded-full px-5 py-2 text-sm transition-all duration-200 max-md:px-4 ${
                  active === variation.id
                    ? "bg-black text-white"
                    : "bg-transparent text-black/60 hover:text-black"
                }`}
              >
                {variation.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 max-md:py-6">
          <div
            className={`h-[78vh] w-full max-w-350 overflow-hidden rounded-[28px] border transition-colors duration-300 ${activeVariation.frameClassName}`}
          >
            <ActiveComponent {...props} />
          </div>
        </div>
      </div>
      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-[#F8F8F3] p-3 text-center"
        >
          <h2 className="text-sm leading-none text-[#111111]">
            The arrows keep turning.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black/65">
            Each arrow reorients toward your cursor continuously. That
            motion is the entire effect, so it can&apos;t be scaled back for
            reduced motion preferences.
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveArrows;
