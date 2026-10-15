// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { gsap } from "gsap";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { useEffect, useRef } from "react";

gsap.registerPlugin(InertiaPlugin);

interface InertiaImageCompProps {
  images?: string[];
  strength?: number;
  rotation?: number;
  scale?: number;
  duration?: number;
}

function InertiaImageComp({
  images = [],
  strength = 1,
  rotation = 0,
  scale = 1,
  duration = 0.4,
}: InertiaImageCompProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const deltaRef = useRef<{ x: number, y: number, oldX: number | null, oldY: number | null }>({ x: 0, y: 0, oldX: null, oldY: null });
  const isTouchRef = useRef(false);
  const resolvedStrength = Math.max(0, Number(strength) || 0);
  const resolvedRotation = Math.max(0, Number(rotation) || 0);
  const resolvedScale = Math.max(0, Number(scale) || 0);
  const resolvedDuration = Math.max(0, Number(duration) || 0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (typeof window !== "undefined") {
      isTouchRef.current = window.matchMedia("(hover: none), (pointer: coarse)").matches || 
                           ('ontouchstart' in window) || 
                           (navigator.maxTouchPoints > 0);
    }

    const detectTouch = () => {
      isTouchRef.current = true;
    };
    window.addEventListener("touchstart", detectTouch, { passive: true });

    const onMouseMove = (e: MouseEvent) => {
      const d = deltaRef.current;
      if (d.oldX === null || d.oldY === null) {
        d.oldX = e.clientX;
        d.oldY = e.clientY;
        d.x = 0;
        d.y = 0;
        return;
      }
      d.x = e.clientX - d.oldX;
      d.y = e.clientY - d.oldY;
      d.oldX = e.clientX;
      d.oldY = e.clientY;
    };

    const onTouchStart = (e: TouchEvent) => {
      isTouchRef.current = true;
      const touch = e.touches[0];
      const d = deltaRef.current;
      d.oldX = touch.clientX;
      d.oldY = touch.clientY;
      d.x = 0;
      d.y = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      isTouchRef.current = true;
      const touch = e.touches[0];
      const d = deltaRef.current;
      d.x = touch.clientX - (d.oldX as number);
      d.y = touch.clientY - (d.oldY as number);
      d.oldX = touch.clientX;
      d.oldY = touch.clientY;
    };

    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });

    const mediaEls = root.querySelectorAll(".media-item");
    const cleanups: (() => void)[] = [];

    mediaEls.forEach((el) => {
      const onMouseEnter = () => {
        const image = el.querySelector("img");
        const { x, y } = deltaRef.current;

        const isTouch = isTouchRef.current;
        const velocityMultiplier = (isTouch ? 2 : 30) * resolvedStrength;
        const rotationRange = isTouch ? resolvedRotation * (50 / 60) : resolvedRotation;

        const tl = gsap.timeline({
          onComplete: () => tl.kill(),
        });
        tl.timeScale(1.2);

        tl.to(image, {
          duration: resolvedDuration,
          inertia: {
            x: { velocity: x * velocityMultiplier, end: 0 },
            y: { velocity: y * velocityMultiplier, end: 0 },
          },
        });

        tl.fromTo(
          image,
          { rotate: 0, scale: 1 },
          {
            duration: resolvedDuration,
            rotate: (Math.random() - 0.5) * rotationRange,
            scale: resolvedScale,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut",
          },
          "<"
        );
      };

      el.addEventListener("mouseenter", onMouseEnter);
      cleanups.push(() => el.removeEventListener("mouseenter", onMouseEnter));
    });

    return () => {
      window.removeEventListener("touchstart", detectTouch);
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      cleanups.forEach((fn) => fn());
    };
  }, [resolvedDuration, resolvedRotation, resolvedScale, resolvedStrength]);

 return (
 <>
 <section
 ref={rootRef}
 className="relative grid min-h-screen w-full place-items-center "
 >
 <div className="grid grid-cols-4 gap-[1vw] max-lg:gap-[8vw] max-md:gap-[5vw] max-lg:grid-cols-3 max-md:grid-cols-2">
 {images.map((src, i) => (
 <div
 key={i}
 className="media-item relative h-[12vw] w-[12vw] max-lg:h-[22vw] max-lg:w-[22vw] max-md:h-[35vw] max-md:w-[35vw]"
 >
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img src={src} alt="asset-image" className="absolute inset-0 pointer-events-none block rounded-[4%] object-contain will-change-transform" />
 </div>
 ))}
 </div>
 </section>

 </>
 );
}

const images = [
   "https://picsum.photos/seed/1/800/600",
    "https://picsum.photos/seed/2/800/600",
    "https://picsum.photos/seed/3/800/600",
    "https://picsum.photos/seed/4/800/600",
    "https://picsum.photos/seed/5/800/600",
    "https://picsum.photos/seed/6/800/600",
    "https://picsum.photos/seed/7/800/600",
    "https://picsum.photos/seed/8/800/600",
    "https://picsum.photos/seed/9/800/600",
    "https://picsum.photos/seed/10/800/600",
    "https://picsum.photos/seed/11/800/600",
    "https://picsum.photos/seed/12/800/600",
];

const InertiaImage = ({
  strength = 1,
  rotation = 0,
  scale = 1,
  duration = 0.4,
}) => {

  return (
    <>
      <InertiaImageComp
        images={images}
        strength={strength}
        rotation={rotation}
        scale={scale}
        duration={duration}
      />
    </>
  )
}

export default InertiaImage
