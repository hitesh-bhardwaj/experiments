"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createSuspendedRaf } from "./createSuspendedRaf";

gsap.registerPlugin(ScrollTrigger);

export interface TextHoverItem {
  label: string;
  description: string;
}

const CornerSVG = ({ className, style }: { className?: string, style?: CSSProperties }) => (
  <svg
    className={className}
    style={style}
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.499951 0.199996L0.499952 9.2M0.199951 0.499995L9.19995 0.499995"
      stroke="currentColor"
    />
  </svg>
);

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const REDUCED_MOTION_MOVE_DURATION = 0.08;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

export interface TextHoverCompProps {
  data?: TextHoverItem[];
  bgColor?: string;
  textColor?: string;
  hoverColor?: string;
  duration?: number;
}

export default function TextHoverComp({
  data = [],
  bgColor = "#0a0a0a",
  textColor = "#ffffff",
  hoverColor = "#ffffff",
  duration = 0.35,
}: TextHoverCompProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const descriptionRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const refreshLoopRef = useRef<ReturnType<typeof createSuspendedRaf> | null>(null);
  const activationFrameRef = useRef<number | null>(null);
  const refreshStartRef = useRef<number | null>(null);
  const activeIndexRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const getCompact = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 1025;
  }, []);

  const measureHighlight = useCallback(
    (index: number) => {
    const content = contentRef.current;
    const el = itemRefs.current[index];
    const label = labelRefs.current[index];
    const description = descriptionRefs.current[index];

    if (!content || !el || !label) return null;

    const contentRect = content.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const descriptionRect = description?.getBoundingClientRect();

    const width = window.innerWidth;

    const isMobileViewport = width < 640;
    const isTabletViewport = width >= 640 && width < 1025;
    const isCompactViewport = width < 1025;

    const framePadding = isMobileViewport ? 30 : isTabletViewport ? 46 : 72;
    const minFrameHeight = isMobileViewport ? 82 : isTabletViewport ? 96 : 88;

    const widestRect =
      !isCompactViewport &&
      descriptionRect &&
      descriptionRect.width > labelRect.width
        ? descriptionRect
        : labelRect;

    const descriptionWidth = descriptionRect?.width || 0;
    const labelWidth = labelRect.width || 0;

    const compactMeasuredWidth =
      Math.max(labelWidth, descriptionWidth) + framePadding;

    const compactMaxWidth = isMobileViewport
      ? Math.min(contentRect.width - 34, 360)
      : Math.min(contentRect.width - 64, 580);

    const compactMinWidth = isMobileViewport ? 240 : 360;

    const frameWidth = isCompactViewport
      ? clamp(compactMeasuredWidth, compactMinWidth, compactMaxWidth)
      : widestRect.width + framePadding;

    const contentHeight = isCompactViewport
      ? Math.max(elRect.height - 18, minFrameHeight)
      : Math.max(elRect.height - 120, 0);

    const frameHeight = Math.max(contentHeight, minFrameHeight);

    const labelCenterX =
      labelRect.left - contentRect.left + labelRect.width / 2;

    const compactLeft = labelCenterX - frameWidth / 2;

    const minLeft = isMobileViewport ? 14 : 28;
    const maxLeft = contentRect.width - frameWidth - minLeft;

    const frameLeft = isCompactViewport
      ? clamp(compactLeft, minLeft, Math.max(minLeft, maxLeft))
      : widestRect.left -
        contentRect.left -
        (frameWidth - widestRect.width) / 2;

    const frameTop = isCompactViewport
      ? elRect.top - contentRect.top + (isMobileViewport ? 8 : 10)
      : elRect.top -
        contentRect.top +
        30 -
        (frameHeight - contentHeight) / 2;

    return {
      width: frameWidth,
      height: frameHeight + (isCompactViewport ? 22 : 60),
      x: frameLeft,
      y: frameTop,
    };
  }, []);

  const moveHighlight = useCallback(
    (index: number, instant = false) => {
      const highlight = highlightRef.current;
      const next = measureHighlight(index);

      if (!highlight || !next) return;

      gsap.to(highlight, {
        width: next.width,
        height: next.height,
        x: next.x,
        y: next.y,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: prefersReducedMotion
          ? REDUCED_MOTION_MOVE_DURATION
          : instant
          ? Math.min(0.22, duration)
          : duration,
        ease: "power3.out",
        overwrite: "auto",
      });
    },
    [duration, measureHighlight, prefersReducedMotion]
  );

  const startRefreshTracking = useCallback(
    (index: number) => {
      refreshLoopRef.current?.destroy();
      refreshLoopRef.current = null;

      refreshStartRef.current = performance.now();

      const loop = createSuspendedRaf({
        root: sectionRef,
        onFrame: () => {
          if (activeIndexRef.current !== index) {
            loop.destroy();
            if (refreshLoopRef.current === loop) {
              refreshLoopRef.current = null;
            }
            return;
          }

          moveHighlight(index, true);

          const elapsed = performance.now() - (refreshStartRef.current as number);

          if (elapsed >= 520) {
            loop.destroy();
            if (refreshLoopRef.current === loop) {
              refreshLoopRef.current = null;
            }
          }
        },
      });

      refreshLoopRef.current = loop;
      loop.start();
    },
    [moveHighlight]
  );

  const setActive = useCallback(
    (index: number) => {
      activeIndexRef.current = index;
      setActiveIndex(index);

      if (activationFrameRef.current) {
        cancelAnimationFrame(activationFrameRef.current);
      }

      activationFrameRef.current = requestAnimationFrame(() => {
        activationFrameRef.current = null;
        moveHighlight(index, false);
        startRefreshTracking(index);
      });
    },
    [moveHighlight, startRefreshTracking]
  );

  const clearActive = useCallback(() => {
    activeIndexRef.current = null;
    setActiveIndex(null);

    refreshLoopRef.current?.destroy();
    refreshLoopRef.current = null;

    if (activationFrameRef.current) {
      cancelAnimationFrame(activationFrameRef.current);
      activationFrameRef.current = null;
    }

    if (highlightRef.current) {
      gsap.to(highlightRef.current, {
        opacity: 0,
        scale: 1.14,
        filter: "blur(8px)",
        duration: prefersReducedMotion ? REDUCED_MOTION_MOVE_DURATION : Math.min(0.2, duration),
        ease: "power3.out",
        overwrite: "auto",
      });
    }
  }, [duration, prefersReducedMotion]);

  const handleDesktopHover = useCallback(
    (index: number) => {
      if (!isCompact) {
        setActive(index);
      }
    },
    [isCompact, setActive]
  );

  const handleDesktopLeave = useCallback(() => {
    if (!isCompact) {
      clearActive();
    }
  }, [isCompact, clearActive]);

  const handleItemClick = useCallback(
    (index: number) => {
      if (!isCompact) return;

      if (activeIndexRef.current === index) {
        clearActive();
      } else {
        setActive(index);
      }
    },
    [isCompact, clearActive, setActive]
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentRef.current,
        {
          opacity: 0,
          y: 80,
        },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          ease: "power4.inOut",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const compact = getCompact();

      setIsCompact(compact);
      setActiveIndex(null);
      activeIndexRef.current = null;
    });

    const onResize = () => {
      const compact = getCompact();

      setIsCompact(compact);
      setActiveIndex(null);
      activeIndexRef.current = null;

      refreshLoopRef.current?.destroy();
      refreshLoopRef.current = null;

      if (activationFrameRef.current) {
        cancelAnimationFrame(activationFrameRef.current);
        activationFrameRef.current = null;
      }

      if (highlightRef.current) {
        gsap.set(highlightRef.current, {
          opacity: 0,
          scale: 1.14,
          filter: "blur(8px)",
        });
      }
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [getCompact]);

  useEffect(() => {
    if (!highlightRef.current) return;

    gsap.set(highlightRef.current, {
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      opacity: 0,
      scale: 1.14,
      filter: "blur(8px)",
      transformOrigin: "center center",
      willChange: "transform,width,height,opacity,filter",
    });
  }, []);

  useEffect(() => {
    return () => {
      refreshLoopRef.current?.destroy();
      refreshLoopRef.current = null;

      if (activationFrameRef.current) {
        cancelAnimationFrame(activationFrameRef.current);
        activationFrameRef.current = null;
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-dvh overflow-hidden py-12 max-[1025px]:py-20 max-md:py-16"
      style={{ backgroundColor: bgColor }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden max-[1025px]:hidden">
        <div className="absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <div
        ref={contentRef}
        className="container relative mx-auto px-4 max-[1025px]:px-8 max-md:px-5"
        style={{ opacity: 0, transform: "translateY(80px)" }}
      >
        <div className="relative">
          <ul
            ref={listRef}
            className="relative isolate flex flex-col items-center text-center"
          >
            {data.map((item, i) => {
              const isActive = activeIndex === i;

              return (
                <li
                  key={item.label}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  className={[
                    "group grid w-full text-center",
                    "px-10 max-[1025px]:px-6 max-md:px-2",
                    prefersReducedMotion
                      ? "transition-[padding,grid-template-rows] duration-100"
                      : "transition-[padding,grid-template-rows] duration-500",
                    isActive
                      ? "grid-rows-[auto_1fr] py-5 max-[1025px]:py-7 max-md:py-8"
                      : "grid-rows-[auto_0fr] py-5 max-[1025px]:py-7 max-md:py-8",
                  ].join(" ")}
                  onMouseEnter={() => handleDesktopHover(i)}
                  onMouseLeave={handleDesktopLeave}
                  onClick={() => handleItemClick(i)}
                >
                  <button
                    type="button"
                    className={[
                      "relative isolate flex w-full justify-center overflow-hidden focus:outline-none",
                      isCompact ? "cursor-pointer" : "cursor-default",
                    ].join(" ")}
                    aria-expanded={isActive}
                    aria-controls={`industry-content-${i}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleItemClick(i);
                    }}
                  >
                    <span
                      ref={(el) => {
                        labelRefs.current[i] = el;
                      }}
                      className="grid max-w-full text-center"
                    >
                      <h3
                        className={[
                          "col-start-1 row-start-1 font-mono uppercase leading-none tracking-widest",
                          "text-2xl max-[1025px]:text-[4vw] max-md:text-[4.5vw]",
                          prefersReducedMotion
                            ? [
                                "transition-opacity duration-300",
                                isActive ? "opacity-0" : "opacity-100",
                              ].join(" ")
                            : [
                                "transition-transform duration-500",
                                isActive ? "-translate-y-full" : "translate-y-0",
                              ].join(" "),
                        ].join(" ")}
                        style={{ color: textColor }}
                      >
                        {item.label}
                      </h3>

                      <span
                        aria-hidden="true"
                        className={[
                          "col-start-1 row-start-1 font-mono uppercase leading-none tracking-widest",
                          "text-3xl max-[1025px]:text-[4.8vw] max-md:text-[6vw]",
                          prefersReducedMotion
                            ? [
                                "transition-opacity duration-300",
                                isActive ? "opacity-100" : "opacity-0",
                              ].join(" ")
                            : [
                                "transition-transform duration-500",
                                isActive ? "translate-y-0" : "translate-y-full",
                              ].join(" "),
                        ].join(" ")}
                        style={{ color: hoverColor }}
                      >
                        {item.label}
                      </span>
                    </span>
                  </button>

                  <div
                    id={`industry-content-${i}`}
                    className="mx-auto flex w-[70%] justify-center overflow-hidden max-[1025px]:w-[82%] max-md:w-full"
                  >
                    <p
                      ref={(el) => {
                        descriptionRefs.current[i] = el;
                      }}
                      className={[
                        "max-w-107.5 pt-1 text-center text-md font-light leading-relaxed tracking-wide max-[1025px]:max-w-[64vw] max-[1025px]:text-[2.5vw] max-md:max-w-[72vw] max-md:pt-4 max-md:text-[4vw]",
                        prefersReducedMotion
                          ? `transition-opacity duration-300 ${
                              isActive ? "opacity-100" : "opacity-0"
                            }`
                          : "",
                      ].join(" ")}
                      style={{ color: textColor }}
                    >
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div
            ref={highlightRef}
            className="pointer-events-none absolute left-0 top-0"
          >
            <CornerSVG
              className="absolute left-0 top-0 size-8 opacity-70 max-[1025px]:size-7 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute right-0 top-0 size-8 rotate-90 opacity-70 max-[1025px]:size-7 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute bottom-3 left-0 size-8 -rotate-90 opacity-70 max-[1025px]:size-7 max-[1025px]:bottom-2 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute bottom-3 right-0 size-8 rotate-180 opacity-70 max-[1025px]:size-7 max-[1025px]:bottom-2 max-md:size-5"
              style={{ color: hoverColor }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
