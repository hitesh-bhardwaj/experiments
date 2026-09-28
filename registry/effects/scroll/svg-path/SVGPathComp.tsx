import React, { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { createVisibilityGate } from "./createSuspendedRaf";

// Custom wrap function
const wrap = (min: number, max: number, value: number): number => {
  const range = max - min
  return ((((value - min) % range) + range) % range) + min
}

// How much of each scrolled pixel becomes path-offset percentage in
// reduced-motion mode. Keeps a normal scroll from spinning the item around
// the path multiple times.
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
  dragVelocityDecay?: number;
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

  // Path defaults
  path,

  pathId,
  preserveAspectRatio = "xMidYMid meet",
  showPath = false,

  // SVG defaults
  width = "100%",

  height = "100%",
  viewBox = "0 0 100 100",

  // Marquee defaults
  baseVelocity = 5,

  direction = "normal",
  easing,
  slowdownOnHover = false,
  slowDownFactor = 0.3,
  slowDownSpringConfig = { damping: 50, stiffness: 400 },

  // Scroll defaults
  useScrollVelocity = false,

  scrollAwareDirection = false,
  scrollSpringConfig = { damping: 50, stiffness: 400 },
  scrollContainer,

  // Items repetition
  repeat = 3,

  // Drag defaults
  draggable = false,

  dragSensitivity = 0.2,
  dragVelocityDecay = 0.96,
  dragAwareDirection = false,
  grabCursor = false,

  // Z-index defaults
  enableRollingZIndex = true,

  // Base z-index value
  zIndexBase = 1,

  // Range of z-index values to use
  zIndexRange = 10,

  cssVariableInterpolation = [],

  // Responsive defaults
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

  // Responsive scaling using direct DOM manipulation (no re-renders)
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

      // Calculate the scaled dimensions
      const scaledWidth = originalWidth * scale
      const scaledHeight = originalHeight * scale

      // Center the marquee container within the wrapper
      const offsetX = (wrapperWidth - scaledWidth) / 2
      const offsetY = (wrapperHeight - scaledHeight) / 2

      // Set fixed dimensions on the container
      marqueeContainer.style.width = `${originalWidth}px`
      marqueeContainer.style.height = `${originalHeight}px`

      // Apply scale and position to center
      marqueeContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
      marqueeContainer.style.transformOrigin = "top left"
    }

    updateScale()
    window.addEventListener("resize", updateScale)
    return () => window.removeEventListener("resize", updateScale);
  }, [responsive, viewBox])

  // Create an array of items outside of the render function
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

  // Function to calculate z-index based on offset distance
  const calculateZIndex = useCallback((offsetDistance: number) => {
    if (!enableRollingZIndex) {
      return undefined
    }

    // Simple progress-based z-index
    const normalizedDistance = offsetDistance / 100
    return Math.floor(zIndexBase + normalizedDistance * zIndexRange);
  }, [enableRollingZIndex, zIndexBase, zIndexRange])

  // Generate a random ID for the path if not provided
  const id = pathId || `marquee-path-${generatedPathId.replace(/:/g, "")}`

  // Scroll tracking
 const { scrollY } = useScroll({
  container: scrollContainer || undefined,
})

  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, scrollSpringConfig)

  // Reduced motion: track raw scroll position directly, no spring/lerp
  // smoothing - the path item should only move exactly as far as the user
  // scrolls, with no eased/interpolated catch-up.
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    if (!reduceMotion) return
    lastScrollYRef.current = scrollY.get()
  }, [reduceMotion, scrollY])

  // Hover and drag state tracking
  const isHoveredRef = useRef(false)
  const isDragging = useRef(false)
  const dragVelocity = useRef(0)

  // Direction factor for changing direction based on scroll or drag
  const directionFactor = useRef(direction === "normal" ? 1 : -1)

  // Motion values for animation
  const hoverFactorValue = useMotionValue(1)
  const defaultVelocity = useMotionValue(1)
  const smoothHoverFactor = useSpring(hoverFactorValue, slowDownSpringConfig)

  // Transform scroll velocity into a factor that affects marquee speed
  const velocityFactor = useTransform(
    useScrollVelocity ? smoothVelocity : defaultVelocity,
    [0, 1000],
    [0, 5],
    { clamp: false }
  )

  // Suspend marquee work while the component is offscreen or the tab is
  // hidden - useAnimationFrame keeps firing, so the gate ref is what stops
  // the per-frame offset/style writes from running unseen.
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

  // Animation frame handler
  useAnimationFrame((_, delta) => {
    if (!isVisibleRef.current) return

    if (reduceMotion) {
      // Static: no autoplay drift, no drag/hover speed changes, no
      // spring/lerp smoothing. Position only advances by exactly how far
      // the user has scrolled since the last frame.
      const currentScrollY = scrollY.get()
      const scrollDelta = currentScrollY - lastScrollYRef.current
      lastScrollYRef.current = currentScrollY

      if (scrollDelta !== 0) {
        // scrollDelta is raw pixels, baseOffset is a 0-100 path percentage -
        // scale it down so a normal scroll only nudges the offset a little.
        baseOffset.set(
          baseOffset.get() +
            scrollDelta * REDUCED_MOTION_SCROLL_FACTOR * directionFactor.current
        )
      }

      return
    }

    if (isDragging.current && draggable) {
      baseOffset.set(baseOffset.get() + dragVelocity.current)

      // Add decay to dragVelocity
      dragVelocity.current *= 0.9

      // Stop completely if velocity is very small
      if (Math.abs(dragVelocity.current) < 0.01) {
        dragVelocity.current = 0
      }

      return
    }

    // Update hover factor
    if (isHoveredRef.current) {
      hoverFactorValue.set(slowdownOnHover ? slowDownFactor : 1)
    } else {
      hoverFactorValue.set(1)
    }

    // Calculate regular movement
    let moveBy =
      directionFactor.current *
      baseVelocity *
      (delta / 1000) *
      smoothHoverFactor.get()

    // Adjust movement based on scroll velocity if scrollAwareDirection is enabled
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

      // Update direction based on drag direction if dragAwareDirection is true
      if (dragAwareDirection && Math.abs(dragVelocity.current) > 0.1) {
        directionFactor.current = Math.sign(dragVelocity.current)
      }

      // Gradually decay drag velocity back to zero
      if (!isDragging.current && Math.abs(dragVelocity.current) > 0.01) {
        dragVelocity.current *= dragVelocityDecay
      } else if (!isDragging.current) {
        dragVelocity.current = 0
      }
    }

    baseOffset.set(baseOffset.get() + moveBy)
  })

  // Pointer event handlers for dragging
  const lastPointerPosition = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || reduceMotion) return
    ;(e.currentTarget).setPointerCapture(e.pointerId)

    if (grabCursor) {
      ;(e.currentTarget).style.cursor = "grabbing"
    }

    isDragging.current = true
    lastPointerPosition.current = { x: e.clientX, y: e.clientY }

    // Pause automatic animation by setting velocity to 0
    dragVelocity.current = 0
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggable || !isDragging.current) return

    const currentPosition = { x: e.clientX, y: e.clientY }

    // Calculate movement delta - simplified for path movement
    const deltaX = currentPosition.x - lastPointerPosition.current.x
    const deltaY = currentPosition.y - lastPointerPosition.current.y

    // For path following, we use a simple magnitude of movement
    const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const projectedDelta = deltaX > 0 ? delta : -delta

    // Update drag velocity based on the projected movement
    dragVelocity.current = projectedDelta * dragSensitivity

    // Update last position
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

export default SVGPathComp
