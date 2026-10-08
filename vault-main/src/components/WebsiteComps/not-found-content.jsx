"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import { useFadeUp } from "../Animations/gsapAnimations";
import Button from "@/homepage/components/Button";

const SHIMMER_ANGLE = -45;
const SHIMMER_BASE_COLOR = "#272727";
const SHIMMER_COLOR = "#ffffff";
const SHIMMER_BG_WIDTH_PERCENT = 600;

const SHIMMER_HALF_WIDTH = 0.3;

const SHIMMER_CYCLE_SHIFT =
  (100 * SHIMMER_BG_WIDTH_PERCENT) / (SHIMMER_BG_WIDTH_PERCENT - 100);
const SHIMMER_START_POSITION = 50 + SHIMMER_CYCLE_SHIFT / 2;
const SHIMMER_END_POSITION = 50 - SHIMMER_CYCLE_SHIFT / 2;

function mixHexColors(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function smoothstep01(t) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

function buildShimmerGradient() {
  const steps = 64;
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const pos = x * 100;
    const d = Math.abs(x - 0.5) / SHIMMER_HALF_WIDTH;
    const intensity = d >= 1 ? 0 : 1 - smoothstep01(d);
    stops.push(`${mixHexColors(SHIMMER_BASE_COLOR, SHIMMER_COLOR, intensity)} ${pos.toFixed(2)}%`);
  }
  return `linear-gradient(${SHIMMER_ANGLE}deg, ${stops.join(", ")})`;
}

function NotFoundShimmerText({ children, className = "" }) {
  const shimmerRef = useRef(null);
  useFadeUp()

  useLayoutEffect(() => {
    const shimmerEl = shimmerRef.current;
    if (!shimmerEl) return;

    gsap.set(shimmerEl, {
      color: "transparent",
      backgroundImage: buildShimmerGradient(),
      backgroundSize: `${SHIMMER_BG_WIDTH_PERCENT}% 100%`,
      backgroundPosition: `${SHIMMER_BG_WIDTH_PERCENT}% 0%`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      willChange: "background-position",
    });

    const shimmerTimeline = gsap.timeline({ repeat: -1 });

    shimmerTimeline
      .set(shimmerEl, { backgroundPosition: `${SHIMMER_START_POSITION}% 0%` })
      .to(shimmerEl, {
        backgroundPosition: `${SHIMMER_END_POSITION}% 0%`,
        duration: 4,
        ease: "none",
      })
      .to({}, { duration: 1 });

    return () => {
      shimmerTimeline.kill();
      gsap.set(shimmerEl, {
        clearProps: "color,backgroundImage,backgroundSize,backgroundPosition,backgroundClip,WebkitBackgroundClip,WebkitTextFillColor,willChange",
      });
    };
  }, []);

  return (
    <span ref={shimmerRef} className={className}>
      {children}
    </span>
  );
}

export default function NotFoundContent() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="max-w-2xl text-center">
        <NotFoundShimmerText className="text-[20vw] text-center uppercase font-semibold font-laygrotesk leading-none max-md:text-[34vw] max-lg:text-[25vw] fadeup">
          404
        </NotFoundShimmerText>
        <SplitLine>
        <h1 className="mt-4 text-2xl font-medium">Page not found</h1>
        </SplitLine>
        <SplitLine>
        <p className="mt-4 text-foreground/70">
          The page you requested does not exist or may have moved.
        </p>
        </SplitLine>
        <div className="mt-8 mx-auto w-fit fadeup">
          <Button
            href="/"
            text="Return home"
            className="w-fit"
          />

        </div>
      </div>
    </main>
  );
}
