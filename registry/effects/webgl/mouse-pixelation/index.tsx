// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useMemo, useState } from "react";
import PixelCircle from "./PixelCircle";
import PixelShift from "./PixelShift";
import EnhancedPixelCube from "./EnhancedPixelCube";

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

type MousePixelationVariant = 'pixel-circle' | 'pixel-shift' | 'enhanced-pixel-cube';

const VARIANTS: Record<MousePixelationVariant, any> = {
  "pixel-circle": PixelCircle,
  "pixel-shift": PixelShift,
  "enhanced-pixel-cube": EnhancedPixelCube,
};

const VERSIONS: { label: string, value: MousePixelationVariant }[] = [
  {
    label: "V1",
    value: "pixel-circle",
  },
  {
    label: "V2",
    value: "pixel-shift",
  },
  {
    label: "V3",
    value: "enhanced-pixel-cube",
  },
];

const DEFAULT_PIXEL_SHIFT_IMAGE = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg";
const DEFAULT_GRID_SIZE = 35;
const DEFAULT_LERP = 0.1;
const DEFAULT_BACKGROUND_COLOR = "#000000";
const DEFAULT_CUBE_SIZE = 1;
const DEFAULT_GRID_EMBOSSING = 1;

interface MousePixelationProps {
  variant?: MousePixelationVariant;
  imageUrl?: string;
  gridSize?: number;
  mouseInteraction?: boolean;
  lerp?: number;
  backgroundColor?: string;
  cubeSize?: number;
  gridEmbossing?: number;
}

export default function MousePixelation({
  variant = "pixel-shift",
  imageUrl = DEFAULT_PIXEL_SHIFT_IMAGE,
  gridSize = DEFAULT_GRID_SIZE,
  mouseInteraction = true,
  lerp = DEFAULT_LERP,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  cubeSize = DEFAULT_CUBE_SIZE,
  gridEmbossing = DEFAULT_GRID_EMBOSSING,
}: MousePixelationProps) {
  const [activeVariant, setActiveVariant] = useState<MousePixelationVariant>(
    VARIANTS[variant] ? variant : "pixel-shift"
  );
  const prefersReducedMotion = usePrefersReducedMotion();

  const ActiveComponent = useMemo(() => {
    return VARIANTS[activeVariant] || PixelShift;
  }, [activeVariant]);

  return (
    <>
      <VersionNav
        activeVariant={activeVariant}
        onVariantChange={setActiveVariant}
      />
      <CursorMoveCue />

      <ActiveComponent
        imageUrl={imageUrl}
        img={imageUrl}
        gridSize={gridSize}
        mouseInteraction={mouseInteraction}
        lerp={lerp}
        backgroundColor={backgroundColor}
        cubeSize={cubeSize}
        gridEmbossing={gridEmbossing}
      />

      {prefersReducedMotion && (
         <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-28 right-12 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-white">
            The pixels keep shifting.
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/65">
            Mouse Pixelation reacts to cursor position across all three
            variants, in real time. Since the transition is driven entirely
            by motion, reduced motion can&apos;t be applied here.
          </p>
        </div>
      )}
    </>
  );
}

function CursorMoveCue() {
  return (
    <div className="pointer-events-none fixed bottom-6 right-[-10%] z-9999 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-black/35 px-6 py-2 text-md font-medium text-white/80 max-[1025px]:hidden backdrop-blur-md max-md:bottom-5 max-md:text-xs">

      <span>Move your cursor to see the pixelated effects</span>
    </div>
  );
}

export { PixelCircle, PixelShift, EnhancedPixelCube };

function VersionNav({ activeVariant, onVariantChange }: { activeVariant: string, onVariantChange: (value: MousePixelationVariant) => void }) {
  return (
    <nav className="fixed top-4 max-[1025px]:top-5 max-md:top-18 left-1/2 z-9999 flex -translate-x-1/2 gap-1 rounded-full border border-white/20 bg-white/10 px-1.5 py-1.5 backdrop-blur-md  max-[1025px]:px-3 max-[1025px]:py-2  max-md:px-2 max-md:py-1.5">
      {VERSIONS.map((variant) => {
        const isActive = activeVariant === variant.value;

        return (
          <button
            key={variant.value}
            type="button"
            onClick={() => onVariantChange(variant.value)}
            className={`rounded-full px-5 py-1.5 text-sm font-semibold tracking-widest transition-all duration-200 max-[1025px]:text-lg max-md:text-sm ${
              isActive
                ? "bg-white text-black"
                : "text-white/70 hover:text-white"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </nav>
  );
}
