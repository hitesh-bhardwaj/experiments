// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

import portfolio1 from "./assets/portfolio-img-new-1.webp";
import portfolio2 from "./assets/portfolio-img-new-2.webp";
import portfolio3 from "./assets/portfolio-img-new-3.webp";
import portfolio4 from "./assets/portfolio-img-new-4.webp";
import portfolio5 from "./assets/portfolio-img-new-5.webp";

gsap.registerPlugin(Draggable, InertiaPlugin);

export interface CarouselSlide {
  src: string | StaticImageData;
  alt?: string;
}

const DEFAULT_SLIDES: CarouselSlide[] = [
  { src: portfolio1, alt: "Waterfront landmark" },
  { src: portfolio2, alt: "Serene interiors" },
  { src: portfolio3, alt: "Architectural identity" },
  { src: portfolio4, alt: "Wellness retreat" },
  { src: portfolio5, alt: "Poolside living" },
];

/**
 * Every measurement is expressed in `vw` so the whole carousel scales with the
 * viewport, then converted to px once per resize for the transform maths.
 */
interface Metrics {
  smallW: number;
  smallH: number;
  centerW: number;
  centerH: number;
  gap: number;
}

const DESKTOP: Metrics = {
  smallW: 11.5,
  smallH: 14.5,
  centerW: 21,
  centerH: 28.5,
  gap: 5.5,
};
const TABLET: Metrics = {
  smallW: 18,
  smallH: 23,
  centerW: 34,
  centerH: 45,
  gap: 6,
};
const MOBILE: Metrics = {
  smallW: 26,
  smallH: 33,
  centerW: 54,
  centerH: 70,
  gap: 6,
};

interface PixelMetrics extends Metrics {
  /** Centre-to-centre distance between two neighbouring side slides. */
  unit: number;
  /** Extra outward push the enlarged centre slide adds to its neighbours. */
  extra: number;
  /** Half the stage's own width - the clip edge slides are hidden beyond. */
  stageHalf: number;
}

const metricsFor = (width: number): Metrics => {
  if (width <= 640) return MOBILE;
  if (width <= 1024) return TABLET;
  return DESKTOP;
};

const toPixels = (
  m: Metrics,
  viewportWidth: number,
  stageWidth: number,
): PixelMetrics => {
  const vw = viewportWidth / 100;
  const unit = m.smallW + m.gap;
  return {
    stageHalf: stageWidth / 2,
    smallW: m.smallW * vw,
    smallH: m.smallH * vw,
    centerW: m.centerW * vw,
    centerH: m.centerH * vw,
    gap: m.gap * vw,
    unit: unit * vw,
    // Neighbours of the centre sit half-a-centre + gap + half-a-side away, so
    // anything beyond the plain `unit` spacing is the centre's extra bulk.
    extra: (m.centerW / 2 + m.gap + m.smallW / 2 - unit) * vw,
  };
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

interface InfiniteCarouselCompProps {
  slides?: CarouselSlide[];
  initialIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  draggable?: boolean;
  showNav?: boolean;
  className?: string;
}

export default function InfiniteCarouselComp({
  slides = DEFAULT_SLIDES,
  initialIndex = 0,
  onActiveIndexChange,
  draggable = true,
  showNav = true,
  className = "",
}: InfiniteCarouselCompProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pxRef = useRef<PixelMetrics>(toPixels(DESKTOP, 1440, 1440));
  const progressRef = useRef({ value: initialIndex });
  const lastIndexRef = useRef(-1);
  const draggedRef = useRef(false);
  const draggableRef = useRef<Draggable | null>(null);

  const [activeIndex, setActiveIndex] = useState(
    slides.length
      ? ((initialIndex % slides.length) + slides.length) % slides.length
      : 0,
  );
  const [ready, setReady] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // The wrap point has to sit off-screen, which needs at least ~7 rendered
  // slides; short lists are repeated until they clear that bar.
  const items = useMemo(() => {
    if (!slides.length)
      return [] as {
        slide: CarouselSlide;
        sourceIndex: number;
        copy: number;
      }[];
    const repeat = slides.length >= 7 ? 1 : Math.ceil(7 / slides.length);
    return Array.from({ length: slides.length * repeat }, (_, i) => ({
      slide: slides[i % slides.length],
      sourceIndex: i % slides.length,
      copy: Math.floor(i / slides.length),
    }));
  }, [slides]);

  const count = items.length;

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, count);
  }, [count]);

  useEffect(() => {
    onActiveIndexChange?.(activeIndex);
  }, [activeIndex, onActiveIndexChange]);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;

    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /** Positions, sizes and stacking for every slide from the current progress. */
  const render = useCallback(() => {
    if (!count) return;

    const px = pxRef.current;
    const wrapOffset = gsap.utils.wrap(-count / 2, count / 2);
    const progress = progressRef.current.value;

    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;

      const offset = wrapOffset(i - progress);
      const distance = Math.abs(offset);
      const near = Math.min(distance, 1);
      const centerness = smoothstep(1 - near);

      const x =
        offset * px.unit + Math.sign(offset) * smoothstep(near) * px.extra;
      const width = px.smallW + (px.centerW - px.smallW) * centerness;

      // Slides never fade - they'd be visibly translucent inside the stage.
      // They only wink out once their near edge has passed the clip boundary,
      // by which point overflow-hidden already hides them completely.
      const clipped = Math.abs(x) - width / 2 >= px.stageHalf;

      gsap.set(el, {
        // Centring lives here rather than in a Tailwind translate class because
        // GSAP owns the element's `transform` once it starts writing to it.
        xPercent: -50,
        yPercent: -50,
        x,
        width,
        height: px.smallH + (px.centerH - px.smallH) * centerness,
        zIndex: 100 - Math.round(distance * 10),
        opacity: 1,
        visibility: clipped ? "hidden" : "visible",
      });
    }

    const centered = ((Math.round(progress) % count) + count) % count;
    if (centered !== lastIndexRef.current) {
      lastIndexRef.current = centered;
      setActiveIndex(items[centered]?.sourceIndex ?? 0);
    }
  }, [count, items]);

  const measure = useCallback(() => {
    // Sizes are viewport-relative, but the clip boundary is the stage's own box,
    // which may be narrower than the viewport depending on where it's used.
    const viewport = window.innerWidth;
    const stageWidth = stageRef.current?.clientWidth || viewport;
    pxRef.current = toPixels(metricsFor(viewport), viewport, stageWidth);
    render();
  }, [render]);

  useEffect(() => {
    measure();
    setReady(true);

    window.addEventListener("resize", measure);

    const stage = stageRef.current;
    const observer = stage ? new ResizeObserver(measure) : null;
    if (stage && observer) observer.observe(stage);

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [measure]);

  const goTo = useCallback(
    (target: number) => {
      // A throw in flight also writes to progress, so it has to go first or the
      // two would fight over the same value.
      draggableRef.current?.tween?.kill();
      gsap.killTweensOf(progressRef.current);
      gsap.to(progressRef.current, {
        value: target,
        duration: reduceMotion ? 0.2 : 0.8,
        ease: reduceMotion ? "power1.out" : "power3.out",
        onUpdate: render,
      });
    },
    [reduceMotion, render],
  );

  const step = useCallback(
    (direction: number) =>
      goTo(Math.round(progressRef.current.value) + direction),
    [goTo],
  );

  useEffect(() => {
    if (!draggable || !count || !stageRef.current) return;

    const proxy = document.createElement("div");
    let startX = 0;
    let startProgress = 0;

    const align = (instance: Draggable) => {
      progressRef.current.value =
        startProgress - (instance.x - startX) / pxRef.current.unit;
      render();
    };

    const instance = Draggable.create(proxy, {
      trigger: stageRef.current,
      type: "x",
      inertia: !reduceMotion,
      allowNativeTouchScrolling: false,
      onPress(this: Draggable) {
        gsap.killTweensOf(progressRef.current);
        startX = this.x;
        startProgress = progressRef.current.value;
        draggedRef.current = false;
      },
      onDrag(this: Draggable) {
        draggedRef.current = true;
        align(this);
      },
      onThrowUpdate(this: Draggable) {
        align(this);
      },
      snap(value: number) {
        const projected = startProgress - (value - startX) / pxRef.current.unit;
        return (
          startX - (Math.round(projected) - startProgress) * pxRef.current.unit
        );
      },
      onRelease() {
        // With inertia on, `snap` lands the throw on a whole slide for us.
        if (reduceMotion) goTo(Math.round(progressRef.current.value));
      },
      onThrowComplete() {
        progressRef.current.value = Math.round(progressRef.current.value);
        render();
      },
    })[0];

    draggableRef.current = instance;

    return () => {
      instance.kill();
      draggableRef.current = null;
    };
  }, [draggable, count, reduceMotion, render, goTo]);

  const activeSlide = slides[activeIndex];
  const announcement = slides.length
    ? `${activeSlide?.alt ? `${activeSlide.alt}, ` : ""}slide ${activeIndex + 1} of ${slides.length}`
    : "";

  if (!count) return null;

  return (
    <div className={`relative w-full select-none ${className}`}>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div
        ref={stageRef}
        /* A touch taller than the centre slide so its border never clips. */
        className={`relative h-[30vw] w-full overflow-hidden transition-opacity duration-500 max-[1024px]:h-[47vw] max-md:h-[73vw] ${
          draggable ? "cursor-grab active:cursor-grabbing" : ""
        } ${ready ? "opacity-100" : "opacity-0"}`}
      >
        {items.map((item, i) => (
          <div
            key={`${item.sourceIndex}-${item.copy}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            onClick={() => {
              if (draggedRef.current) return;
              const wrapOffset = gsap.utils.wrap(-count / 2, count / 2);
              const offset = wrapOffset(i - progressRef.current.value);
              if (Math.abs(offset) > 0.1)
                goTo(progressRef.current.value + offset);
            }}
            aria-hidden={item.copy > 0}
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-full border-[1.5px] border-[#CA8216] will-change-transform"
          >
            <Image
              src={item.slide.src}
              alt={item.slide.alt ?? ""}
              fill
              placeholder="empty"
              sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 35vw"
              draggable={false}
              priority={item.copy === 0 && item.sourceIndex < 3}
              className="pointer-events-none h-full w-full object-cover"
            />
          </div>
        ))}
      </div>

      {showNav && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => step(-1)}
            className="absolute  bottom-[-53%] group left-[calc(50%-2vw)] z-200 flex size-[3vw] -translate-x-1/2 -translate-y-1/2 items-center border border-black justify-center rounded-full text-black   transition-colors  max-[1024px]:left-[calc(50%-6vw)] max-md:left-[calc(50%-8vw)] max-[1024px]:bottom-[-70%] max-md:bottom-[-60%] max-[1024px]:size-[6vw]  max-md:size-[11vw]"
          >
            <svg
              className="size-4 relative group-hover:text-white duration-300 ease-in-out"
              width="22"
              height="15"
              viewBox="0 0 24 14"
              fill="none"
              
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.92891 14.3595C8.14461 14.3595 8.36032 14.2867 8.53061 14.1309C8.85983 13.8295 8.85983 13.3308 8.53061 13.0294L2.24121 7.27302L8.53061 1.51662C8.85983 1.21529 8.85983 0.716535 8.53061 0.415206C8.20138 0.113877 7.65645 0.113877 7.32722 0.415206L0.43613 6.72232C0.106902 7.02365 0.106902 7.5224 0.43613 7.82373L7.32722 14.1309C7.49751 14.2867 7.71321 14.3595 7.92891 14.3595Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.378445"
              />
              <path
                d="M1.23135 8.04981L20.3379 8.04981C20.8034 8.04981 21.1894 7.69653 21.1894 7.27051C21.1894 6.84449 20.8034 6.49121 20.3379 6.49121L1.23135 6.49121C0.765886 6.49121 0.379896 6.84449 0.379896 7.27051C0.379896 7.69653 0.765886 8.04981 1.23135 8.04981Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.378445"
              />
            </svg>
            <span className="bg-black rounded-full scale-0 absolute origin-center group-hover:scale-100 w-full h-full duration-300 ease-in-out z-[-1]"/>
          </button>

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => step(1)}
            className="absolute bottom-[-53%] group border border-black left-[calc(50%-1vw)] z-200 flex size-[3vw] translate-x-1/2 -translate-y-1/2  items-center justify-center rounded-full  text-black transition-colors max-[1024px]:left-[calc(50%-3vw)] max-[1024px]:bottom-[-70%] max-md:bottom-[-60%]  max-md:left-[calc(50%-5vw)]  max-[1024px]:size-[6vw]  max-md:size-[11vw]"
          >
            <svg
              className="size-4 relative group-hover:text-white duration-300 ease-in-out"
              width="22"
              height="15"
              viewBox="0 0 22 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.4497 14.3595C13.234 14.3595 13.0183 14.2867 12.848 14.1309C12.5188 13.8295 12.5188 13.3308 12.848 13.0294L19.1374 7.27302L12.848 1.51662C12.5188 1.21529 12.5188 0.716535 12.848 0.415206C13.1772 0.113877 13.7222 0.113877 14.0514 0.415206L20.9425 6.72232C21.2717 7.02365 21.2717 7.5224 20.9425 7.82373L14.0514 14.1309C13.8811 14.2867 13.6654 14.3595 13.4497 14.3595Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.378445"
              />
              <path
                d="M20.1473 8.04981L1.04066 8.04981C0.575201 8.04981 0.189209 7.69653 0.189209 7.27051C0.189209 6.84449 0.575201 6.49121 1.04066 6.49121L20.1473 6.49121C20.6127 6.49121 20.9987 6.84449 20.9987 7.27051C20.9987 7.69653 20.6127 8.04981 20.1473 8.04981Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.378445"
              />
            </svg>
            <span className="bg-black rounded-full scale-0 absolute origin-center group-hover:scale-100 w-full h-full duration-300 ease-in-out z-[-1]"/>

          </button>
        </>
      )}
    </div>
  );
}
