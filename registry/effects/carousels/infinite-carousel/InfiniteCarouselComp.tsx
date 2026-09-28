"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

const prefersReducedMotion = () =>
 typeof window !=="undefined" &&
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

const REDUCED_MOTION_NAV_DURATION = 0.15;

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

/**
 * Returns a gsap.core.Timeline augmented with next/previous/current/toIndex/
 * updateIndex/times/draggable helpers (the official GSAP horizontalLoop
 * recipe) - typed loosely since it's an internal implementation detail, not
 * part of the component's public props.
 */
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

 if (config.draggable) {
 const proxy = document.createElement("div");
 const wrap = gsap.utils.wrap(0, 1);

 let ratio: number;
 let startProgress: number;
 let draggableInst: any;
 let dragSnap: number;
 let roundFactor: number;

 const align = () => {
 tl.progress(
 wrap(startProgress + (draggableInst.startX - draggableInst.x) * ratio)
 );
 };

 const syncIndex = () => tl.updateIndex();

 draggableInst = Draggable.create(proxy, {
 trigger: config.wrapperEl,
 type:"x",
 onPress() {
 startProgress = tl.progress();
 tl.progress(0);
 populateWidths();
 const totalWidthCache = getTotalWidth();
 ratio = 1 / totalWidthCache;
 dragSnap = totalWidthCache / length;
 roundFactor = Math.pow(
 10,
 ((dragSnap +"").split(".")[1] ||"").length
 );
 tl.progress(startProgress);
 // Re-evaluated per press so hovering in/out between drags is honored -
 // pauseOnHover stops the post-release momentum coast while the pointer
 // is still over the carousel, same as reduced motion does permanently.
 this.vars.inertia =
 config.pauseOnHover && config.isHoveredRef?.current
 ? false
 : !config.reduceMotion;
 },
 onDrag: align,
 onThrowUpdate: align,
 // Reduced motion drops the post-release momentum coast entirely, so the
 // carousel stops exactly where the drag ends instead of gliding on.
 inertia: !config.reduceMotion,
 snap: (value: any) => {
 const n =
 Math.round(parseFloat(value) / dragSnap) * dragSnap * roundFactor;
 return (n - (n % 1)) / roundFactor;
 },
 onRelease: syncIndex,
 onThrowComplete: () => {
 gsap.set(proxy, { x: 0 });
 syncIndex();
 },
 })[0];

 tl.draggable = draggableInst;
 }

 return tl;
}

interface InfiniteCarouselCompProps {
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
 pageClassName?: string;
 controlsClassName?: string;
 prevBtnClassName?: string;
 nextBtnClassName?: string;
 wrapperClassName?: string;
 itemClassName?: string;
 mobileBreakpoint?: number;
 mobileMode?: "gsap" | "wrap" | "swiper";
}

export default function InfiniteCarouselComp({
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

 pageClassName ="",
 controlsClassName ="",
 prevBtnClassName ="",
 nextBtnClassName ="",
 wrapperClassName ="",
 itemClassName ="",

 mobileBreakpoint = 640,
 mobileMode ="gsap",
}: InfiniteCarouselCompProps) {
 const wrapperRef = useRef<HTMLDivElement | null>(null);
 const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
 const loopRef = useRef<any>(null);
 const attemptsRef = useRef(0);
 const mobileCardRefs = useRef<(HTMLDivElement | null)[]>([]);
 const isAdjustingScrollRef = useRef(false);
 const isHoveredRef = useRef(false);

 const [isMobile, setIsMobile] = useState(false);
 const [activeIndex, setActiveIndex] = useState(0);
 const [reduceMotion, setReduceMotion] = useState(false);

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
 const isSwiperMode = isMobile && mobileMode ==="swiper";

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

 useEffect(() => {
 loopRef.current?.draggable?.kill();
 loopRef.current?.kill();
 loopRef.current = null;

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
 }, [childArray.length, draggable, isMobile, reduceMotion, speed, pauseOnHover, direction]);

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
 const firstItem = mobileCardRefs.current[childArray.length] || mobileCardRefs.current[0];

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

 const handleNext = () => {
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
 onPointerEnter={() => {
 isHoveredRef.current = true;
 }}
 onPointerLeave={() => {
 isHoveredRef.current = false;
 }}
 className={`relative flex min-h-25 max-[1025px]:pt-14 w-full flex-nowrap items-stretch overflow-hidden ${
 isWrapMode
 ? "flex-wrap justify-center gap-4 overflow-visible max-[1025px]:gap-3.5 max-md:gap-3"
 : ""
 } ${
 isSwiperMode
 ? "gap-3.5 overflow-x-auto overflow-y-hidden px-3 [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch] scrollbar-none [&::-webkit-scrollbar]:hidden max-[1025px]:gap-3 max-[1025px]:px-3 max-md:gap-2.5 max-md:px-2"
 : ""
 } ${wrapperClassName}`}
 style={wrapperStyle}
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
 </div>
 );
}
