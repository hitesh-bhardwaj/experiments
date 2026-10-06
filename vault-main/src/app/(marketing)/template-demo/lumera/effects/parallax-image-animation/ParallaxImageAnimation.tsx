// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import gsap from "gsap";
import Image from "next/image";
import type { StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { prefersReducedMotion } from "../../reducedMotion";

gsap.registerPlugin(ScrollTrigger);

const REDUCED_MOTION_FACTOR = 0.25;

function reduceOffset(value: string | number, factor: number) {
  if (typeof value !== "string") return value;
  const match = value.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return value;
  const [, numeric, unit] = match;
  return `${(parseFloat(numeric) * factor).toFixed(2)}${unit}`;
}

function reduceScale(value: number, factor: number) {
  if (typeof value !== "number") return value;
  return 1 + (value - 1) * factor;
}

interface ParallaxImageAnimationProps {
  src: string | StaticImageData;
  alt?: string;
  wrapperClassName?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
  translateY?: string | number;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  enableScale?: boolean;
  scaleFrom?: number;
  scaleTo?: number;
  quality?: number;
}

export default function ParallaxImageAnimation({
  src,
  alt = "parallax-img",
  wrapperClassName = "h-[50vh] w-[50vw]",
  imageClassName = "",
  width = 700,
  height = 1000,
  translateY = "40%",
  start = "top bottom",
  end = "bottom top",
  scrub = true,
  enableScale = false,
  scaleFrom = 1.6,
  scaleTo = 1.2,
  quality = 90,
}: ParallaxImageAnimationProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const reducedMotion = prefersReducedMotion();
  const effectiveTranslateY = reducedMotion
    ? reduceOffset(translateY, REDUCED_MOTION_FACTOR)
    : translateY;
  const effectiveScaleFrom = reducedMotion
    ? reduceScale(scaleFrom, REDUCED_MOTION_FACTOR)
    : scaleFrom;
  const effectiveScaleTo = reducedMotion
    ? reduceScale(scaleTo, REDUCED_MOTION_FACTOR)
    : scaleTo;

  useEffect(() => {
    if (!wrapperRef.current || !imageRef.current) return;

    const ctx = gsap.context(() => {
      gsap.set(imageRef.current, {
        scale: enableScale ? effectiveScaleFrom : undefined,
      });

      gsap.to(imageRef.current, {
        translateY: effectiveTranslateY,
        scale: enableScale ? effectiveScaleTo : undefined,
        ease: "none",
        scrollTrigger: {
          trigger: wrapperRef.current,
          start,
          end,
          scrub,
        },
      });
    }, wrapperRef);

    return () => ctx.revert();
  }, [
    effectiveTranslateY,
    start,
    end,
    scrub,
    enableScale,
    effectiveScaleFrom,
    effectiveScaleTo,
  ]);

  return (
    <div ref={wrapperRef} className={`overflow-hidden ${wrapperClassName}`}>
      <Image
        ref={imageRef}
        width={width}
        height={height}
        src={src}
        alt={alt}
        quality={quality}
        className={`h-full w-full object-cover ${imageClassName}`}
      />
    </div>
  );
}
