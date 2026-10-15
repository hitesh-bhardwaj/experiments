/* eslint-disable react-hooks/refs -- React Compiler / legacy-pattern rules: fixing risks changing animation timing (see eslint.config.mjs, issue #16); <img> kept for dynamic user-supplied sources. */
// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { prefersReducedMotion } from "@/lib/motion";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import React, { useLayoutEffect, useMemo, useRef } from "react";

import Image from "next/image";
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

gsap.registerPlugin(Draggable);

interface DraggableMarqueeItem {
    id?: string | number;
    src?: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
    imageClassName?: string;
}

interface DraggableMarqueeCompProps {
    items?: DraggableMarqueeItem[];
    speed?: number;
    repeatCount?: number;
    gapClassName?: string;
    className?: string;
    trackClassName?: string;
    itemClassName?: string;
    pauseOnHover?: boolean;
    renderItem?: (item: DraggableMarqueeItem, index: number) => React.ReactNode;
    throwMultiplier?: number;
    throwFriction?: number;
    maxThrowVelocity?: number;
    initialOffset?: number;
    loopStart?: number;
    loopEndMultiplier?: number;
}

const DraggableMarqueeComp = ({
    items = [],
    speed = 1,
    repeatCount = 3,
    gapClassName = "gap-6",
    className = "",
    trackClassName = "",
    itemClassName = "rounded-2xl",
    pauseOnHover = false,
    renderItem,

    // motion controls
    throwMultiplier = 2.8,
    throwFriction = 0.975,
    maxThrowVelocity = 60,

    // loop controls
    initialOffset = 0,
    loopStart = 0,
    loopEndMultiplier = -1.02,
}: DraggableMarqueeCompProps) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const dragRef = useRef<InstanceType<typeof Draggable> | null>(null);
    const motionConfigRef = useRef({
        speed,
        pauseOnHover,
        throwMultiplier,
        throwFriction,
        maxThrowVelocity,
    });

    motionConfigRef.current = {
        speed,
        pauseOnHover,
        throwMultiplier,
        throwFriction,
        maxThrowVelocity,
    };

    const duplicatedItems = useMemo(() => {
        return Array.from({ length: repeatCount }).flatMap(() => items);
    }, [items, repeatCount]);

    useLayoutEffect(() => {
        if (!rootRef.current || !trackRef.current || !items.length) return;

        const root = rootRef.current;
        const track = trackRef.current;

        let singleSetWidth = 0;
        let x = initialOffset;
        let throwVelocity = 0;
        let isPointerOver = false;
        let isDragging = false;
        let lastDragX = 0;
        let lastDragTime = 0;

        let wrapValue: (value: number) => number = (value) => value;
        let resizeRaf: number | null = null;

        // Reduced motion: keep the marquee draggable (user-initiated, not
        // imposed motion) but stop the automatic continuous auto-scroll.
        const reducedMotion = prefersReducedMotion();

        const observers: ResizeObserver[] = [];
        const setX = gsap.quickSetter(track, "x", "px");

        const getGap = () => {
            const styles = window.getComputedStyle(track);
            return parseFloat(String(styles.columnGap || styles.gap || 0));
        };

        const buildWrap = () => {
            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            wrapValue = gsap.utils.wrap(min, max);
        };

        const getProgressInLoop = () => {
            if (!singleSetWidth) return 0;

            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            const range = max - min;

            if (!range) return 0;

            let wrapped = x;
            while (wrapped < min) wrapped += range;
            while (wrapped > max) wrapped -= range;

            return (wrapped - min) / range;
        };

        const setProgressInLoop = (progress: number) => {
            if (!singleSetWidth) return;

            const min = singleSetWidth * loopEndMultiplier;
            const max = loopStart;
            const range = max - min;

            x = min + range * progress;
            x = wrapValue(x);
            setX(x);

            if (dragRef.current) {
                (dragRef.current as any).x = x;
            }
        };

        const measure = () => {
            const children = Array.from(track.children);
            const setSize = Math.floor(children.length / repeatCount);
            const firstSetChildren = children.slice(0, setSize);
            const gap = getGap();

            if (!firstSetChildren.length) return;

            const prevProgress = getProgressInLoop();

            const widths = firstSetChildren.reduce(
                (sum, child) => sum + child.getBoundingClientRect().width,
                0
            );

            singleSetWidth = widths + gap * Math.max(0, firstSetChildren.length - 1);

            buildWrap();

            if (!Number.isFinite(prevProgress)) {
                x = wrapValue(initialOffset);
                setX(x);
            } else {
                setProgressInLoop(prevProgress);
            }
        };

        const scheduleMeasure = () => {
            if (resizeRaf) cancelAnimationFrame(resizeRaf);
            resizeRaf = requestAnimationFrame(() => {
                measure();
            });
        };

        const update = () => {
            if (!isDragging) {
                const config = motionConfigRef.current;

                if (!reducedMotion && !(config.pauseOnHover && isPointerOver)) {
                    x -= config.speed;
                }

                x += throwVelocity;
                throwVelocity *= config.throwFriction;

                if (Math.abs(throwVelocity) < 0.01) {
                    throwVelocity = 0;
                }
            }

            x = wrapValue(x);
            setX(x);
        };

        measure();

        dragRef.current = Draggable.create(track, {
            type: "x",
            allowContextMenu: true,
            dragClickables: true,

            onPress() {
                isDragging = true;
                throwVelocity = 0;
                this.x = x;
                lastDragX = this.x;
                lastDragTime = performance.now();
            },

            onDrag() {
                const now = performance.now();
                const dx = this.x - lastDragX;
                const dt = now - lastDragTime;

                x = wrapValue(this.x);
                setX(x);
                this.x = x;

                if (dt > 0) {
                    // Reduced motion: dragging itself stays 1:1 (direct,
                    // user-initiated), but no momentum carries past release -
                    // it stops exactly where you let go instead of sliding on.
                    if (reducedMotion) {
                        throwVelocity = 0;
                    } else {
                        const sampledVelocity = (dx / dt) * 36.67;
                        const config = motionConfigRef.current;

                        throwVelocity = gsap.utils.clamp(
                            -config.maxThrowVelocity,
                            config.maxThrowVelocity,
                            sampledVelocity * config.throwMultiplier
                        );
                    }
                }

                lastDragX = this.x;
                lastDragTime = now;
            },

            onRelease() {
                isDragging = false;
            },
        })[0];

        const handleMouseEnter = () => {
            isPointerOver = true;
        };

        const handleMouseLeave = () => {
            isPointerOver = false;
        };

        root.addEventListener("mouseenter", handleMouseEnter);
        root.addEventListener("mouseleave", handleMouseLeave);

        const handleResize = () => {
            scheduleMeasure();
        };

        window.addEventListener("resize", handleResize);

        const children = Array.from(track.children);
        const setSize = Math.floor(children.length / repeatCount);
        const firstSetChildren = children.slice(0, setSize);

        const trackObserver = new ResizeObserver(() => {
            scheduleMeasure();
        });

        trackObserver.observe(track);
        observers.push(trackObserver);

        firstSetChildren.forEach((child) => {
            const ro = new ResizeObserver(() => {
                scheduleMeasure();
            });

            ro.observe(child);
            observers.push(ro);

            const imgs = child.querySelectorAll("img");

            imgs.forEach((img) => {
                if (!img.complete) {
                    img.addEventListener("load", scheduleMeasure);
                }
            });
        });

        gsap.ticker.add(update);

        // Pause only this marquee's ticker callback when the section is
        // offscreen or the tab is hidden - never sleep the global gsap.ticker,
        // which is shared by every other GSAP animation on the page.
        let tickerAttached = true;
        const setTickerAttached = (active: boolean) => {
            if (active === tickerAttached) return;
            tickerAttached = active;
            if (active) gsap.ticker.add(update);
            else gsap.ticker.remove(update);
        };
        const gate = createVisibilityGate({
            root,
            onChange: setTickerAttached,
        });
        setTickerAttached(gate.isActive);

        return () => {
            gate.destroy();

            window.removeEventListener("resize", handleResize);

            root.removeEventListener("mouseenter", handleMouseEnter);
            root.removeEventListener("mouseleave", handleMouseLeave);

            gsap.ticker.remove(update);

            if (resizeRaf) cancelAnimationFrame(resizeRaf);

            observers.forEach((observer) => observer.disconnect());

            const cleanupChildren = Array.from(track.children);

            cleanupChildren.forEach((child) => {
                const imgs = child.querySelectorAll("img");

                imgs.forEach((img) => {
                    img.removeEventListener("load", scheduleMeasure);
                });
            });

            if (dragRef.current) {
                dragRef.current.kill();
                dragRef.current = null;
            }
        };
    }, [
        items,
        repeatCount,
        initialOffset,
        loopStart,
        loopEndMultiplier,
    ]);

    if (!items.length) return null;

    return (
        <div
            ref={rootRef}
            className={`relative w-full overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
        >
            <div
                ref={trackRef}
                className={`flex w-max items-center ${gapClassName} ${trackClassName}`}
            >
                {duplicatedItems.map((item, index) => (
                    <div
                        key={`${item?.id || item?.src || "item"}-${index}`}
                        className={`shrink-0 ${itemClassName}`}
                    >
                        {renderItem ? (
                            renderItem(item, index % items.length)
                        ) : item.src ? (
                            <Image
                                src={item.src}
                                alt={item.alt || "marquee-item"}
                                width={item.width || 400}
                                height={item.height || 500}
                                className={`${item.imageClassName || "h-auto w-auto object-cover"} max-md:w-[320px] max-md:h-105`}
                                loading="eager"
                            />
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DraggableMarquee = ({
  speed = 7.2,
  pauseOnHover = false,
  throwMultiplier = 2.8,
  throwFriction = 0.975,
}) => {
  return (
        <section className="w-screen h-screen bg-black text-white flex flex-col justify-center items-center">
				<DraggableMarqueeComp
					items={marqueeImages}
					speed={speed}
					pauseOnHover={pauseOnHover}
					throwMultiplier={throwMultiplier}
					throwFriction={throwFriction}
					gapClassName="gap-[2vw] max-lg:gap-[4vw]"
					className="py-10"
					itemClassName="select-none"
				/>
				<div className="absolute bottom-[3vw] max-lg:bottom-[8vw] left-1/2 -translate-x-1/2 z-40 bg-white/8 backdrop-blur-sm px-4 py-2 rounded-full text-white text-[1.1vw] max-lg:text-[2.5vw] max-md:text-[3.5vw] text-center max-lg:rounded-[2vw] shadow-lg">
					Drag the strip left or right to reveal the scenes.
				</div>
			</section>
    );
};

const marqueeImages = [
	{
		id: 1,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
		alt: "Image 1",
		title: "image 1",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-lg:w-[40vw] max-lg:h-[60vw]    object-cover",
	},
	{
		id: 2,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
		alt: "Image 2",
		title: "image 2",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-lg:w-[40vw] max-lg:h-[60vw]    object-cover",
	},
	{
		id: 3,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
		alt: "Image 3",
		title: "image 3",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-lg:w-[40vw] max-lg:h-[60vw]    object-cover",
	},
	{
		id: 4,
		src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
		alt: "Image 4",
		title: "image 4",
		width: 420,
		height: 520,
		imageClassName: "w-[24vw] h-[30vw] rounded-2xl max-lg:w-[40vw] max-lg:h-[60vw]    object-cover",
	},
]
export default DraggableMarquee;
