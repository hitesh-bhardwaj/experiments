// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const DEFAULT_ROOT_MARGIN = "256px";

type RafRoot = Element | null | { current: Element | null } | (() => Element | null);

function resolveElement(root: RafRoot): Element | null {
  if (!root) return null;
  if (typeof root === "function") return root() ?? null;
  if (typeof root === "object" && "current" in root) return root.current ?? null;
  return root;
}

interface VisibilityGateOptions {
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
  onChange?: (active: boolean) => void;
}

interface VisibilityGate {
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

function createVisibilityGate({
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
  onChange,
}: VisibilityGateOptions = {}): VisibilityGate {
  let tabVisible =
    typeof document === "undefined" ? true : !document.hidden;
  // Match border-beam: assume onscreen until the observer reports otherwise.
  let onscreen = true;
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  const isActive = () => {
    if (destroyed) return false;
    if (observeTab && !tabVisible) return false;
    if (observeOffscreen && resolveElement(root) && !onscreen) return false;
    return true;
  };

  let lastActive = isActive();

  const emit = () => {
    if (destroyed) return;
    const next = isActive();
    if (next === lastActive) return;
    lastActive = next;
    onChange?.(next);
  };

  const onVisibilityChange = () => {
    tabVisible = !document.hidden;
    emit();
  };

  if (observeTab && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  const bindObserver = () => {
    if (!observeOffscreen || typeof IntersectionObserver === "undefined") {
      return;
    }

    const el = resolveElement(root);
    if (!el) return;

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onscreen = entry.isIntersecting;
        }
        emit();
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
  };

  bindObserver();

  return {
    /** Whether the animation should currently run. */
    get isActive() {
      return isActive();
    },

    /**
     * Re-bind IntersectionObserver after the root element mounts late
     * (e.g. ref not ready on first call). Safe to call multiple times.
     */
    observe(nextRoot?: RafRoot) {
      if (destroyed) return;
      if (nextRoot != null) root = nextRoot;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      onscreen = true;
      bindObserver();
      emit();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observeTab && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}

interface SuspendedRafOptions {
  onFrame: (time: number) => void;
  root?: RafRoot;
  rootMargin?: string;
  threshold?: number;
  observeTab?: boolean;
  observeOffscreen?: boolean;
}

interface SuspendedRaf {
  start: () => void;
  stop: () => void;
  readonly isRunning: boolean;
  readonly isActive: boolean;
  observe: (nextRoot?: RafRoot) => void;
  destroy: () => void;
}

/**
 * Owns a requestAnimationFrame loop that auto-pauses when the tab is hidden
 * or the root element is offscreen.
 */
function createSuspendedRaf({
  onFrame,
  root = null,
  rootMargin = DEFAULT_ROOT_MARGIN,
  threshold = 0,
  observeTab = true,
  observeOffscreen = true,
}: SuspendedRafOptions): SuspendedRaf {
  if (typeof onFrame !== "function") {
    throw new TypeError("createSuspendedRaf: onFrame is required");
  }

  let rafId: number | null = null;
  let running = false;
  let destroyed = false;

  const stopRaf = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const tick = (time: number) => {
    rafId = null;
    if (destroyed || !running || !gate.isActive) return;
    onFrame(time);
    if (!destroyed && running && gate.isActive) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const sync = () => {
    if (destroyed) return;
    if (running && gate.isActive) {
      if (rafId == null) {
        rafId = requestAnimationFrame(tick);
      }
    } else {
      stopRaf();
    }
  };

  const gate = createVisibilityGate({
    root,
    rootMargin,
    threshold,
    observeTab,
    observeOffscreen,
    onChange: sync,
  });

  return {
    /** Start (or resume) the loop when visibility allows. */
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },

    /** Stop requesting frames (visibility listeners stay attached until destroy). */
    stop() {
      running = false;
      stopRaf();
    },

    /** Whether the caller has started the loop (may still be paused by visibility). */
    get isRunning() {
      return running;
    },

    /** Whether a frame is currently allowed to schedule. */
    get isActive() {
      return gate.isActive;
    },

    /** Re-attach offscreen observer to a (new) root element. */
    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },

    /** Tear down listeners and cancel any pending frame. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      stopRaf();
      gate.destroy();
    },
  };
}

export {
  createSuspendedRaf,
  createVisibilityGate,
  DEFAULT_ROOT_MARGIN,
};

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

function TextHoverComp({
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

    // Measure from the box the frame is actually positioned in (its offset
    // parent, inside the content padding) - measuring from the padded
    // content box shifted the frame right by that padding on mobile/tablet.
    const frameParent =
      (highlightRef.current?.offsetParent as HTMLElement | null) ?? content;
    const contentRect = frameParent.getBoundingClientRect();
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
      className="relative min-h-dvh overflow-hidden py-12 max-lg:py-20 max-md:py-16"
      style={{ backgroundColor: bgColor }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden max-lg:hidden">
        <div className="absolute left-1/2 top-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <div
        ref={contentRef}
        className="container relative mx-auto px-4 max-lg:px-8 max-md:px-5"
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
                    // Only as wide as its own label/description, so hover
                    // (mouseenter) only fires over the text itself, not the
                    // empty space either side of it.
                    "group grid w-fit max-w-full text-center",
                    "px-10 max-lg:px-6 max-md:px-2",
                    prefersReducedMotion
                      ? "transition-[padding,grid-template-rows] duration-100"
                      : "transition-[padding,grid-template-rows] duration-500",
                    isActive
                      ? "grid-rows-[auto_1fr] py-5 max-lg:py-7 max-md:py-8"
                      : "grid-rows-[auto_0fr] py-5 max-lg:py-7 max-md:py-8",
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
                          "text-2xl max-lg:text-[4vw] max-md:text-[4.5vw]",
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
                          "text-3xl max-lg:text-[4.8vw] max-md:text-[6vw]",
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
                    className="mx-auto flex w-[70%] justify-center overflow-hidden max-lg:w-[82%] max-md:w-full"
                  >
                    <p
                      ref={(el) => {
                        descriptionRefs.current[i] = el;
                      }}
                      className={[
                        "max-w-107.5 pt-1 text-center text-md font-light leading-relaxed tracking-wide max-lg:max-w-[64vw] max-lg:text-[2.5vw] max-md:max-w-[72vw] max-md:pt-4 max-md:text-[4vw]",
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
              className="absolute left-0 top-0 size-8 opacity-70 max-lg:size-7 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute right-0 top-0 size-8 rotate-90 opacity-70 max-lg:size-7 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute bottom-3 left-0 size-8 -rotate-90 opacity-70 max-lg:size-7 max-lg:bottom-2 max-md:size-5"
              style={{ color: hoverColor }}
            />
            <CornerSVG
              className="absolute bottom-3 right-0 size-8 rotate-180 opacity-70 max-lg:size-7 max-lg:bottom-2 max-md:size-5"
              style={{ color: hoverColor }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

const data = [
  {
    label: "UI Components",
    description:
      "Beautifully crafted components built for modern Next.js and React applications.",
  },
  {
    label: "Text Animations",
    description:
      "Creative headline effects, reveal animations, and smooth typography interactions.",
  },
  {
    label: "Background Effects",
    description:
      "Futuristic grids, gradients, particles, and immersive animated backgrounds.",
  },
  {
    label: "Scroll Animations",
    description:
      "Smooth scroll-triggered interactions and cinematic motion experiences.",
  },
  {
    label: "Buttons & Hover FX",
    description:
      "Premium buttons, magnetic interactions, and modern hover micro-interactions.",
  },
  {
    label: "Page Transitions",
    description:
      "Fluid route transitions and immersive navigation animations for modern apps.",
  },
  {
    label: "3D Experiences",
    description:
      "Interactive WebGL, Three.js, and motion-driven visual experiences.",
  },
  {
    label: "Creative Layouts",
    description:
      "Modern sections, bento grids, hero layouts, and showcase-ready designs.",
  },
  {
    label: "Developer Experience",
    description:
      "Reusable, customizable, and production-ready UI built for fast development.",
  },
];

const TextHover = ({
 bgColor = "#0a0a0a",
 textColor = "#ffffff",
 hoverColor = "#ffffff",
 duration = 0.35,
}) => {
 return (
 <>

 <div className='h-screen w-full'>
 <TextHoverComp
 data={data}
 bgColor={bgColor}
 textColor={textColor}
 hoverColor={hoverColor}
 duration={duration}
 />
 
 </div>
 </>
 )
}

export default TextHover
