// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity, type MotionValue } from "motion/react";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";

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
    get isActive() {
      return isActive();
    },

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
    start() {
      if (destroyed) return;
      running = true;
      sync();
    },

    stop() {
      running = false;
      stopRaf();
    },

    get isRunning() {
      return running;
    },

    get isActive() {
      return gate.isActive;
    },

    observe(nextRoot?: RafRoot) {
      gate.observe(nextRoot);
      sync();
    },

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

const wrap = (min: number, max: number, value: number): number => {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}

const REDUCED_MOTION_SCROLL_FACTOR = 0.05

interface CssVariableInterpolation {
  property: string;
  from: number;
  to: number;
}

interface MarqueePathItemProps {
  child: ReactNode;
  repeatIndex: number;
  itemIndex: number;
  itemKey: string;
  baseOffset: MotionValue<number>;
  itemCount: number;
  easing?: (t: number) => number;
  calculateZIndex: (offsetDistance: number) => number | undefined;
  cssVariableInterpolation: CssVariableInterpolation[];
  draggable?: boolean;
  grabCursor?: boolean;
  path: string;
  enableRollingZIndex?: boolean;
  itemRefs: RefObject<Map<string, HTMLDivElement>>;
  isHoveredRef: RefObject<boolean>;
}

function MarqueePathItem({
  child,
  repeatIndex,
  itemIndex,
  itemKey,
  baseOffset,
  itemCount,
  easing,
  calculateZIndex,
  cssVariableInterpolation,
  draggable,
  grabCursor,
  path,
  enableRollingZIndex,
  itemRefs,
  isHoveredRef,
}: MarqueePathItemProps) {
  const itemOffset = useTransform(baseOffset, (value) => {
    const position = (itemIndex * 100) / itemCount
    const wrappedValue = wrap(0, 100, value + position)
    return `${easing ? easing(wrappedValue / 100) * 100 : wrappedValue}%`
  })

  const currentOffsetDistance = useMotionValue(0)
  const zIndex = useTransform(currentOffsetDistance, (value) =>
    calculateZIndex(value))
  const itemRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const unsubscribe = itemOffset.on("change", (value) => {
      const match = value.match(/^([\d.]+)%$/)
      if (match && match[1]) {
        const numericValue = parseFloat(match[1])
        currentOffsetDistance.set(numericValue)

        const itemElement = itemRef.current
        if (itemElement) {
          cssVariableInterpolation.forEach(({ property, from, to }) => {
            const nextValue = from + (to - from) * (numericValue / 100)
            itemElement.style.setProperty(property, String(nextValue))
          })
        }
      }
    })
    return unsubscribe
  }, [cssVariableInterpolation, currentOffsetDistance, itemOffset])

  return (
    <motion.div
      key={itemKey}
      ref={(el) => {
        itemRef.current = el
        if (el) itemRefs.current.set(itemKey, el)
      }}
      className={`absolute top-5 left-0 ${draggable && grabCursor ? 'cursor-grab' : ''}`}
      style={{
        offsetPath: `path('${path}')`,
        offsetDistance: itemOffset,
        zIndex: enableRollingZIndex ? zIndex : undefined,
        willChange: "offset-distance",
        backfaceVisibility: "hidden",
      }}
      aria-hidden={repeatIndex > 0}
      onMouseEnter={() => (isHoveredRef.current = true)}
      onMouseLeave={() => (isHoveredRef.current = false)}>
      {child}
    </motion.div>
  )
}

interface SVGPathCompProps {
  children?: ReactNode;
  className?: string;
  path: string;
  pathId?: string;
  preserveAspectRatio?: string;
  showPath?: boolean;
  width?: string | number;
  height?: string | number;
  viewBox?: string;
  baseVelocity?: number;
  direction?: string;
  easing?: (t: number) => number;
  slowdownOnHover?: boolean;
  slowDownFactor?: number;
  slowDownSpringConfig?: any;
  useScrollVelocity?: boolean;
  scrollAwareDirection?: boolean;
  scrollSpringConfig?: any;
  scrollContainer?: any;
  repeat?: number;
  draggable?: boolean;
  dragSensitivity?: number;
  dragAwareDirection?: boolean;
  grabCursor?: boolean;
  enableRollingZIndex?: boolean;
  zIndexBase?: number;
  zIndexRange?: number;
  cssVariableInterpolation?: CssVariableInterpolation[];
  responsive?: boolean;
}

const SVGPathComp = ({
  children,
  className,

  path,

  pathId,
  preserveAspectRatio = "xMidYMid meet",
  showPath = false,

  width = "100%",

  height = "100%",
  viewBox = "0 0 100 100",

  baseVelocity = 5,

  direction = "normal",
  easing,
  slowdownOnHover = false,
  slowDownFactor = 0.3,
  slowDownSpringConfig = { damping: 50, stiffness: 400 },

  useScrollVelocity = false,

  scrollAwareDirection = false,
  scrollSpringConfig = { damping: 50, stiffness: 400 },
  scrollContainer,

  repeat = 3,

  draggable = false,

  dragSensitivity = 0.2,
  dragAwareDirection = false,
  grabCursor = false,

  enableRollingZIndex = true,

  zIndexBase = 1,

  zIndexRange = 10,

  cssVariableInterpolation = [],

  responsive = false
}: SVGPathCompProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const marqueeContainerRef = useRef<HTMLDivElement | null>(null)
  const baseOffset = useMotionValue(0)
  const [isPositionReady, setIsPositionReady] = useState(false)
  const reduceMotion = useReducedMotion()

  const pathRef = useRef<SVGPathElement | null>(null)

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const generatedPathId = useId()

  useEffect(() => {
    if (!responsive) return

    const [, , vbWidth, vbHeight] = viewBox.split(" ").map(Number)
    const originalWidth = vbWidth || 100
    const originalHeight = vbHeight || 100

    const updateScale = () => {
      const wrapper = container.current
      const marqueeContainer = marqueeContainerRef.current
      if (!wrapper || !marqueeContainer) return

      const wrapperWidth = wrapper.clientWidth
      const wrapperHeight = wrapper.clientHeight

      const scaleX = wrapperWidth / originalWidth
      const scaleY = wrapperHeight / originalHeight
      const scale = Math.min(scaleX, scaleY)

      const scaledWidth = originalWidth * scale
      const scaledHeight = originalHeight * scale

      const offsetX = (wrapperWidth - scaledWidth) / 2
      const offsetY = (wrapperHeight - scaledHeight) / 2

      marqueeContainer.style.width = `${originalWidth}px`
      marqueeContainer.style.height = `${originalHeight}px`

      marqueeContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
      marqueeContainer.style.transformOrigin = "top left"
    }

    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale);
  }, [responsive, viewBox])

  const items = React.useMemo(() => {
    const childrenArray = React.Children.toArray(children)

    return childrenArray.flatMap((child, childIndex) =>
      Array.from({ length: repeat }, (_, repeatIndex) => {
        const itemIndex = repeatIndex * childrenArray.length + childIndex
        const key = `${childIndex}-${repeatIndex}`
        return {
          child,
          childIndex,
          repeatIndex,
          itemIndex,
          key,
        }
      }));
  }, [children, repeat])

  const calculateZIndex = useCallback((offsetDistance: number) => {
    if (!enableRollingZIndex) {
      return undefined
    }

    const normalizedDistance = offsetDistance / 100
    return Math.floor(zIndexBase + normalizedDistance * zIndexRange);
  }, [enableRollingZIndex, zIndexBase, zIndexRange])

  const id = pathId || `marquee-path-${generatedPathId.replace(/:/g, "")}`

 const { scrollY } = useScroll({
  container: scrollContainer || undefined,
})

  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, scrollSpringConfig)

  const lastScrollYRef = useRef(0)

  useEffect(() => {
    if (!reduceMotion) return
    lastScrollYRef.current = scrollY.get()
  }, [reduceMotion, scrollY])

  const isHoveredRef = useRef(false)
  const isDragging = useRef(false)
  const dragVelocity = useRef(0)

  const directionFactor = useRef(direction === "normal" ? 1 : -1)

  const hoverFactorValue = useMotionValue(1)
  const defaultVelocity = useMotionValue(1)
  const smoothHoverFactor = useSpring(hoverFactorValue, slowDownSpringConfig)

  const velocityFactor = useTransform(
    useScrollVelocity ? smoothVelocity : defaultVelocity,
    [0, 1000],
    [0, 5],
    { clamp: false }
  )

  const isVisibleRef = useRef(true)

  useEffect(() => {
    const gate = createVisibilityGate({
      root: container.current,
      onChange: (active: boolean) => {
        isVisibleRef.current = active
      },
    })
    isVisibleRef.current = gate.isActive
    return () => gate.destroy()
  }, [])

  useAnimationFrame((_, delta) => {
    if (!isVisibleRef.current) return

    if (reduceMotion) {
      const currentScrollY = scrollY.get()
      const scrollDelta = currentScrollY - lastScrollYRef.current
      lastScrollYRef.current = currentScrollY

      if (scrollDelta !== 0) {
        baseOffset.set(
          baseOffset.get() +
            scrollDelta * REDUCED_MOTION_SCROLL_FACTOR * directionFactor.current
        )
      }

      return
    }

    if (isDragging.current && draggable) {
      baseOffset.set(baseOffset.get() + dragVelocity.current)

      dragVelocity.current *= 0.9

      if (Math.abs(dragVelocity.current) < 0.01) {
        dragVelocity.current = 0
      }

      return
    }

    if (isHoveredRef.current) {
      hoverFactorValue.set(slowdownOnHover ? slowDownFactor : 1)
    } else {
      hoverFactorValue.set(1)
    }

    let moveBy =
      directionFactor.current *
      baseVelocity *
      (delta / 1000) *
      smoothHoverFactor.get()

    if (scrollAwareDirection && !isDragging.current) {
      if (velocityFactor.get() < 0) {
        directionFactor.current = -1
      } else if (velocityFactor.get() > 0) {
        directionFactor.current = 1
      }
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get()

    if (draggable) {
      moveBy += dragVelocity.current

      if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
        directionFactor.current = Math.sign(dragVelocity.current)
      }

      if (!isDragging.current && Math.abs(dragVelocity.current) > 0.01) {
        dragVelocity.current *= 0.9
      } else if (!isDragging.current) {
        dragVelocity.current = 0
      }
    }

    baseOffset.set(baseOffset.get() + moveBy)
  })

  const lastPointerPosition = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || reduceMotion) return
    ;(e.currentTarget).setPointerCapture(e.pointerId)

    if (grabCursor) {
      ;(e.currentTarget).style.cursor = "grabbing"
    }

    isDragging.current = true
    lastPointerPosition.current = { x: e.clientX, y: e.clientY }

    dragVelocity.current = 0
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !isDragging.current) return

    const currentPosition = { x: e.clientX, y: e.clientY }

    const deltaX = currentPosition.x - lastPointerPosition.current.x
    const deltaY = currentPosition.y - lastPointerPosition.current.y

    const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const projectedDelta = deltaX > 0 ? delta : -delta

    dragVelocity.current = projectedDelta * dragSensitivity

    lastPointerPosition.current = currentPosition
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable) return
    ;(e.currentTarget).releasePointerCapture(e.pointerId)
    isDragging.current = false

    if (grabCursor) {
      ;(e.currentTarget).style.cursor = "grab"
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      setIsPositionReady(false);
    });

    if (items.length === 0) {
      return
    }

    let frameId = 0
    let timeoutId = 0

    const markReady = () => {
      if (itemRefs.current.size === items.length) {
        frameId = window.requestAnimationFrame(() => {
          setIsPositionReady(true)
        })
        return
      }

      timeoutId = window.setTimeout(markReady, 16)
    }

    markReady()

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [items.length, path])

  return (
    <div
      ref={container}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative ${className || ''}`}>
      <motion.div
        ref={marqueeContainerRef}
        className="relative"
        initial={false}
        animate={{ opacity: isPositionReady ? 1 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ contain: "layout style" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={width}
          height={height}
          viewBox={viewBox}
          preserveAspectRatio={preserveAspectRatio}
          className="w-full h-full">
          <path
            id={id}
            d={path}
            stroke={showPath ? "currentColor" : "none"}
            fill="none"
            ref={pathRef} />
        </svg>

        {items.map(({ child, repeatIndex, itemIndex, key }) => (
          <MarqueePathItem
            key={key}
            child={child}
            repeatIndex={repeatIndex}
            itemIndex={itemIndex}
            itemKey={key}
            baseOffset={baseOffset}
            itemCount={items.length}
            easing={easing}
            calculateZIndex={calculateZIndex}
            cssVariableInterpolation={cssVariableInterpolation}
            draggable={draggable}
            grabCursor={grabCursor}
            path={path}
            enableRollingZIndex={enableRollingZIndex}
            itemRefs={itemRefs}
            isHoveredRef={isHoveredRef}
          />
        ))}
      </motion.div>
    </div>
  );
}

const wavePath =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

const circlePath =
  "M498 165 m -120, 0 a 120,120 0 1,0 240,0 a 120,120 0 1,0 -240,0";

const spiralPath =
  "M0 165C120 40 240 290 360 165C480 40 600 290 720 165C840 40 960 290 1080 165";

const svgPathImages = [
  "https://picsum.photos/seed/h01/1600/1200",
  "https://picsum.photos/seed/h02/1600/1200",
  "https://picsum.photos/seed/h03/1600/1200",
  "https://picsum.photos/seed/h13/1600/1200",
  "https://picsum.photos/seed/h05/1600/1200",
  "https://picsum.photos/seed/h06/1600/1200",
  "https://picsum.photos/seed/h07/1600/1200",
  "https://picsum.photos/seed/h08/1600/1200",
  "https://picsum.photos/seed/h09/1600/1200",
  "https://picsum.photos/seed/h10/1600/1200",
  "https://picsum.photos/seed/h11/1600/1200",
  "https://picsum.photos/seed/h12/1600/1200",
  "https://picsum.photos/seed/h13/1600/1200",
  "https://picsum.photos/seed/h14/1600/1200",
  "https://picsum.photos/seed/h15/1600/1200",
];

const tabs = [
  {
    id: "circle",
    label: "Circle",
    path: circlePath,
    viewBox: "0 0 996 330",
    className: "h-full w-full scale-[1.1] max-lg:scale-[1.55] max-md:scale-[1.95]",
    repeat: 1,
    baseVelocity: 8,
  },
  {
    id: "spiral",
    label: "Spiral",
    path: wavePath,
    viewBox: "0 0 996 330",
    className: "h-full w-full scale-[1.05] max-lg:scale-[1.35] max-md:scale-[1.75]",
    repeat: 1.5,
    baseVelocity: 8,
  },
  {
    id: "wave",
    label: "Wave",
    path: spiralPath,
    viewBox: "0 0 1080 330",
    className: "h-full w-full scale-[1.08] max-lg:scale-[1.3] max-md:scale-[1.65]",
    repeat: 1,
    baseVelocity: 8,
  },
];

const imgs = svgPathImages.map((src) => ({
  src,
  link: "/",
}));

interface SVGPathProps {
  bgColor?: string;
  baseVelocity?: number;
  dragSensitivity?: number;
  slowDownFactor?: number;
  draggable?: boolean;
}
export default function SVGPath({
  bgColor = "#000000",
  baseVelocity = 8,
  dragSensitivity = 0.1,
  slowDownFactor = 0.3,
  draggable = true,
}: SVGPathProps) {
  const [activeTab, setActiveTab] = useState("circle");

  const currentTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) || tabs[0];
  }, [activeTab]);

  return (
    <>

      <section className="relative flex h-[180vh] w-dvw items-center justify-center overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="fixed inset-0 h-svh w-dvw overflow-hidden" style={{ backgroundColor: bgColor }}>
          <div className="pointer-events-auto fixed left-1/2 bottom-[5%] max-lg:bottom-[7%] z-20 flex -translate-x-1/2 items-center gap-[0.8vw] rounded-full border border-white/15 bg-white/10 p-[0.35vw] backdrop-blur-md  max-lg:gap-[1.2vw] max-lg:p-[0.7vw] max-md:w-fit max-lg:h-fit max-md:justify-center max-md:gap-[2vw] max-md:p-[1.4vw]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-[1.2vw] py-[0.6vw] text-[0.9vw] font-medium transition-all duration-300 ease-in-out max-lg:px-[2.4vw] max-lg:py-[1.1vw] max-lg:text-[1.8vw] max-md:px-[4vw] max-md:py-[2.2vw] max-md:text-[3.4vw] ${
                    isActive
                      ? "bg-white text-black"
                      : "bg-transparent text-white/65 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <SVGPathComp
            key={`${currentTab.id}-${currentTab.path}`}
            path={currentTab.path}
            viewBox={currentTab.viewBox}
            baseVelocity={baseVelocity}
            slowdownOnHover
            slowDownFactor={slowDownFactor}
            draggable={draggable}
            useScrollVelocity
            repeat={currentTab.repeat}
            dragSensitivity={dragSensitivity}
            className={currentTab.className}
            responsive
            grabCursor
          >
            {imgs.map((img, i) => (
              <a key={`${currentTab.id}-${i}`} href={img.link}>
                <div className="h-full w-14 duration-300 ease-in-out hover:scale-150 max-lg:w-16 max-md:w-18">
                  <img
                    src={img.src}
                    alt={`Marquee path image ${i + 1}`}
                    width={56}
                    height={100}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              </a>
            ))}
          </SVGPathComp>
        </div>
      </section>
    </>
  );
}
