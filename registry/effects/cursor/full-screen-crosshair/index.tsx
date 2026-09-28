// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useState } from "react";
import { useMouse } from "./useMouse";

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

interface FullScreenCrosshairProps {
  color?: string;
  centerContent?: string;
  hideNativeCursor?: boolean;
  lineSize?: number;
  gap?: number;
  thickness?: number;
  centerSize?: number;
  smooth?: boolean;
  lerpFactor?: number;
  blendMode?: string;
  className?: string;
}

const FullScreenCrosshair = ({
  color = "#ffffff",
  centerContent = "•",
  hideNativeCursor = true,
  gap = 20,
  thickness = 1,
  centerSize = 24,
  smooth = true,
  lerpFactor = 0.14,
  className = "",
}: FullScreenCrosshairProps) => {
  const crosshairArmLength = 1500;
  const { smoothMouse } = useMouse({
    smooth,
    lerpFactor,
  });
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!hideNativeCursor) return undefined;

    const { body, documentElement } = document;
    const previousCursor = body.style.cursor;
    const previousRootCursor = documentElement.style.cursor;
    const style = document.createElement("style");
    style.setAttribute("data-crosshair-cursor-style", "true");
    style.textContent = `
      html[data-crosshair-hide-cursor="true"],
      html[data-crosshair-hide-cursor="true"] body,
      html[data-crosshair-hide-cursor="true"] * {
        cursor: none !important;
      }

      html[data-crosshair-hide-cursor="true"] button,
      html[data-crosshair-hide-cursor="true"] input,
      html[data-crosshair-hide-cursor="true"] textarea,
      html[data-crosshair-hide-cursor="true"] select,
      html[data-crosshair-hide-cursor="true"] a,
      html[data-crosshair-hide-cursor="true"] label,
      html[data-crosshair-hide-cursor="true"] [role="button"],
      html[data-crosshair-hide-cursor="true"] [contenteditable="true"] {
        cursor: auto !important;
      }
    `;

    documentElement.dataset.crosshairHideCursor = "true";
    documentElement.style.cursor = "none";
    body.style.cursor = "none";
    document.head.appendChild(style);

    return () => {
      body.style.cursor = previousCursor;
      documentElement.style.cursor = previousRootCursor;
      delete documentElement.dataset.crosshairHideCursor;
      style.remove();
    };
  }, [hideNativeCursor]);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-70 ${className}`}
      style={{
        "--crosshair-color": color,
        "--crosshair-line-size": `${crosshairArmLength}px`,
        "--crosshair-gap": `${gap}px`,
        "--crosshair-thickness": `${thickness}px`,
        "--crosshair-center-size": `${centerSize}px`,
      } as React.CSSProperties & Record<string, string | number>}
    >
      <div
        className="absolute left-0 top-0 h-0 w-0 will-change-transform"
        style={{
          transform: `translate3d(${smoothMouse.current.x}px, ${smoothMouse.current.y}px, 0)`,
        }}
      >
        <span className="absolute left-1/2 -top-[(var(--crosshair-gap)+var(--crosshair-line-size))] block h-(--crosshair-line-size) w-(--crosshair-thickness) -translate-x-1/2 bg-(--crosshair-color)" />
        <span className="absolute left-(--crosshair-gap) top-1/2 block h-(--crosshair-thickness) w-(--crosshair-line-size) -translate-y-1/2 bg-(--crosshair-color)" />
        <span className="absolute left-1/2 top-(--crosshair-gap) block h-(--crosshair-line-size) w-(--crosshair-thickness) -translate-x-1/2 bg-(--crosshair-color)" />
        <span className="absolute right-(--crosshair-gap) top-1/2 block h-(--crosshair-thickness) w-(--crosshair-line-size) -translate-y-1/2 bg-(--crosshair-color)" />

        <div className="absolute left-1/2 top-1/2 flex min-h-(--crosshair-center-size) min-w-(--crosshair-center-size) -translate-x-1/2 -translate-y-1/2 select-none items-center justify-center whitespace-nowrap leading-none text-(length:--crosshair-center-size) text-(--crosshair-color) max-[1025px]:text-[calc(var(--crosshair-center-size)*0.9)] max-md:text-[calc(var(--crosshair-center-size)*0.9)]">
          {centerContent}
        </div>
      </div>
      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-99999 w-fit max-w-65 rounded-md border border-white/15 bg-white/10 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-white">
            The crosshair keeps tracking.
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/65">
            Full Screen Crosshair follows your cursor continuously across the
            screen. Since tracking motion is the entire effect, reduced motion
            can&apos;t be applied here.
          </p>
        </div>
      )}
    </div>
  );
};

export default FullScreenCrosshair;
