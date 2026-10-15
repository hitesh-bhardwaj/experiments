// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import React, { useCallback, useEffect, useRef, useState } from "react";

// ---- createSuspendedRaf.ts ----
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


// ---- MaskedContainer.tsx ----




gsap.registerPlugin(Draggable, InertiaPlugin);

interface MaskedContainerProps {
  size: any
  initialPosition: { x: number, y: number }
  className?: string
  video: HTMLVideoElement | null
  canvasSize: { width: number, height: number }
  friction?: number
  scaleOnDrag?: number
  canvasBorderColor?: string
  rounded?: number
  reducedMotion?: boolean
  onPositionUpdate: (size: any, position: { x: number, y: number }) => void
  onHoverChange?: (hovering: boolean) => void
}

function MaskedContainer({
  size,
  initialPosition,
  className,
  video,
  canvasSize,
  friction = 0.12,
  scaleOnDrag = 1.04,
  canvasBorderColor = "#71717a",
  rounded = 0,
  reducedMotion = false,
  onPositionUpdate,
  onHoverChange,
}: MaskedContainerProps) {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [position, setPosition] = useState(initialPosition);
  // Reduced motion: maximum friction (the canvas stops where it's released)
  // and no scale pop on press - the drag itself stays 1:1 with the pointer.
  const safeFriction = reducedMotion ? 10 : Math.min(10, Math.max(0, Number(friction) || 0));
  const safeScaleOnDrag = reducedMotion ? 1 : Math.min(1.5, Math.max(0.85, Number(scaleOnDrag) || 1));
  const safeRounded = Math.min(80, Math.max(0, Number(rounded) || 0));

  // Canvas drawing function for individual mask
  const drawMaskedVideo = useCallback(() => {
    const canvas = canvasRef.current;
    const maskElement = maskRef.current;

    if (!canvas || !video || !maskElement) return;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    // Measure the canvas itself, not the mask: the mask's 1px border means
    // the canvas is smaller and inset, and using the mask's box drew the
    // video slightly squeezed and offset - so it swam against the screen
    // as the window moved.
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Backing store at device-pixel resolution, rounded, and only resized
    // when it really changes (resizing rebuilds the canvas every frame).
    const dpr = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    // Draw in CSS pixels of the canvas's on-screen box (handles the
    // scale-on-press too), so one video pixel lands on one screen pixel.
    ctx.setTransform(width / rect.width, 0, 0, height / rect.height, 0, 0);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // The slice of the full-screen video that sits behind this window.
    ctx.drawImage(video, -rect.left, -rect.top, canvasSize.width, canvasSize.height);
  }, [video, canvasSize]);

  const drawRef = useRef(drawMaskedVideo);
  useEffect(() => {
    drawRef.current = drawMaskedVideo;
  }, [drawMaskedVideo]);

  // Start animation when video is available
  useEffect(() => {
    if (!video) return;

    const loop = createSuspendedRaf({
      root: maskRef.current,
      onFrame: () => {
        drawMaskedVideo();
      },
    });
    loop.start();

    return () => loop.destroy();
  }, [video, drawMaskedVideo]);

  // GSAP Draggable functionality
  useEffect(() => {
    if (maskRef.current) {
      gsap.set(maskRef.current, { scale: 1, transformOrigin: "center center" });

      const draggable = Draggable.create(maskRef.current, {
        type: "x,y",
        inertia: true,
        bounds: "body",
        zIndexBoost: false,
        edgeResistance: 0.3,
        // GSAP 3 reads these as top-level Draggable options (the old
        // `throwProps` object is ignored, which is why friction did nothing).
        // Higher friction = more resistance = the throw stops sooner.
        throwResistance: 50 + safeFriction * 1000,
        minDuration: 0.2,
        maxDuration: 3,
        onPress: function () {
          gsap.to(this.target, {
            scale: safeScaleOnDrag,
            duration: 0.18,
            ease: "power2.out",
            // "auto", not true: true kills every tween on the target -
            // including the inertia throw Draggable starts on release,
            // which is why the throw (and friction) never happened.
            overwrite: "auto",
          });
        },
        onRelease: function () {
          gsap.to(this.target, {
            scale: 1,
            duration: 0.28,
            ease: "power2.out",
            // "auto", not true: true kills every tween on the target -
            // including the inertia throw Draggable starts on release,
            // which is why the throw (and friction) never happened.
            overwrite: "auto",
          });
        },
        // Redraw right after Draggable moves the mask, so the video slice
        // matches the new position this frame instead of lagging one frame
        // behind (which reads as the video jittering inside the window).
        onDrag: function () {
          drawRef.current();
          setPosition({ x: this.x, y: this.y });
          onPositionUpdate(size, { x: this.x, y: this.y });
        },
        onThrowUpdate: function () {
          drawRef.current();
          setPosition({ x: this.x, y: this.y });
          onPositionUpdate(size, { x: this.x, y: this.y });
        },
      })[0];

      return () => {
        if (draggable) {
          draggable.kill();
        }
      };
    }
  }, [safeFriction, safeScaleOnDrag, size, onPositionUpdate]);

  return (
    <div
      ref={maskRef}
      className={`${className} cursor-grab active:cursor-grabbing z-10 overflow-hidden border`}
      style={{
        borderColor: canvasBorderColor,
        borderRadius: `${safeRounded}px`,
        zIndex: 20,
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <div className=" absolute flex gap-2 text-white/70 h-fit w-fit text-[.6vw] px-[.5vw] pt-[.3vw] py-[.1vw]">
        <p>X:{position.x.toFixed(2)}</p>
        <p>Y:{position.y.toFixed(2)}</p>
      </div>
      {/* Canvas for rendering masked video */}
      <canvas ref={canvasRef} className="w-full h-full" aria-hidden="true" />
    </div>
  );
}


// ---- DragCursor.tsx ----


function DragCursor({ isHoveringDraggable = false }: { isHoveringDraggable?: boolean }) {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const handlePointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      
      setPosition({ x, y });
      
      gsap.to(cursor, {
        x: x,
        y: y,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div 
      ref={cursorRef}
      className="fixed w-4 h-4 pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2"
      style={{ left: 0, top: 0 }}
    >
      <div className="absolute top-4 left-[120%] text-white text-[.5vw] font-head whitespace-nowrap">
        {isHoveringDraggable ? (
          <p className="font-bold">DRAG</p>
        ) : (
          <>
            <p>X:{position.x.toFixed(2)}</p>
            <p>Y:{position.y.toFixed(2)}</p>
          </>
        )}
      </div>
    </div>
  );
}


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com




gsap.registerPlugin(Draggable, InertiaPlugin);

export default function DraggableCanvas({
  friction = 0.12,
  scaleOnDrag = 1.04,
  backgroundColor = "#000000",
  canvasBorderColor = "#71717a",
  rounded = 0,
}: {
  friction?: number;
  scaleOnDrag?: number;
  backgroundColor?: string;
  canvasBorderColor?: string;
  rounded?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isHoveringDraggable, setIsHoveringDraggable] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [, setContainerPositions] = useState({
    large: { x: 0, y: 0 },
    medium: { x: 0, y: 0 },
    small: { x: 0, y: 0 },
    extra1: { x: 0, y: 0 },
    extra2: { x: 0, y: 0 },
    extra3: { x: 0, y: 0 }
  });

  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return;

    const syncReducedMotion = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion("matches" in event ? event.matches : mediaQuery.matches);
    };

    syncReducedMotion(mediaQuery);
    mediaQuery.addEventListener("change", syncReducedMotion);
    return () => mediaQuery.removeEventListener("change", syncReducedMotion);
  }, []);

  useEffect(() => {
    const video = videoElement;

    if (!video) return;

    // Set canvas size
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    // Video event handlers
    const handleVideoCanPlay = () => {
      setIsVideoReady(true);
    };

    const handleVideoError = () => {
      console.error("Video failed to load");
      setIsVideoReady(false);
    };

    // Add video event listeners
    video.addEventListener("canplay", handleVideoCanPlay);
    video.addEventListener("error", handleVideoError);

    // Force video to load
    video.load();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      video.removeEventListener("canplay", handleVideoCanPlay);
      video.removeEventListener("error", handleVideoError);
    };
  }, [videoElement]);

  
  const handlePositionUpdate = useCallback(
    (size: any, position: { x: number, y: number }) => {
      setContainerPositions(prev => ({
        ...prev,
        [size]: position
      }));
    },
    []
  );

  const handleHoverChange = useCallback((isHovering: boolean) => {
    setIsHoveringDraggable(isHovering);
  }, []);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ backgroundColor }}
    >
        <DragCursor isHoveringDraggable={isHoveringDraggable}/>
        <div className="absolute w-full h-full inset-0  z-10"></div>
        <p className="pointer-events-none absolute bottom-8 right-8 z-40 max-w-[31vw] max-lg:max-w-[55vw] max-md:max-w-[85vw] px-6 text-right max-lg:text-center max-lg:mx-auto font-mono text-sm  leading-relaxed text-white/75 [text-shadow:0_3px_18px_rgba(0,0,0,0.85)] max-lg:text-base max-md:text-sm max-md:bottom-18">
          Drag the floating canvases - each window steals a different slice of the same moving dream.<span className="lg:hidden"> (best experience on desktop)</span>
        </p>
      {/* Hidden video element - single source for all masks */}
      <video
        ref={setVideoRef}
        src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/draggable-video.mp4"
        className="opacity-0 absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      />
    

      {isVideoReady && (
        <MaskedContainer
          size="large"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[60vw] h-[35vw] absolute top-[10vh] left-[10vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="medium"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[17vw] h-[9vw] max-md:h-[35vw] max-md:top-[30%] absolute top-[8%] left-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

    

      {isVideoReady && (
        <MaskedContainer
          size="extra1"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[35vw] h-[19vw] max-md:h-[50vw] absolute top-[8vh] max-md:top-[25vh] right-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="extra2"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[38vw] h-[22vw] absolute top-[50vh] left-[5vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}

      {isVideoReady && (
        <MaskedContainer
          size="extra3"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[25vw] h-[14vw] max-md:h-[25vh] absolute bottom-[20%] right-[10vw]"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}
        {isVideoReady && (
        <MaskedContainer
          size="small"
          initialPosition={{ x: 0, y: 0 }}
          className="w-[22vw] max-md:w-[45vw] max-md:h-[20vh] h-[12vw] absolute bottom-[15vh] max-md:left-[40%] left-1/2 -translate-x-1/2"
          video={videoElement}
          canvasSize={canvasSize}
          friction={friction}
          scaleOnDrag={scaleOnDrag}
          canvasBorderColor={canvasBorderColor}
          rounded={rounded}
          reducedMotion={prefersReducedMotion}
          onPositionUpdate={handlePositionUpdate}
          onHoverChange={handleHoverChange}
        />
      )}
    </div>
  );
}
