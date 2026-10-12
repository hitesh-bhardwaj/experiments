"use client";

import { twMerge } from "tailwind-merge";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";
import Button from "@/homepage/components/Button";

const TONES = {
  // On dark surfaces (the listing's trending row)
  dark: "border-white/40 text-white",
  // On light surfaces (the effect page's related effects and the blog's related posts)
  light: "border-black/20 text-[#141414]",
};

/**
 * Prev / next arrow for horizontal sliders - shared by the effects listing's trending
 * row, the effect page's related effects and the blog's related posts. Blurred glass
 * square that fills orange on hover, while the arrow slides out and an identical one
 * slides in behind it.
 *
 * Each arrow sits in its own full-size layer that moves by the button's whole width,
 * so the waiting arrow is always fully outside the box - at any button size (an
 * offset based on the icon's own width left it peeking in on large screens).
 */
export function SliderArrowButton({ direction = "next", onClick, disabled = false, ariaLabel, tone = "dark", className = "" }) {
  const isPrev = direction === "prev";
  // ArrowIcon points up-right; these turn it to point left / right.
  const rotate = isPrev ? "-rotate-135" : "rotate-45";
  const out = isPrev ? "group-hover:-translate-x-full" : "group-hover:translate-x-full";
  const inFrom = isPrev ? "translate-x-full" : "-translate-x-full";
  const motion = disabled ? "" : "transition-transform duration-300 ease-in-out";
  const layer = "pointer-events-none absolute inset-0 grid place-items-center";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? (isPrev ? "Previous" : "Next")}
      // twMerge so `className` can replace the default 44px size.
      className={twMerge(
        `group relative size-11 shrink-0 cursor-pointer overflow-hidden border backdrop-blur-lg transition-colors duration-400 ease-out hover:border-primary hover:bg-primary hover:text-black disabled:pointer-events-none disabled:opacity-40 ${TONES[tone] ?? TONES.dark}`,
        className,
      )}
    >
      <span aria-hidden="true" className={`${layer} ${disabled ? "" : out} ${motion}`}>
        <ArrowIcon className={`size-4.5 ${rotate}`} />
      </span>
      <span aria-hidden="true" className={`${layer} ${inFrom} ${disabled ? "" : "group-hover:translate-x-0"} ${motion}`}>
        <ArrowIcon className={`size-4.5 ${rotate}`} />
      </span>
    </button>
  );
}

/**
 * "Explore all …" button with the prev / next arrows beside it - the header control of
 * the related-effects and related-blogs sliders. The arrows stretch to the button's
 * height and stay square, so the three line up at every screen size.
 */
export function SliderNav({
  exploreText,
  exploreHref,
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  showArrows = true,
  prevLabel = "Previous",
  nextLabel = "Next",
  tone = "light",
  className = "",
}) {
  // Square, at the Explore button's height: it stretches to the row, and its width is
  // Button's desktop height (text 1.15vw x 1.5 line height + py-2). The nav is hidden
  // below lg, where Button's text size changes.
  const arrow = "h-auto self-stretch w-[calc(var(--hx-vw,1vw)*1.725+1rem)]";
  return (
    <div className={twMerge("flex items-stretch gap-[0.5vw]", className)}>
      {exploreText && <Button text={exploreText} href={exploreHref} variant="orange" className="shrink-0" />}
      {showArrows && (
        <>
          <SliderArrowButton direction="prev" tone={tone} onClick={onPrev} disabled={!canPrev} ariaLabel={prevLabel} className={arrow} />
          <SliderArrowButton direction="next" tone={tone} onClick={onNext} disabled={!canNext} ariaLabel={nextLabel} className={arrow} />
        </>
      )}
    </div>
  );
}
