"use client";

import { twMerge } from "tailwind-merge";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";

const TONES = {
  // On dark surfaces (the listing's trending row)
  dark: "border-white/40 text-white",
  // On light surfaces (the effect page's related effects, on white)
  light: "border-black/20 text-[#141414]",
};

/**
 * Prev / next arrow for horizontal sliders - shared by the effects listing's trending
 * row and the effect page's related effects. Blurred glass square that fills orange on
 * hover, while the arrow slides out and an identical one slides in behind it.
 */
export function SliderArrowButton({ direction = "next", onClick, disabled = false, ariaLabel, tone = "dark", className = "" }) {
  const isPrev = direction === "prev";
  // ArrowIcon points up-right; these turn it to point left / right.
  const rotate = isPrev ? "-rotate-135" : "rotate-45";
  const out = isPrev ? "group-hover:translate-x-[-180%]" : "group-hover:translate-x-[180%]";
  const inFrom = isPrev ? "translate-x-[180%]" : "translate-x-[-180%]";
  const motion = disabled ? "" : "duration-300 ease-in-out";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? (isPrev ? "Previous" : "Next")}
      // twMerge so `className` can replace the default 44px size (e.g. to match a Button beside it).
      className={twMerge(
        `group relative grid size-11 cursor-pointer place-items-center overflow-hidden border backdrop-blur-lg transition-colors duration-400 ease-out hover:border-primary hover:bg-primary hover:text-black disabled:pointer-events-none disabled:opacity-40 ${TONES[tone] ?? TONES.dark}`,
        className,
      )}
    >
      <ArrowIcon className={`size-4.5 ${rotate} ${disabled ? "" : out} ${motion}`} />
      <ArrowIcon className={`absolute size-4.5 ${rotate} ${inFrom} ${disabled ? "" : "group-hover:translate-x-0"} ${motion}`} />
    </button>
  );
}
