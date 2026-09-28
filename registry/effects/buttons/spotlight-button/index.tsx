// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getServerReducedMotionSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    getServerReducedMotionSnapshot,
  );
}

export interface SpotlightButtonOwnProps {
  label?: string;
  icon?: ReactNode;
  className?: string;
  /** Leading edge of the travelling halo. */
  haloColor?: string;
  /** Bright core of the halo, revealed on hover. */
  haloCoreColor?: string;
  /** Seconds for one full trip of the halo around the border. */
  orbitDuration?: number;
  /** Seconds for the hover transition to settle. */
  settleDuration?: number;
  /** Halo width as a percentage of the border sweep. */
  haloWidth?: number;
  /** Strength of the border spotlight and glow, from 0 to 1. */
  spotlightIntensity?: number;
  /** Button dimensions; intentionally hidden from the remixer. */
  size?: "sm" | "md" | "lg";
  /**
   * Tailwind class for the tint over the inner spotlight; intentionally
   * hidden from the remixer.
   */
  overlayColor?: string;
}

export type SpotlightButtonProps = SpotlightButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof SpotlightButtonOwnProps>;

export function SpotlightButton({
  label = "Explore Hyperiux",
  icon,
  className = "",
  haloColor = "#ff5f00",
  haloCoreColor = "#ff9253",
  orbitDuration = 3,
  settleDuration = 0.8,
  haloWidth = 5,
  spotlightIntensity = 1,
  size = "md",
  overlayColor = "bg-black/30",
  ...props
}: SpotlightButtonProps) {
  const intensity = Number.isFinite(spotlightIntensity) ? Math.min(1, Math.max(0, spotlightIntensity)) : 1;
  const sizeClasses = {
    sm: "h-7 px-2.5 py-1 text-[10px]",
    md: "h-8.5 px-3.5 py-1.5 text-xs",
    lg: "h-11 px-5 py-2 text-sm scale-[2.2]",
  }[size];
  const reducedMotion = usePrefersReducedMotion();
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ring = `halo-ring-${instanceId}`;

  const turn = `--halo-turn-${instanceId}`;
  const lead = `--halo-lead-${instanceId}`;
  const spread = `--halo-spread-${instanceId}`;
  const core = `--halo-core-${instanceId}`;

  const css = `
    @property ${turn} {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @property ${lead} {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @property ${spread} {
      syntax: "<percentage>";
      initial-value: ${haloWidth}%;
      inherits: false;
    }
    @property ${core} {
      syntax: "<color>";
      initial-value: color-mix(in srgb, white ${intensity * 100}%, transparent);
      inherits: false;
    }

    .${ring} {
      ${spread}: ${haloWidth}%;
      ${core}: color-mix(in srgb, white ${intensity * 100}%, transparent);
      background:
        linear-gradient(transparent, transparent) padding-box,
        conic-gradient(
          from calc(var(${turn}) - var(${lead})),
          transparent,
          color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) var(${spread}),
          var(${core}) calc(var(${spread}) * 2),
          color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) calc(var(${spread}) * 3),
          transparent calc(var(${spread}) * 4)
        ) border-box;
      transition:
        ${lead} ${settleDuration}s cubic-bezier(0.25, 1, 0.5, 1),
        ${spread} ${settleDuration}s cubic-bezier(0.25, 1, 0.5, 1),
        ${core} ${settleDuration}s cubic-bezier(0.25, 1, 0.5, 1),
        transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      animation: halo-orbit-${instanceId} ${orbitDuration}s linear infinite;
      animation-composition: add;
    }

    .${ring}::before {
      content: "";
      position: absolute;
      inset: -8px;
      border-radius: inherit;
      background: conic-gradient(
        from calc(var(${turn}) - var(${lead})),
        transparent,
        color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) var(${spread}),
        var(${core}) calc(var(${spread}) * 2),
        color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) calc(var(${spread}) * 3),
        transparent calc(var(${spread}) * 4)
      );
      filter: blur(14px);
      opacity: 0.9;
      pointer-events: none;
      z-index: 0;
      transition: opacity ${settleDuration}s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .${ring}::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      clip-path: inset(0 round 9999px);
      background: conic-gradient(
        from calc(var(${turn}) - var(${lead})),
        transparent,
        color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) var(${spread}),
        var(${core}) calc(var(${spread}) * 2),
        color-mix(in srgb, ${haloColor} ${intensity * 100}%, transparent) calc(var(${spread}) * 3),
        transparent calc(var(${spread}) * 4)
      );
      filter: blur(10px);
      opacity: 0.45;
      pointer-events: none;
      z-index: 1;
      transition: opacity ${settleDuration}s cubic-bezier(0.25, 1, 0.5, 1);
    }

    .spotlight-button-${instanceId}:is(:hover, :focus-visible):not(:disabled) .${ring} {
      ${spread}: 20%;
      ${lead}: 95deg;
      ${core}: color-mix(in srgb, ${haloCoreColor} ${intensity * 100}%, transparent);
    }

    .spotlight-button-${instanceId}:is(:hover, :focus-visible):not(:disabled) .${ring}::before {
      opacity: 1;
    }

    .spotlight-button-${instanceId}:is(:hover, :focus-visible):not(:disabled) .${ring}::after {
      opacity: 0.6;
    }

    .spotlight-button-${instanceId}:active:not(:disabled) .${ring} {
      transform: translateY(1px) scale(0.98);
    }

    .spotlight-button-${instanceId}:active:not(:disabled) .spotlight-face {
      box-shadow: inset 0px 2px 4px rgba(0,0,0,0.4), inset 0px 1px 2px rgba(0,0,0,0.3);
    }

    @keyframes halo-orbit-${instanceId} {
      to {
        ${turn}: 360deg;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .${ring},
      .${ring}::before,
      .${ring}::after {
        animation: none !important;
        transition: none;
        transform: none !important;
      }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <button
        type="button"
        className={`spotlight-button-${instanceId} group/spotlight-button relative flex overflow-hidden ${sizeClasses} cursor-pointer items-center justify-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-transparent font-bold outline-offset-4 ${className}`}
        data-reduced-motion={reducedMotion ? "true" : undefined}
        {...props}

      >
        <span
          aria-hidden="true"
          className={`${ring} pointer-events-none absolute inset-0 overflow-hidden rounded-full border-[1.5px] border-transparent backdrop-blur-xl backdrop-saturate-180 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0px_36px_14px_0px_rgba(0,0,0,0.02),0px_20px_12px_0px_rgba(0,0,0,0.08),0px_9px_9px_0px_rgba(0,0,0,0.12),0px_2px_5px_0px_rgba(0,0,0,0.15)] group-hover/spotlight-button:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0px_12px_6px_0px_rgba(0,0,0,0.05),0px_8px_5px_0px_rgba(0,0,0,0.1),0px_4px_4px_0px_rgba(0,0,0,0.15),0px_1px_2px_0px_rgba(0,0,0,0.2)] group-focus-visible/spotlight-button:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0px_12px_6px_0px_rgba(0,0,0,0.05),0px_8px_5px_0px_rgba(0,0,0,0.1),0px_4px_4px_0px_rgba(0,0,0,0.15),0px_1px_2px_0px_rgba(0,0,0,0.2)] group-active/spotlight-button:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0px_1px_2px_0px_rgba(0,0,0,0.3)]`}
        >
          <span
            className={`spotlight-face pointer-events-none absolute inset-0 z-2 rounded-full transition-shadow duration-150 motion-reduce:transition-none ${overlayColor}`}
          />
        </span>
        <span className="relative z-10 flex text-white items-center justify-center gap-2.5 font-bold tracking-wide whitespace-nowrap">
          {icon}
          <span>{label}</span>
        </span>
      </button>
    </>
  );
}

export default SpotlightButton;
