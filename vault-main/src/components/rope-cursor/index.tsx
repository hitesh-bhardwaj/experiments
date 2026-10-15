// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import React, { useEffect, useRef, useState } from "react";

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

interface RopeSegment {
	x: number
	y: number
}

interface RopeCursorProps {
	ropeColor?: string
	ropeWidth?: number
	ropeOpacity?: number
	segmentLength?: number
	segmentCount?: number
}

export default function RopeCursor({
	ropeColor ='#bda985',
	ropeWidth = 2,
	ropeOpacity = 0.6,
	segmentLength = 0,
	segmentCount = 8,
}: RopeCursorProps) {
	const svgRef = useRef<SVGSVGElement | null>(null)
	const pathRef = useRef<SVGPathElement | null>(null)
	const ropeSegments = useRef<RopeSegment[]>([])
	const mousePosition = useRef<{ x: number | null; y: number | null }>({ x: null, y: null })
	const [isVisible, setIsVisible] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 1025)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)

		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	useEffect(() => {
		if (isMobile) return

 let isInitialized = false

 const initializeRopeSegments = (startX: number, startY: number) => {
 ropeSegments.current = Array.from({ length: segmentCount }, () => ({
 x: startX,
 y: startY
 }))
 isInitialized = true
 setIsVisible(true)
 }

 const handleMouseMove = (event: MouseEvent) => {
 mousePosition.current.x = event.clientX
 mousePosition.current.y = event.clientY

 if (!isInitialized && mousePosition.current.x !== null) {
 initializeRopeSegments(mousePosition.current.x, mousePosition.current.y)
 }
 }

 // Time-based smoothing factor equivalent to the settle time of a short
 // eased tween, applied directly each frame instead of allocating a new
 // gsap tween per segment per frame (previously ~480 tweens/sec).
 const smoothingAmount = (durationSeconds: number, deltaSeconds: number) =>
 1 - Math.exp((-3 * deltaSeconds) / durationSeconds)

 const updateLeadingSegment = (segments: RopeSegment[], targetX: number, targetY: number, deltaSeconds: number) => {
 const amount = smoothingAmount(0.05, deltaSeconds)
 segments[0].x += (targetX - segments[0].x) * amount
 segments[0].y += (targetY - segments[0].y) * amount
 }

 const updateFollowingSegments = (segments: RopeSegment[], deltaSeconds: number, activeLength: number) => {
 for (let i = 1; i < segmentCount; i++) {
 const previousSegment = segments[i - 1]
 const currentSegment = segments[i]

 const deltaX = previousSegment.x - currentSegment.x
 const deltaY = previousSegment.y - currentSegment.y
 const distanceBetweenSegments = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

 // Beyond the active length the segment is pulled back to that distance;
 // within it, it keeps easing toward the previous segment so the tail
 // still moves.
 let constrainedX = previousSegment.x
 let constrainedY = previousSegment.y

 if (distanceBetweenSegments > activeLength) {
 const angleToTarget = Math.atan2(deltaY, deltaX)
 constrainedX = previousSegment.x - Math.cos(angleToTarget) * activeLength
 constrainedY = previousSegment.y - Math.sin(angleToTarget) * activeLength
 }

 const amount = smoothingAmount(0.15 + i * 0.01, deltaSeconds)
 currentSegment.x += (constrainedX - currentSegment.x) * amount
 currentSegment.y += (constrainedY - currentSegment.y) * amount
 }
 }

 const generateSmoothPath = (segments: RopeSegment[]) => {
 let pathData = `M ${segments[0].x} ${segments[0].y}`

 for (let i = 1; i < segmentCount - 1; i++) {
 const controlPointX = (segments[i].x + segments[i + 1].x) / 2
 const controlPointY = (segments[i].y + segments[i + 1].y) / 2
 pathData += ` Q ${segments[i].x} ${segments[i].y} ${controlPointX} ${controlPointY}`
 }

 const lastSegment = segments[segmentCount - 1]
 pathData += ` L ${lastSegment.x} ${lastSegment.y}`

 return pathData
 }

 let lastFrameTime: number | null = null
 // 0..1 share of segmentLength currently in use. It follows cursor speed so a
 // long rope stretches while moving and retracts to nothing at rest, the
 // same way a zero-length rope does.
 let lengthFactor = 0

 const loop = createSuspendedRaf({
 root: svgRef.current,
 onFrame: (time: number) => {
 const segments = ropeSegments.current
 const mouse = mousePosition.current

 // Clamp delta so a resume after suspension doesn't snap the rope.
 const deltaSeconds =
 lastFrameTime === null ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 1 / 30)
 lastFrameTime = time

 if (!isInitialized || mouse.x === null) {
 return
 }

 const previousLeadX = segments[0].x
 const previousLeadY = segments[0].y
 updateLeadingSegment(segments, mouse.x, mouse.y as number, deltaSeconds)

 const leadSpeed =
 Math.hypot(segments[0].x - previousLeadX, segments[0].y - previousLeadY) / deltaSeconds
 const targetFactor = Math.min(leadSpeed / 400, 1)
 lengthFactor += (targetFactor - lengthFactor) * smoothingAmount(0.15, deltaSeconds)

 updateFollowingSegments(segments, deltaSeconds, segmentLength * lengthFactor)

 if (pathRef.current) {
 pathRef.current.setAttribute('d', generateSmoothPath(segments))
 }
 },
 })

 window.addEventListener('mousemove', handleMouseMove)
 loop.start()

 return () => {
 window.removeEventListener('mousemove', handleMouseMove)
 loop.destroy()
 }
	}, [segmentCount, segmentLength, isMobile])

	if (isMobile) return null

	return (
 <>
 <svg
 ref={svgRef}
 className="w-full h-full absolute inset-0"
 style={{ opacity: isVisible ? 1 : 0 }}
 >
 <path
 ref={pathRef}
 fill="none"
 stroke={ropeColor}
 strokeWidth={ropeWidth}
 strokeLinecap="round"
 strokeLinejoin="round"
 opacity={ropeOpacity}
 />
 </svg>
 </>
	)
}
