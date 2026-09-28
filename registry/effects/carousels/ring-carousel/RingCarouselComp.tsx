"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { ArrowLeft, ArrowRight } from "lucide-react";

gsap.registerPlugin(Draggable);

const prefersReducedMotion = () =>
 typeof window !== "undefined" &&
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const REDUCED_MOTION_FADE_DURATION = 0.16;

export type RingCarouselItem = { src: string; alt?: string; title?: string; name?: string } | string;

interface RingCarouselCompProps {
 items?: RingCarouselItem[];
 itemWidth?: number;
 itemHeight?: number;
 radius?: number;
 roundedness?: number;
 gap?: number;
 dragSensitivity?: number;
 momentum?: number;
 friction?: number;
 snap?: boolean;
 className?: string;
 renderItem?: (item: RingCarouselItem, index: number) => ReactNode;
 showNavigation?: boolean;
 showDots?: boolean;
 autoPlay?: boolean;
 autoPlayInterval?: number;
 pauseOnHover?: boolean;
}

const RingCarouselComp: React.FC<RingCarouselCompProps> = ({
 items = [],
 itemWidth = 700,
 itemHeight = 300,
 radius = 500,
 roundedness = 20,
 gap = 0,
 dragSensitivity = 0.35,
 momentum = 1,
 friction = 0.95,
 snap = true,
 className ="",
 renderItem,
 showNavigation = true,
 showDots = true,
 autoPlay = false,
 autoPlayInterval = 3000,
 pauseOnHover = true,
}) => {
 const containerRef = useRef<HTMLDivElement | null>(null);
 const ringRef = useRef<HTMLDivElement | null>(null);
 const draggerRef = useRef<HTMLDivElement | null>(null);
 const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
 const momentumFrameRef = useRef<number | null>(null);
 const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const velocityRef = useRef(0);
 const lastXRef = useRef(0);
 const isHoveredRef = useRef(false);
 const currentStepRef = useRef(0);

 const [activeIndex, setActiveIndex] = useState(0);
 const [isMobile, setIsMobile] = useState(false);
 const [reduceMotion, setReduceMotion] = useState(false);

 const totalItems = items.length;
 const resolvedItemWidth = isMobile ? itemWidth * 0.88 : itemWidth;
 const resolvedItemHeight = isMobile ? itemHeight * 0.88 : itemHeight;
 const resolvedRoundedness = Math.max(0, Number(roundedness) || 0);
 // Reduced motion still tracks the drag 1:1 - it's user-initiated, not
 // imposed motion. Only momentum/inertia after release (handled in
 // runMomentum below) and animated snaps are what actually get reduced.
 const resolvedDragSensitivity = dragSensitivity;
 const resolvedMomentum = momentum;

 const stepAngle = useMemo(() => {
 if (!totalItems) return 0;
 return 360 / totalItems;
 }, [totalItems]);

 const panelAngle = useMemo(() => {
 return stepAngle + gap;
 }, [stepAngle, gap]);

 const normalizeIndex = useCallback(
 (index: number) => {
 if (!totalItems) return 0;
 return ((index % totalItems) + totalItems) % totalItems;
 }, [totalItems]);

 const stopMomentum = useCallback(() => {
 if (momentumFrameRef.current) {
 cancelAnimationFrame(momentumFrameRef.current);
 momentumFrameRef.current = null;
 }
 }, []);

 const stopAutoplay = useCallback(() => {
 if (autoplayRef.current) {
 clearInterval(autoplayRef.current);
 autoplayRef.current = null;
 }
 }, []);

 const getRotationForStep = useCallback(
 (step: number) => {
 return 180 + step * stepAngle;
 }, [stepAngle]);

 const setActiveFromStep = useCallback(
 (step: number) => {
 setActiveIndex(normalizeIndex(step));
 }, [normalizeIndex]);

 const rotateToStep = useCallback(
 (step: number, animate: boolean = true) => {
 if (!ringRef.current || !totalItems) return;

 currentStepRef.current = step;
 setActiveFromStep(step);

 const targetRotation = getRotationForStep(step);

 if (animate && !reduceMotion) {
 gsap.to(ringRef.current, {
 rotationY: targetRotation,
 duration: 0.7,
 ease:"power3.out",
 });
 } else if (animate && reduceMotion) {
 gsap.killTweensOf(ringRef.current);
 gsap.to(ringRef.current, {
 opacity: 0.72,
 duration: REDUCED_MOTION_FADE_DURATION / 2,
 ease:"power2.out",
 onComplete: () => {
 gsap.set(ringRef.current, {
 rotationY: targetRotation,
 });
 gsap.to(ringRef.current, {
 opacity: 1,
 duration: REDUCED_MOTION_FADE_DURATION / 2,
 ease:"power2.out",
 });
 },
 });
 } else {
 gsap.killTweensOf(ringRef.current);
 gsap.set(ringRef.current, {
 rotationY: targetRotation,
 opacity: 1,
 });
 }
 }, [getRotationForStep, reduceMotion, setActiveFromStep, totalItems]);

 const updateStepFromRotation = useCallback(() => {
 if (!ringRef.current || !stepAngle) return;

 const currentRotation = Number(gsap.getProperty(ringRef.current,"rotationY"));
 const rawStep = Math.round((currentRotation - 180) / stepAngle);

 currentStepRef.current = rawStep;
 setActiveFromStep(rawStep);
 }, [setActiveFromStep, stepAngle]);

 const goToNext = useCallback(
 (fromAutoplay: boolean = false) => {
 stopMomentum();

 if (!fromAutoplay) {
 stopAutoplay();
 }

 rotateToStep(currentStepRef.current + 1, !reduceMotion);
 }, [reduceMotion, rotateToStep, stopAutoplay, stopMomentum]);

 const goToPrev = useCallback(() => {
 stopMomentum();
 stopAutoplay();
 rotateToStep(currentStepRef.current - 1, !reduceMotion);
 }, [reduceMotion, rotateToStep, stopAutoplay, stopMomentum]);

 const goToSlide = useCallback(
 (targetIndex: number) => {
 stopMomentum();
 stopAutoplay();

 const currentStep = currentStepRef.current;
 const currentVisualIndex = normalizeIndex(currentStep);

 const forwardDistance =
 (targetIndex - currentVisualIndex + totalItems) % totalItems;
 const backwardDistance =
 (currentVisualIndex - targetIndex + totalItems) % totalItems;

 const nextStep =
 forwardDistance <= backwardDistance
 ? currentStep + forwardDistance
 : currentStep - backwardDistance;

 rotateToStep(nextStep, !reduceMotion);
 }, [normalizeIndex, reduceMotion, rotateToStep, stopAutoplay, stopMomentum, totalItems]);

 const startAutoplay = useCallback(() => {
 if (!autoPlay || reduceMotion || totalItems <= 1) return;

 stopAutoplay();

 autoplayRef.current = setInterval(() => {
 if (pauseOnHover && isHoveredRef.current) return;
 goToNext(true);
 }, autoPlayInterval);
 }, [autoPlay, autoPlayInterval, goToNext, pauseOnHover, reduceMotion, stopAutoplay, totalItems]);

 useEffect(() => {
 const mediaQuery = window.matchMedia("(max-width: 639px)");
 const updateIsMobile = () => setIsMobile(mediaQuery.matches);

 updateIsMobile();
 mediaQuery.addEventListener("change", updateIsMobile);

 return () => {
 mediaQuery.removeEventListener("change", updateIsMobile);
 };
 }, []);

 useEffect(() => {
 const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

 const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
 const matches =
 "matches" in event
 ? event.matches
 : ((event as MediaQueryListEvent).currentTarget as MediaQueryList | null)?.matches ?? prefersReducedMotion();
 setReduceMotion(matches);
 };

 if (mediaQuery) {
 syncReducedMotion(mediaQuery);
 mediaQuery.addEventListener("change", syncReducedMotion);
 return () => mediaQuery.removeEventListener("change", syncReducedMotion);
 }

 setReduceMotion(prefersReducedMotion());
 }, []);

 useLayoutEffect(() => {
 if (!totalItems) return;

 const ring = ringRef.current;
 const dragger = draggerRef.current;
 const panels = itemRefs.current.filter(Boolean);

 if (!ring || !dragger || !panels.length) return;

 const updateRingRotation = (deltaX: number) => {
 const rotationDelta = deltaX * resolvedDragSensitivity;

 gsap.set(ring, {
 rotationY: `-=${rotationDelta}`,
 });

 updateStepFromRotation();
 };

 const runMomentum = () => {
 if (reduceMotion) {
 velocityRef.current = 0;
 if (snap && stepAngle > 0) {
 updateStepFromRotation();
 rotateToStep(currentStepRef.current, false);
 }
 return;
 }

 stopMomentum();

 const animate = () => {
 velocityRef.current *= friction;

 if (Math.abs(velocityRef.current) < 0.02) {
 velocityRef.current = 0;

 if (snap && stepAngle > 0) {
 updateStepFromRotation();
 rotateToStep(currentStepRef.current);
 }

 return;
 }

 gsap.set(ring, {
 rotationY: `-=${velocityRef.current}`,
 });

 updateStepFromRotation();
 momentumFrameRef.current = requestAnimationFrame(animate);
 };

 momentumFrameRef.current = requestAnimationFrame(animate);
 };

 const ctx = gsap.context(() => {
 gsap.set(dragger, { opacity: 0 });

 currentStepRef.current = 0;

 gsap.set(ring, {
 rotationY: getRotationForStep(0),
 transformStyle:"preserve-3d",
 });

 gsap.set(panels, {
 rotateY: (i: number) => i * -panelAngle,
 transformOrigin: `50% 50% ${radius}px`,
 z: -radius,
 width: resolvedItemWidth,
 height: resolvedItemHeight,
 left:"50%",
 top:"50%",
 xPercent: -50,
 yPercent: -50,
 backfaceVisibility:"hidden",
 transformStyle:"preserve-3d",
 });

 if (reduceMotion) {
 gsap.set(panels, {
 y: 0,
 opacity: 1,
 });
 } else {
 gsap.from(panels, {
 duration: 1.2,
 y: 120,
 opacity: 0,
 stagger: 0.08,
 ease:"expo.out",
 });
 }

 Draggable.create(dragger, {
 type:"x,y",
 trigger: dragger,
 onPress: function (e: any) {
 stopMomentum();
 stopAutoplay();

 const clientX = e.touches ? e.touches[0].clientX : e.clientX;
 lastXRef.current = clientX;
 velocityRef.current = 0;
 },
 onDrag: function (e: any) {
 const clientX = e.touches ? e.touches[0].clientX : e.clientX;
 const deltaX = clientX - lastXRef.current;

 updateRingRotation(deltaX);
 velocityRef.current = deltaX * resolvedMomentum;
 lastXRef.current = clientX;
 },
 onRelease: function () {
 gsap.set(dragger, { x: 0, y: 0 });
 runMomentum();

 if (!(pauseOnHover && isHoveredRef.current) && autoPlay && !reduceMotion) {
 startAutoplay();
 }
 },
 });
 }, containerRef);

 return () => {
 stopMomentum();
 ctx.revert();
 };
 }, [
 totalItems,
 resolvedItemWidth,
 resolvedItemHeight,
 radius,
 panelAngle,
 resolvedDragSensitivity,
 resolvedMomentum,
 friction,
 snap,
 stepAngle,
 autoPlay,
 pauseOnHover,
 autoPlayInterval,
 reduceMotion,
 updateStepFromRotation,
 rotateToStep,
 getRotationForStep,
 startAutoplay,
 stopAutoplay,
 stopMomentum,
 ]);

 useEffect(() => {
 if (autoPlay && !reduceMotion && totalItems > 1 && !(pauseOnHover && isHoveredRef.current)) {
 startAutoplay();
 } else {
 stopAutoplay();
 }

 return () => {
 stopAutoplay();
 };
 }, [autoPlay, autoPlayInterval, reduceMotion, totalItems, pauseOnHover, startAutoplay, stopAutoplay]);

 const activeItem = items[activeIndex];
 const activeLabel =
 typeof activeItem ==="string"
 ? null
 : activeItem?.alt || activeItem?.title || activeItem?.name || null;
 const slideAnnouncement = totalItems
 ? activeLabel
 ? `${activeLabel}, slide ${activeIndex + 1} of ${totalItems}`
 : `Slide ${activeIndex + 1} of ${totalItems}`
 :"";

 return (
 <div
 className={` relative h-screen w-full select-none overflow-hidden bg-black ${className}`}
 ref={containerRef}
 onMouseEnter={() => {
 isHoveredRef.current = true;
 if (pauseOnHover) stopAutoplay();
 }}
 onMouseLeave={() => {
 isHoveredRef.current = false;
 if (pauseOnHover && autoPlay && !reduceMotion) startAutoplay();
 }}
 >
 <div className="sr-only" aria-live="polite" aria-atomic="true">
 {slideAnnouncement}
 </div>
 <div className=" absolute left-1/2 top-[40%] max-md:top-[30%] h-[30vw] w-screen -translate-x-1/2 -translate-y-1/2 perspective-[2000px] transform-3d">
 <div className=" relative h-full w-full transform-3d" ref={ringRef}>
 {items.map((item, i) => {
 const isImage = typeof item ==="string";
 const imageSrc = isImage ? item : item?.src;
 const imageAlt = isImage ? `ring-item-${i}` : item?.alt || `ring-item-${i}`;

 return (
 <div
 key={i}
 className={` absolute overflow-hidden rounded-[20px] transform-3d will-change-transform ${
 activeIndex === i ?"is-active" :""
 }`}
 style={{ borderRadius: `${resolvedRoundedness}px` }}
 ref={(el) => { itemRefs.current[i] = el; }}
 >
 {renderItem ? (
 renderItem(item, i)
 ) : imageSrc ? (
 <img
 src={imageSrc}
 alt={imageAlt}
 className="pointer-events-none block h-full w-full select-none object-cover absolute inset-0"
 />
 ) : (
 item as ReactNode
 )}
 </div>
 );
 })}
 </div>

 <div className=" absolute inset-0 z-3 cursor-grab active:cursor-grabbing" ref={draggerRef} />
 </div>

 <div className=" pointer-events-none absolute inset-0 z-2 bg-[linear-gradient(to_right,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0)_20%,rgba(0,0,0,0)_80%,rgba(0,0,0,0.95)_100%)] max-[1025px]:hidden" />

 {showNavigation && totalItems > 1 && (
 <div className=" absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 gap-3 max-md:bottom-[10%]">
 <button
 type="button"
 className="flex h-[3.5vw] min-h-12 w-[3.5vw] min-w-12 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:bg-white/16 motion-reduce:transition-none max-[1025px]:h-14 max-[1025px]:w-14 max-md:h-[15vw] max-md:w-[15vw]"
 onClick={goToPrev}
 aria-label="Previous slide"
 >
 <ArrowLeft />
 </button>

 <button
 type="button"
 className="flex h-[3.5vw] min-h-12 w-[3.5vw] min-w-12 items-center justify-center rounded-full border border-white/20 bg-white/8 text-white backdrop-blur-[10px] transition-all duration-300 ease-in-out hover:bg-white/16 motion-reduce:transition-none max-[1025px]:h-14 max-[1025px]:w-14 max-md:h-[15vw] max-md:w-[15vw]"
 onClick={() => goToNext(false)}
 aria-label="Next slide"
 >
 <ArrowRight />
 </button>
 </div>
 )}

 {showDots && totalItems > 1 && (
 <div className="absolute bottom-[15%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-[1vw] rounded-full bg-white/6 px-4.5 py-3.5 backdrop-blur-[10px] max-[1025px]:bottom-[18%] max-[1025px]:gap-[2vw] max-[1025px]:px-4 max-[1025px]:py-3 max-md:bottom-[30%] max-md:px-3.5 max-md:py-2.5" aria-label="Slider pagination">
 {items.map((_, index) => (
 <button
 key={index}
 type="button"
 className={`flex h-4.5 w-fit cursor-pointer items-center justify-center rounded-full bg-transparent p-0 ${
 activeIndex === index ?"is-active" :""
 }`}
 onClick={() => goToSlide(index)}
 aria-label={`Go to slide ${index + 1}`}
 >
 <span
 className={`h-2.5 w-2.5 rounded-full bg-white/42 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none max-[1025px]:h-2.25 max-[1025px]:w-2.25 max-md:h-2 max-md:w-2 ${
 activeIndex === index
 ? "w-10.5 bg-white/92 max-[1025px]:w-9 max-md:w-7"
 : ""
 }`}
 />
 </button>
 ))}
 </div>
 )}
 </div>
 );
};

export default RingCarouselComp ;
