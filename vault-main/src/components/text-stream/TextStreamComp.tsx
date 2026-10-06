"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useIsMobile } from "./hooks";

const BASE_SPEED = 0.6;

interface TextStreamCompProps {
  items?: string[];
  speed?: number;
  stagger?: number;
  textColor?: string;
  backgroundColor?: string;
  autoplay?: boolean;
  runOnScroll?: boolean;
}

export default function TextStreamComp({
  items = [],
  speed = 1,
  stagger = 0.08,
  textColor = "#ffffff",
  backgroundColor = "#000000",
  autoplay = true,
  runOnScroll = true,
}: TextStreamCompProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [copyCount, setCopyCount] = useState(2);
  const isMobile = useIsMobile();

  const metricsRef = useRef({
    currentY: 0,
    distance: 0,
    currentVelocity: BASE_SPEED,
    targetVelocity: BASE_SPEED,
    lastScrollDirection: 1,
  });

  const scrollTimeoutRef = useRef<any>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const content = contentRef.current;
    const container = containerRef.current;

    if (!track || !content || !container) {
      return undefined;
    }

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const safeSpeed = Math.max(0, Number(speed) || 0);
    const safeStagger = Math.max(0, Number(stagger) || 0);
    const idleSpeed = prefersReducedMotion ? 0 : BASE_SPEED * safeSpeed;
    const velocityLerpFactor = prefersReducedMotion ? 1 : 0.14;

    metricsRef.current.currentVelocity = idleSpeed;
    metricsRef.current.targetVelocity = idleSpeed;

    const ctx = gsap.context(() => {
      const maxBoost = prefersReducedMotion ? 4 : 12;
      const boostScale = prefersReducedMotion ? 0.03 : 0.08;
      let lastScrollY = window.scrollY;

      const startAnimation = () => {
        const distance = content.offsetHeight;
        const containerHeight = container.offsetHeight;

        if (!distance || !containerHeight) return;

        const nextCopyCount = Math.max(
          2,
          Math.ceil(containerHeight / distance) + 2
        );

        setCopyCount((currentCount) =>
          currentCount === nextCopyCount ? currentCount : nextCopyCount
        );

        metricsRef.current.distance = distance;

        if (metricsRef.current.currentY <= -distance) {
          metricsRef.current.currentY += distance;
        } else if (metricsRef.current.currentY > 0) {
          metricsRef.current.currentY -= distance;
        }

        gsap.set(track, { y: metricsRef.current.currentY });
      };

      const tick = (_: number, deltaTime: number) => {
        const { distance } = metricsRef.current;

        if (!distance) return;

        const frameFactor = deltaTime / (1000 / 60);

        metricsRef.current.currentVelocity = gsap.utils.interpolate(
          metricsRef.current.currentVelocity,
          metricsRef.current.targetVelocity,
          velocityLerpFactor
        );

        if (autoplay) {
          metricsRef.current.currentY +=
            metricsRef.current.currentVelocity * frameFactor;
        }

        if (metricsRef.current.currentY <= -distance) {
          metricsRef.current.currentY += distance;
        } else if (metricsRef.current.currentY >= 0) {
          metricsRef.current.currentY -= distance;
        }

        gsap.set(track, { y: metricsRef.current.currentY });
      };

      const applyScrollMotion = (delta: number) => {
        if (!delta) return;

        const direction = delta > 0 ? -1 : 1;

        const boost = Math.min(
          maxBoost,
          idleSpeed + Math.pow(Math.abs(delta), 1.2) * boostScale
        );

        metricsRef.current.lastScrollDirection = direction;
        if (runOnScroll) {
          metricsRef.current.targetVelocity = direction * boost;
          metricsRef.current.currentY += metricsRef.current.targetVelocity * Math.max(1, safeStagger * 24);
        }

        window.clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = window.setTimeout(() => {
          metricsRef.current.targetVelocity =
            metricsRef.current.lastScrollDirection * idleSpeed;
        }, 120);
      };

      const handleWheel = (event: WheelEvent) => {
        applyScrollMotion(event.deltaY);
      };

      const handleScroll = () => {
        const nextScrollY = window.scrollY;
        const delta = nextScrollY - lastScrollY;

        lastScrollY = nextScrollY;

        applyScrollMotion(delta);
      };

      startAnimation();

      gsap.ticker.add(tick);

      const resizeObserver = new ResizeObserver(startAnimation);

      resizeObserver.observe(content);
      resizeObserver.observe(container);

      window.addEventListener("resize", startAnimation);
      if (runOnScroll) {
        window.addEventListener("wheel", handleWheel, {
          passive: true,
        });

        window.addEventListener("scroll", handleScroll, {
          passive: true,
        });
      }

      return () => {
        resizeObserver.disconnect();

        window.removeEventListener("resize", startAnimation);
        if (runOnScroll) {
          window.removeEventListener("wheel", handleWheel);
          window.removeEventListener("scroll", handleScroll);
        }

        window.clearTimeout(scrollTimeoutRef.current);

        gsap.ticker.remove(tick);
      };
    });

    return () => ctx.revert();
  }, [autoplay, runOnScroll, speed, stagger]);

  const revealMask = isMobile
    ? "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 49%, rgba(0,0,0,1) 49%, rgba(0,0,0,1) 52%, rgba(0,0,0,0.2) 52%, rgba(0,0,0,0.2) 100%)"
    : "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 48%, rgba(0,0,0,1) 48%, rgba(0,0,0,1) 53%, rgba(0,0,0,0.3) 53%, rgba(0,0,0,0.3) 100%)";

  if (!items.length) return null;
  const linePadding = `${Math.max(0.15, 0.25 + Number(stagger) || 0.25)}rem`;

  return (
    <div className="flex h-screen" style={{ backgroundColor, color: textColor }}>
      <div className="w-[45%] flex max-md:w-[30%] max-[1025px]:w-[35%] items-center justify-end pr-2">
        <p className="max-md:text-xl text-4xl font-extralight leading-none whitespace-nowrap">
          Hyperiux
        </p>
      </div>

      <div
        ref={containerRef}
        className="relative w-[55%] max-[1025px]:w-[65%] max-md:w-[70%] h-full overflow-hidden "
        style={{
          maskImage: revealMask,
          WebkitMaskImage: revealMask,
        }}
      >
        <div
          ref={trackRef}
          className="absolute left-0 top-0 flex flex-col max-md:text-xl text-4xl font-extralight leading-none"
        >
          {Array.from({ length: copyCount }, (_, copyIndex) => (
            <div
              key={copyIndex}
              ref={copyIndex === 0 ? contentRef : null}
              className="flex flex-col"
              aria-hidden={copyIndex === 1}
            >
              {items.map((text: string, i: number) => (
                <div
  key={`${copyIndex}-${i}`}
  className="
    py-1
    pl-2
    whitespace-nowrap
    max-[1025px]:whitespace-normal
    max-[1025px]:wrap-break-word
    max-md:pr-3
    max-[1025px]:max-w-full
  "
  style={{ paddingTop: linePadding, paddingBottom: linePadding }}
>
                  {text}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
