// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import gsap from "gsap";

const prefersReducedMotion = () =>
 typeof window !=="undefined" &&
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const REDUCED_MOTION_NAV_DURATION = 0.15;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const damp = (current: number, target: number, smoothing: number, deltaTime: number) =>
 current + (target - current) * (1 - Math.exp(-smoothing * deltaTime));

interface HorizontalLoopConfig {
 repeat?: number;
 snap?: number | false;
 paddingRight?: string | number;
 draggable?: boolean;
 wrapperEl?: Element;
 onIndexChange?: (index: number) => void;
 reduceMotion?: boolean;
 reversed?: boolean;
 speed?: number;
 pauseOnHover?: boolean;
 isHoveredRef?: { current: boolean };
}


function horizontalLoop(items: HTMLElement[], config: HorizontalLoopConfig = {}): any {
 items[0].getBoundingClientRect();

 const tl: any = gsap.timeline({
 repeat: config.repeat,
 paused: true,
 defaults: { ease:"none" },
 onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
 });

 const length = items.length;
 const startX = items[0].offsetLeft;
 const times: number[] = [];
 const widths: number[] = [];
 const xPercents: number[] = [];
 let curIndex = 0;

 const pixelsPerSecond = 100 * Math.max(config.speed ?? 1, 0.01);
 const snap =
 config.snap === false ? ((v: number) => v) : gsap.utils.snap(config.snap || 1);

 const populateWidths = () =>
 items.forEach((el, i) => {
 widths[i] = parseFloat(gsap.getProperty(el,"width","px") as string);
 xPercents[i] = snap(
 (parseFloat(gsap.getProperty(el,"x","px") as string) / widths[i]) * 100 +
 (gsap.getProperty(el,"xPercent") as number)
 );
 });

 const getTotalWidth = () =>
 items[length - 1].offsetLeft +
 (xPercents[length - 1] / 100) * widths[length - 1] -
 startX +
 items[length - 1].offsetWidth *
 (gsap.getProperty(items[length - 1],"scaleX") as number) +
 (parseFloat(config.paddingRight as string) || 0);

 populateWidths();
 if (!widths[0]) return null;

 gsap.set(items, { xPercent: (i: number) => xPercents[i] });
 gsap.set(items, { x: 0 });

 const totalWidth = getTotalWidth();

 for (let i = 0; i < length; i++) {
 const item = items[i];
 const curX = (xPercents[i] / 100) * widths[i];
 const distanceToStart = item.offsetLeft + curX - startX;
 const distanceToLoop =
 distanceToStart + widths[i] * (gsap.getProperty(item,"scaleX") as number);

 tl.to(
 item,
 {
 xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
 duration: distanceToLoop / pixelsPerSecond,
 },
 0
 )
 .fromTo(
 item,
 {
 xPercent: snap(
 ((curX - distanceToLoop + totalWidth) / widths[i]) * 100
 ),
 },
 {
 xPercent: xPercents[i],
 duration:
 (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
 immediateRender: false,
 },
 distanceToLoop / pixelsPerSecond
 )
 .add("label" + i, distanceToStart / pixelsPerSecond);

 times[i] = distanceToStart / pixelsPerSecond;
 }

 function toIndex(index: number, vars: Record<string, any> = {}) {
 
 tl.stopDragTick?.();

 if (Math.abs(index - curIndex) > length / 2) {
 index += index > curIndex ? -length : length;
 }

 const newIndex = gsap.utils.wrap(0, length, index);
 let time = times[newIndex];

 if (time > tl.time() !== index > curIndex) {
 vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
 time += tl.duration() * (index > curIndex ? 1 : -1);
 }

 curIndex = newIndex;
 config.onIndexChange?.(newIndex);
 vars.overwrite = true;
 return tl.tweenTo(time, vars);
 }

 tl.next = (vars: Record<string, any>) => toIndex(curIndex + 1, vars);
 tl.previous = (vars: Record<string, any>) => toIndex(curIndex - 1, vars);
 tl.current = () => curIndex;
 tl.toIndex = (index: number, vars: Record<string, any>) => toIndex(index, vars);
 tl.updateIndex = () => {
 curIndex = gsap.utils.wrap(0, length, Math.round(tl.progress() * length));
 config.onIndexChange?.(curIndex);
 };
 tl.times = times;

 tl.progress(1, true).progress(0, true);

 if (config.reversed) {
 tl.vars.onReverseComplete();
 tl.reverse();
 }

 if (config.draggable && config.wrapperEl) {
 const wrap = gsap.utils.wrap(0, 1);
 const wrapperEl = config.wrapperEl as HTMLElement;

 let ratio = 0;
 let target = 0;
 let current = 0;
 let dragSnap = 0;
 let lastTime = 0;
 let frameId = 0;
 let isPointerDown = false;
 let pointerId: number | null = null;
 let startClientX = 0;
 let startTarget = 0;
 let settleTimer = 0;

 const ensureRatio = () => {
 if (ratio) return;
 populateWidths();
 const totalWidthCache = getTotalWidth();
 ratio = 1 / totalWidthCache;
 dragSnap = totalWidthCache / length;
 };

 const syncIndex = () => tl.updateIndex();

 const snapTargetToNearest = () => {
 ensureRatio();
 const totalWidthCache = 1 / ratio;
 const px = target * totalWidthCache;
 target = (Math.round(px / dragSnap) * dragSnap) / totalWidthCache;
 };

 const tick = () => {
 const now = performance.now();
 const deltaTime = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
 lastTime = now;

 current = config.reduceMotion
 ? target
 : damp(current, target, 14, deltaTime);

 tl.progress(wrap(current));
 syncIndex();

 if (!isPointerDown && Math.abs(current - target) < 0.0002) {
 current = target;
 tl.progress(wrap(current));
 syncIndex();
 frameId = 0;
 lastTime = 0;
 return;
 }

 frameId = requestAnimationFrame(tick);
 };

 const ensureTicking = () => {
 if (!frameId) frameId = requestAnimationFrame(tick);
 };

 tl.stopDragTick = () => {
 window.clearTimeout(settleTimer);
 if (frameId) {
 cancelAnimationFrame(frameId);
 frameId = 0;
 lastTime = 0;
 }
 };

 // External nudge used by wheel input, kept continuous the same way drag
 // is, instead of jumping whole slides per gesture.
 tl.scrubBy = (deltaPixels: number) => {
 ensureRatio();
 current = target = tl.progress();
 target += deltaPixels * ratio;
 ensureTicking();
 };
 tl.snapToNearest = () => {
 ensureRatio();
 current = target = tl.progress();
 snapTargetToNearest();
 ensureTicking();
 };

 const onPointerDown = (event: PointerEvent) => {
 ensureRatio();
 isPointerDown = true;
 pointerId = event.pointerId;
 startClientX = event.clientX;
 current = target = tl.progress();
 startTarget = target;
 window.clearTimeout(settleTimer);
 wrapperEl.setPointerCapture(event.pointerId);
 };

 const onPointerMove = (event: PointerEvent) => {
 if (!isPointerDown || event.pointerId !== pointerId) return;
 const deltaX = event.clientX - startClientX;
 target = startTarget - deltaX * ratio;
 ensureTicking();
 };

 const onPointerUp = (event: PointerEvent) => {
 if (!isPointerDown || event.pointerId !== pointerId) return;
 isPointerDown = false;
 pointerId = null;
 wrapperEl.releasePointerCapture(event.pointerId);
 const stillHovered = config.pauseOnHover && config.isHoveredRef?.current;
 window.clearTimeout(settleTimer);
 settleTimer = window.setTimeout(() => {
 snapTargetToNearest();
 if (config.reduceMotion || stillHovered) current = target;
 ensureTicking();
 }, config.reduceMotion || stillHovered ? 0 : 80);
 };

 wrapperEl.addEventListener("pointerdown", onPointerDown);
 wrapperEl.addEventListener("pointermove", onPointerMove);
 wrapperEl.addEventListener("pointerup", onPointerUp);
 wrapperEl.addEventListener("pointercancel", onPointerUp);

 tl.draggable = {
 kill: () => {
 wrapperEl.removeEventListener("pointerdown", onPointerDown);
 wrapperEl.removeEventListener("pointermove", onPointerMove);
 wrapperEl.removeEventListener("pointerup", onPointerUp);
 wrapperEl.removeEventListener("pointercancel", onPointerUp);
 tl.stopDragTick();
 },
 };
 }

 return tl;
}

interface SmoothInfiniteCarouselProps {
 children?: ReactNode;
 draggable?: boolean;
 showNav?: boolean;
 speed?: number;
 pauseOnHover?: boolean;
 direction?: "left" | "right";
 prevLabel?: ReactNode;
 nextLabel?: ReactNode;
 pageStyle?: CSSProperties;
 controlsStyle?: CSSProperties;
 prevBtnStyle?: CSSProperties;
 nextBtnStyle?: CSSProperties;
  wrapperStyle?: CSSProperties;
  itemStyle?: CSSProperties;
  progressTrackStyle?: CSSProperties;
  progressThumbStyle?: CSSProperties;
  pageClassName?: string;
  controlsClassName?: string;
  prevBtnClassName?: string;
  nextBtnClassName?: string;
  wrapperClassName?: string;
  itemClassName?: string;
  progressTrackClassName?: string;
  progressThumbClassName?: string;
  mobileBreakpoint?: number;
  mobileMode?: "gsap" | "wrap" | "swiper";
  showProgress?: boolean;
  loop?: boolean;
  smoothness?: number;
}

export default function SmoothInfiniteCarousel({
 children,
 draggable = true,
 showNav = true,
 speed = 1,
 pauseOnHover = true,
 direction ="left",
 prevLabel ="← Prev",
 nextLabel ="Next →",

 pageStyle = {},
 controlsStyle = {},
 prevBtnStyle = {},
 nextBtnStyle = {},
 wrapperStyle = {},
 itemStyle = {},
 progressTrackStyle = {},
 progressThumbStyle = {},

 pageClassName ="",
 controlsClassName ="",
 prevBtnClassName ="",
 nextBtnClassName ="",
 wrapperClassName ="",
 itemClassName ="",
 progressTrackClassName ="",
 progressThumbClassName ="",

 mobileBreakpoint = 640,
 mobileMode ="gsap",
 showProgress = false,
 loop = true,
 smoothness = 12,
}: SmoothInfiniteCarouselProps) {
 const wrapperRef = useRef<HTMLDivElement | null>(null);
 const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
 const progressThumbRef = useRef<HTMLDivElement | null>(null);
 const loopRef = useRef<any>(null);
 const attemptsRef = useRef(0);
 const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);
 const isAdjustingScrollRef = useRef(false);
 const isHoveredRef = useRef(false);
 const finiteDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
 const loopWheelSettleRef = useRef(0);
 const animateFiniteScrollRef = useRef<() => void>(() => {});
 const finiteSmoothRef = useRef({
 target: 0,
 current: 0,
 lastTime: 0,
 frameId: 0,
 isAnimating: false,
 previousPointerX: 0,
 });

 const [isMobile, setIsMobile] = useState(false);
 const [activeIndex, setActiveIndex] = useState(0);
 const [reduceMotion, setReduceMotion] = useState(false);
 const [finiteProgress, setFiniteProgress] = useState({ width: 100, left: 0 });

 const childArray: any[] = useMemo(() => {
 return Array.isArray(children)
 ? children.flat().filter(Boolean)
 : children
 ? [children]
 : [];
 }, [children]);

 const slideCount = childArray.length;
 const activeChild = slideCount ? childArray[activeIndex] : null;
 const identifyingText =
 activeChild?.props?.title ||
 activeChild?.props?.["aria-label"] ||
 activeChild?.props?.alt ||
 null;
 const slideAnnouncement = slideCount
 ? identifyingText
 ? `${identifyingText}, slide ${activeIndex + 1} of ${slideCount}`
 : `Slide ${activeIndex + 1} of ${slideCount}`
 :"";
 const isWrapMode = isMobile && mobileMode ==="wrap";
 const isSwiperMode = loop && isMobile && mobileMode ==="swiper";
 const isFiniteMode = !loop;
 const progressWidth = isFiniteMode ? finiteProgress.width : slideCount ? 100 / slideCount : 100;
 const progressLeft = isFiniteMode ? finiteProgress.left : slideCount ? activeIndex * progressWidth : 0;

 const mobileLoopItems = useMemo(() => {
 if (!isSwiperMode) return childArray;
 return [...childArray, ...childArray, ...childArray];
 }, [childArray, isSwiperMode]);

 useEffect(() => {
 const checkMode = () => {
 setIsMobile(window.innerWidth <= mobileBreakpoint);
 };

 checkMode();
 window.addEventListener("resize", checkMode);

 return () => window.removeEventListener("resize", checkMode);
 }, [mobileBreakpoint]);

 useEffect(() => {
 const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

 const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
 setReduceMotion("matches" in event ? event.matches : prefersReducedMotion());
 };

 if (!mediaQuery) return;

 syncReducedMotion(mediaQuery);
 mediaQuery.addEventListener("change", syncReducedMotion);
 return () => mediaQuery.removeEventListener("change", syncReducedMotion);
 }, []);

 useEffect(() => {
 itemRefs.current = itemRefs.current.slice(0, childArray.length);
 mobileCardRefs.current = mobileCardRefs.current.slice(0, mobileLoopItems.length);
 }, [childArray.length, mobileLoopItems.length]);

 const updateFiniteProgress = useCallback(() => {
 const wrapper = wrapperRef.current;
 if (!wrapper) return;

 const smooth = finiteSmoothRef.current;
 const width = Math.min(100, (wrapper.clientWidth / wrapper.scrollWidth) * 100);
 const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
 const ratio = maxScroll > 0 ? clamp(-smooth.current / maxScroll, 0, 1) : 0;
 const nextIndex = slideCount
 ? Math.min(slideCount - 1, Math.max(0, Math.round(ratio * (slideCount - 1))))
 : 0;
 const left = ratio * (100 - width);

 if (progressThumbRef.current) {
 progressThumbRef.current.style.width = `${width}%`;
 progressThumbRef.current.style.left = `${left}%`;
 }

 setFiniteProgress({ width, left });
 setActiveIndex(nextIndex);
 }, [slideCount]);

 const getFiniteMaxScroll = useCallback(() => {
 const wrapper = wrapperRef.current;
 if (!wrapper) return 0;
 return Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
 }, []);

 const stopFiniteSmoothing = useCallback(() => {
 const smooth = finiteSmoothRef.current;
 if (smooth.frameId) {
 cancelAnimationFrame(smooth.frameId);
 }
 smooth.frameId = 0;
 smooth.isAnimating = false;
 smooth.lastTime = 0;
 }, []);

 const animateFiniteScroll = useCallback(() => {
 const wrapper = wrapperRef.current;
 const smooth = finiteSmoothRef.current;
 if (!wrapper) return;

 const now = performance.now();
 const deltaTime = smooth.lastTime ? Math.min((now - smooth.lastTime) / 1000, 0.05) : 0.016;
 smooth.lastTime = now;

 const maxScroll = getFiniteMaxScroll();
 const target = clamp(smooth.target, -maxScroll, 0);
 smooth.target = target;
 smooth.current = reduceMotion ? target : damp(smooth.current, target, Math.max(1, smoothness), deltaTime);

 if (Math.abs(smooth.current - target) < 0.35) {
 smooth.current = target;
 }

 itemRefs.current.forEach((item) => {
 if (!item) return;
 item.style.transform = `translate3d(${smooth.current}px, 0, 0)`;
 });
 updateFiniteProgress();

 if (smooth.current !== target) {
 smooth.frameId = requestAnimationFrame(animateFiniteScrollRef.current);
 return;
 }

 smooth.frameId = 0;
 smooth.isAnimating = false;
 smooth.lastTime = 0;
 }, [getFiniteMaxScroll, reduceMotion, smoothness, updateFiniteProgress]);

 useEffect(() => {
 animateFiniteScrollRef.current = animateFiniteScroll;
 }, [animateFiniteScroll]);

 const setFiniteTarget = useCallback((target: number) => {
 const wrapper = wrapperRef.current;
 if (!wrapper) return;

 const smooth = finiteSmoothRef.current;
 smooth.target = clamp(target, -getFiniteMaxScroll(), 0);
 if (!smooth.isAnimating) {
 smooth.isAnimating = true;
 smooth.frameId = requestAnimationFrame(animateFiniteScroll);
 }
 }, [animateFiniteScroll, getFiniteMaxScroll]);

 useEffect(() => {
 loopRef.current?.draggable?.kill();
 loopRef.current?.kill();
 loopRef.current = null;

 if (!loop) return;
 if (!childArray.length) return;

 attemptsRef.current = 0;

 function tryInit() {
 const items = itemRefs.current.filter(Boolean) as HTMLElement[];
 if (!items.length || !wrapperRef.current) return;

 const loop = horizontalLoop(items, {
 draggable,
 reduceMotion,
 speed,
 pauseOnHover,
 isHoveredRef,
 reversed: direction ==="right",
 wrapperEl: wrapperRef.current,
 onIndexChange: setActiveIndex,
 });

 if (!loop) {
 if (attemptsRef.current < 10) {
 attemptsRef.current += 1;
 requestAnimationFrame(tryInit);
 }
 return;
 }

 loopRef.current = loop;
 setActiveIndex(loop.current());
 }

 const raf = requestAnimationFrame(tryInit);

 return () => {
 cancelAnimationFrame(raf);
 loopRef.current?.draggable?.kill();
 loopRef.current?.kill();
 loopRef.current = null;
 attemptsRef.current = 0;
 };
 }, [childArray.length, draggable, isMobile, reduceMotion, speed, pauseOnHover, direction, loop]);

 useEffect(() => {
 if (!isFiniteMode) return;

 const smooth = finiteSmoothRef.current;
 if (wrapperRef.current) {
 smooth.current = clamp(smooth.current, -getFiniteMaxScroll(), 0);
 smooth.target = clamp(smooth.target, -getFiniteMaxScroll(), 0);
 }
 updateFiniteProgress();
 window.addEventListener("resize", updateFiniteProgress);
 return () => {
 stopFiniteSmoothing();
 itemRefs.current.forEach((item) => {
 if (!item) return;
 item.style.transform = "";
 });
 window.removeEventListener("resize", updateFiniteProgress);
 };
 }, [getFiniteMaxScroll, isFiniteMode, stopFiniteSmoothing, updateFiniteProgress]);

 const handleFinitePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
 if (!isFiniteMode || !draggable || !wrapperRef.current) return;

 stopFiniteSmoothing();
 const smooth = finiteSmoothRef.current;
 smooth.current = clamp(smooth.current, -getFiniteMaxScroll(), 0);
 smooth.target = clamp(smooth.target, -getFiniteMaxScroll(), 0);
 smooth.previousPointerX = event.clientX;
 finiteDragRef.current = {
 pointerId: event.pointerId,
 startX: event.clientX,
 startScrollLeft: smooth.target,
 };
 wrapperRef.current.setPointerCapture(event.pointerId);
 };

 const handleFinitePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
 const drag = finiteDragRef.current;
 const wrapper = wrapperRef.current;
 const smooth = finiteSmoothRef.current;
 if (!isFiniteMode || !drag || !wrapper || drag.pointerId !== event.pointerId) return;

 event.preventDefault();
 smooth.previousPointerX = event.clientX;
 setFiniteTarget(drag.startScrollLeft + (event.clientX - drag.startX));
 };

 const handleFinitePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
 const drag = finiteDragRef.current;
 const wrapper = wrapperRef.current;
 if (!isFiniteMode || !drag || !wrapper || drag.pointerId !== event.pointerId) return;

 wrapper.releasePointerCapture(event.pointerId);
 finiteDragRef.current = null;
 updateFiniteProgress();
 };

 const handleFiniteWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
 if (!isFiniteMode || !wrapperRef.current) return;

 const horizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
 if (!horizontalIntent && !event.shiftKey) return;

 event.preventDefault();
 const delta = horizontalIntent ? event.deltaX : event.deltaY;
 setFiniteTarget(finiteSmoothRef.current.target - delta);
 };

 // Wheel/trackpad input scrubs the loop's progress directly and continuously
 // (same mechanism drag uses), rather than jumping whole slides per gesture -
 // this is what makes it feel freely movable instead of stepped. Once wheel
 // events stop arriving for a beat, it settles to the nearest slide.
 const handleLoopWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
 if (isFiniteMode || isWrapMode || !loopRef.current) return;

 const horizontalIntent = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
 const delta = horizontalIntent ? event.deltaX : event.deltaY;
 if (!horizontalIntent && !event.shiftKey && Math.abs(delta) < 4) return;

 event.preventDefault();

 if (reduceMotion) {
 loopRef.current.scrubBy(delta * 1.6);
 loopRef.current.updateIndex();
 } else {
 loopRef.current.scrubBy(delta * 2.2);
 }

 window.clearTimeout(loopWheelSettleRef.current);
 loopWheelSettleRef.current = window.setTimeout(() => {
 loopRef.current?.snapToNearest();
 }, reduceMotion ? 60 : 140);
 };

 useEffect(() => {
 if (!isSwiperMode || !wrapperRef.current || !childArray.length) return;

 const wrapper = wrapperRef.current;

 const setInitialScroll = () => {
 const firstMiddleItem = mobileCardRefs.current[childArray.length];
 if (!firstMiddleItem) return;

 isAdjustingScrollRef.current = true;
 wrapper.scrollLeft = firstMiddleItem.offsetLeft;
 requestAnimationFrame(() => {
 isAdjustingScrollRef.current = false;
 });
 };

 const raf = requestAnimationFrame(setInitialScroll);
 return () => cancelAnimationFrame(raf);
 }, [isSwiperMode, childArray.length]);

 useEffect(() => {
 if (!isSwiperMode || !wrapperRef.current || !childArray.length) return;

 const wrapper = wrapperRef.current;

 const handleScroll = () => {
 if (isAdjustingScrollRef.current) return;

 const oneSetWidth =
 wrapper.scrollWidth / 3;

 const leftBoundary = oneSetWidth * 0.5;
 const rightBoundary = oneSetWidth * 1.5;

 if (wrapper.scrollLeft < leftBoundary) {
 isAdjustingScrollRef.current = true;
 wrapper.scrollLeft += oneSetWidth;
 requestAnimationFrame(() => {
 isAdjustingScrollRef.current = false;
 });
 } else if (wrapper.scrollLeft > rightBoundary) {
 isAdjustingScrollRef.current = true;
 wrapper.scrollLeft -= oneSetWidth;
 requestAnimationFrame(() => {
 isAdjustingScrollRef.current = false;
 });
 }

 if (!childArray.length) return;

 const center = wrapper.scrollLeft + wrapper.clientWidth / 2;
 let closestIndex = 0;
 let closestDistance = Infinity;

 mobileCardRefs.current.forEach((el, i) => {
 if (!el) return;
 const cardCenter = el.offsetLeft + el.offsetWidth / 2;
 const distance = Math.abs(cardCenter - center);
 if (distance < closestDistance) {
 closestDistance = distance;
 closestIndex = i % childArray.length;
 }
 });

 setActiveIndex(closestIndex);
 };

 wrapper.addEventListener("scroll", handleScroll, { passive: true });
 return () => wrapper.removeEventListener("scroll", handleScroll);
 }, [isSwiperMode, childArray.length]);

 const getMobileStepAmount = () => {
 const wrapper = wrapperRef.current;
 const firstItem = isFiniteMode
 ? itemRefs.current[0]
 : mobileCardRefs.current[childArray.length] || mobileCardRefs.current[0];

 if (!wrapper || !firstItem) return 0;

 const styles = getComputedStyle(wrapper);
 const gap =
 parseFloat(styles.columnGap) ||
 parseFloat(styles.gap) ||
 0;

 return firstItem.offsetWidth + gap;
 };

 const scrollMobileByCard = (direction: number) => {
 if (!wrapperRef.current) return;

 const amount = getMobileStepAmount();
 if (!amount) return;

 wrapperRef.current.scrollBy({
 left: direction * amount,
 behavior: reduceMotion ?"auto" :"smooth",
 });
 };

 const scrollFiniteByCard = (direction: number) => {
 if (!wrapperRef.current) return;

 const amount = getMobileStepAmount();
 if (!amount) return;

 setFiniteTarget(finiteSmoothRef.current.target - direction * amount);
 };

 const handleNext = () => {
 if (isFiniteMode) {
 scrollFiniteByCard(1);
 return;
 }

 if (isSwiperMode) {
 scrollMobileByCard(1);
 return;
 }

 if (isWrapMode) return;

 loopRef.current?.next(
 reduceMotion
 ? { duration: REDUCED_MOTION_NAV_DURATION, ease:"power2.out" }
 : { duration: 0.4, ease:"power1.inOut" }
 );
 };

 const handlePrev = () => {
 if (isFiniteMode) {
 scrollFiniteByCard(-1);
 return;
 }

 if (isSwiperMode) {
 scrollMobileByCard(-1);
 return;
 }

 if (isWrapMode) return;

 loopRef.current?.previous(
 reduceMotion
 ? { duration: REDUCED_MOTION_NAV_DURATION, ease:"power2.out" }
 : { duration: 0.4, ease:"power1.inOut" }
 );
 };

 // Arrow keys drive the same handleNext/handlePrev used by the nav buttons
 // and wheel/drag settle, so keyboard nav gets identical smooth motion.
 const handleWrapperKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
 if (event.key === "ArrowRight") {
 event.preventDefault();
 handleNext();
 } else if (event.key === "ArrowLeft") {
 event.preventDefault();
 handlePrev();
 }
 };

 return (
 <div className={`flex w-full flex-col pb-4 items-stretch justify-start gap-4 max-[1025px]:gap-4 max-md:gap-3 max-md:pb-2 ${pageClassName}`} style={pageStyle}>
 <div className="sr-only" aria-live="polite" aria-atomic="true">
 {slideAnnouncement}
 </div>
 {showNav && !isWrapMode && (
 <div
 className={`flex w-[95%] items-center justify-end gap-4 max-[1025px]:w-full max-[1025px]:justify-center max-[1025px]:px-3 max-md:gap-3 max-md:px-2 ${controlsClassName}`}
 style={controlsStyle}
 >
 <button
 className={`flex size-14 min-h-11 min-w-11 cursor-pointer items-center justify-center border border-neutral-900 bg-transparent text-neutral-900 transition-colors duration-200 ease-in-out hover:bg-neutral-900 hover:text-white max-[1025px]:size-14 max-md:size-14 ${prevBtnClassName}`}
 style={prevBtnStyle}
 onClick={handlePrev}
 type="button"
 >
 {prevLabel}
 </button>

 <button
 className={`flex size-14 min-h-11 min-w-11 cursor-pointer items-center justify-center border border-neutral-900 bg-transparent text-neutral-900 transition-colors duration-200 ease-in-out hover:bg-neutral-900 hover:text-white max-[1025px]:size-14 max-md:size-14 ${nextBtnClassName}`}
 style={nextBtnStyle}
 onClick={handleNext}
 type="button"
 >
 {nextLabel}
 </button>
 </div>
 )}

 <div
 ref={wrapperRef}
 tabIndex={isWrapMode ? undefined : 0}
 role={isWrapMode ? undefined : "group"}
 aria-label={isWrapMode ? undefined : "Carousel"}
 onKeyDown={isWrapMode ? undefined : handleWrapperKeyDown}
 onWheel={isFiniteMode ? handleFiniteWheel : handleLoopWheel}
 onPointerDown={handleFinitePointerDown}
 onPointerMove={handleFinitePointerMove}
 onPointerUp={handleFinitePointerEnd}
 onPointerCancel={handleFinitePointerEnd}
 onDragStart={(event) => {
 if (isFiniteMode) event.preventDefault();
 }}
 onPointerEnter={() => {
 isHoveredRef.current = true;
 }}
 onPointerLeave={() => {
 isHoveredRef.current = false;
 }}
 className={`relative flex min-h-25 max-[1025px]:pt-14 w-full flex-nowrap items-stretch overflow-hidden outline-none ${
 isFiniteMode
 ? "touch-pan-y overflow-hidden select-none"
 : ""
 } ${
 isWrapMode
 ? "flex-wrap justify-center gap-4 overflow-visible max-[1025px]:gap-3.5 max-md:gap-3"
 : ""
 } ${
 isSwiperMode
 ? "gap-3.5 overflow-x-auto overflow-y-hidden px-3 [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch] scrollbar-none [&::-webkit-scrollbar]:hidden max-[1025px]:gap-3 max-[1025px]:px-3 max-md:gap-2.5 max-md:px-2"
 : ""
 } ${wrapperClassName}`}
 style={isFiniteMode ? { ...wrapperStyle, overflow: "hidden", touchAction: "pan-y" } : wrapperStyle}
 >
 {(isSwiperMode ? mobileLoopItems : childArray).map((child, i) => {
 const realIndex = childArray.length ? i % childArray.length : i;

 return (
 <div
 key={`${realIndex}-${i}`}
 ref={(el) => {
 if (isSwiperMode) {
 mobileCardRefs.current[i] = el;
 } else {
 itemRefs.current[i] = el;
 }
 }}
 className={`relative shrink-0 select-none ${isWrapMode ? "transform-[none!important]" : ""} ${isSwiperMode ? "snap-center snap-always" : ""} ${itemClassName}`}
 style={itemStyle}
 aria-hidden={isSwiperMode && (i < childArray.length || i >= childArray.length * 2)}
 >
 {child}
 </div>
 );
 })}
 </div>

 {showProgress && (
 <div
 className={`relative w-[50vw] overflow-hidden rounded-full bg-[#e5e5e5] ${progressTrackClassName}`}
 style={progressTrackStyle}
 aria-hidden="true"
 >
 <div
 ref={progressThumbRef}
 className={`absolute inset-y-0 rounded-full bg-black ${
 isFiniteMode ? "" : "transition-[left,width] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]"
 } ${progressThumbClassName}`}
 style={{
 width: `${progressWidth}%`,
 left: `${progressLeft}%`,
 ...progressThumbStyle,
 }}
 />
 </div>
 )}
 </div>
 );
}
