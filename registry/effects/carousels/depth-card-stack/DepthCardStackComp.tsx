"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SliderCard from "./SliderCard";

const CARD_W = 300;
const CARD_H = 450;
const TABLET_CARD_W = 340;
const TABLET_CARD_H = 500;
const AUTO_PLAY_DELAY = 5000;
const DEFAULT_DURATION = 0.55;
const DEFAULT_LERP = 0.18;
const DEFAULT_SMOOTHNESS = 0.4;

function clampNumber(value: number, min: number, max: number, fallback: number) {
 const number = Number(value);
 if (!Number.isFinite(number)) return fallback;
 return Math.min(Math.max(number, min), max);
}

/**
 * @typedef {Object} DepthCardStackCompProps
 * @property {DepthCardStackCard[]} cards
 */

/**
 * @typedef {Object} SlotProps
 * @property {number} x
 * @property {number} y
 * @property {number} rotateX
 * @property {number} rotateZ
 * @property {number} rotateY
 * @property {number} scale
 * @property {number} opacity
 * @property {number} zIndex
 */

/**
 * @param {number|null} slot
 * @returns {SlotProps}
 */
function getSlotProps(slot: number | null) {
 switch (slot) {
 case 0:
 return { x: 0, y: 0, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1, opacity: 1, zIndex: 20 };
 case 1:
 return { x: 20, y: -20, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.9, opacity: 1, zIndex: 10 };
 case 2:
 return { x: 35, y: -40, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.83, opacity: 0.9, zIndex: 8 };
 case -1:
 return { x: -20, y: -20, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.9, opacity: 1, zIndex: 10 };
 case -2:
 return { x: -35, y: -40, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.83, opacity: 0.9, zIndex: 8 };
 default:
 return { x: 0, y: -30, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 0.75, opacity: 0, zIndex: 0 };
 }
}

/**
 * @param {number} cardIdx
 * @param {number} centerIdx
 * @param {number} total
 * @returns {number|null}
 */
function computeSlot(cardIdx: number, centerIdx: number, total: number) {
 const rel = ((cardIdx - centerIdx) % total + total) % total;
 if (rel === 0) return 0;
 if (rel === 1) return 1;
 if (rel === 2) return 2;
 if (rel === total - 1) return -1;
 if (rel === total - 2) return -2;
 return null;
}


/** @param {DepthCardStackCompProps} props */
export default function DepthCardStackComp({
 cards,
 duration = DEFAULT_DURATION,
 mouseInteraction = true,
 lerp = DEFAULT_LERP,
 smoothness = DEFAULT_SMOOTHNESS,
}: any) {
 const sectionRef = useRef<any>(null);
 const cardRefs = useRef<any[]>([]);
 const cardFaceRefs = useRef<any[]>([]);
 const textureRefs = useRef<any[]>([]);
 const centerRef = useRef(0);
 const animating = useRef(false);
 const isHoveredRef = useRef(false);
 const timelineRef = useRef<any>(null);
 const [autoplayResetKey, setAutoplayResetKey] = useState(0);
 const [claimedText, setClaimedText] = useState(cards[0].claimedText);
 const [isMobile, setIsMobile] = useState(false);
 const [isTablet, setIsTablet] = useState(false);
 const [isStackReady, setIsStackReady] = useState(false);
 const [reduceMotion, setReduceMotion] = useState(
  () =>
   typeof window !== "undefined" &&
   (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
 );
 const safeDuration = clampNumber(duration, 0.15, 1.5, DEFAULT_DURATION);
 const safeLerp = clampNumber(lerp, 0.02, 1, DEFAULT_LERP);
 const safeSmoothness = clampNumber(smoothness, 0.1, 1.2, DEFAULT_SMOOTHNESS);
 const pointerDuration = clampNumber(1 - safeLerp, 0.05, 0.8, 0.4);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 640);
      setIsTablet(width > 640 && width <= 1024);
    };
    queueMicrotask(() => {
      check();
    });
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

 const cardWidth = isTablet ? TABLET_CARD_W : CARD_W;
 const cardHeight = isTablet ? TABLET_CARD_H : CARD_H;

 const applyLayout = useCallback((animate: boolean) => {
 const total = cards.length;
 timelineRef.current?.kill();
 timelineRef.current = null;

 cardRefs.current.forEach((el: any, i: number) => {
 if (!el) return;
 gsap.killTweensOf(el);
 const slot = computeSlot(i, centerRef.current, total);
 const props = getSlotProps(slot);
 if (animate && slot !== null) {
 gsap.to(el, { ...props, duration: safeDuration, ease:"power2.inOut" });
 } else {
 gsap.set(el, props);
 }
 });
 }, [cards, safeDuration]);

  useEffect(() => {
    queueMicrotask(() => {
      setIsStackReady(false);
    });
    applyLayout(false);
    const cards = cardRefs.current;
    const readyFrame = requestAnimationFrame(() => {
      setIsStackReady(true);
    });

 return () => {
 cancelAnimationFrame(readyFrame);
 timelineRef.current?.kill();
 timelineRef.current = null;
 cards.forEach((el: any) => el && gsap.killTweensOf(el));
 };
 }, [applyLayout]);

 const navigate = useCallback((dir: number) => {
 if (animating.current) return;
 animating.current = true;

 const effectiveDuration = reduceMotion ? 0.15 : safeDuration;

 const total = cards.length;
 const oldCenter = centerRef.current;
 const newCenter = ((oldCenter + dir) % total + total) % total;
 centerRef.current = newCenter;

 const oldFace = cardFaceRefs.current[oldCenter];
 const oldTexture = textureRefs.current[oldCenter];
 if (oldFace) {
 gsap.killTweensOf(oldFace);
 gsap.set(oldFace, { rotateX: 0, rotateY: 0, x: 0, y: 0 });
 }
 if (oldTexture) {
 gsap.killTweensOf(oldTexture);
 gsap.set(oldTexture, { opacity: 0,"--reveal-x":"50%","--reveal-y":"50%" });
 }

 timelineRef.current?.kill();

 const tl = gsap.timeline({
 onComplete: () => {
 animating.current = false;
 timelineRef.current = null;
 },
 });
 timelineRef.current = tl;

 cardRefs.current.forEach((cardEl: any, i: number) => {
 if (!cardEl) return;

 gsap.killTweensOf(cardEl);

 const oldSlot = computeSlot(i, oldCenter, total);
 const newSlot = computeSlot(i, newCenter, total);
 const oldProps = getSlotProps(oldSlot);
 const newProps = getSlotProps(newSlot);

 gsap.set(cardEl, oldProps);

 if (oldSlot === null && newSlot !== null) {
 gsap.set(cardEl, {
 ...oldProps,
 x: newProps.x + (newSlot > 0 ? 28 : -28),
 y: newProps.y - 8,
 scale: Math.max(newProps.scale - 0.04, 0.72),
 opacity: 0,
 zIndex: newProps.zIndex,
 });
 }

 if (i === oldCenter) {
 const swingX = dir > 0 ? -(cardWidth * 0.9) : (cardWidth * 0.9);
 const swingRotateY = dir > 0 ? -30 : 30;

 gsap.set(cardEl, { zIndex: 30 });
 tl.to(cardEl, {
 x: swingX,
 y: -10,
 rotateZ: dir > 0 ? -3 : 3,
 rotateY: swingRotateY,
 scale: 0.88,
 opacity: 1,
 ease:"cubic-bezier(.25, .46, .45, .94)",
 duration: effectiveDuration * 0.55,
 }, 0);
 tl.to(cardEl, {
 ...newProps,
 rotateY: 0,
 duration: effectiveDuration * 0.35,
 ease:"cubic-bezier(.32, .72, 0, 1)",
 }, effectiveDuration * 0.4);
 return;
 }

 gsap.set(cardEl, { zIndex: newSlot === 0 ? 25 : newProps.zIndex });
 tl.to(cardEl, {
 ...newProps,
 duration: effectiveDuration,
 ease:"power2.inOut",
 }, effectiveDuration * 0.1);
 });

 setClaimedText(cards[newCenter].claimedText);
 }, [cards, cardWidth, safeDuration, reduceMotion]);

 useEffect(() => {
 const autoplayId = setInterval(() => {
 if (isHoveredRef.current) return;
 navigate(1);
 }, AUTO_PLAY_DELAY);

 return () => clearInterval(autoplayId);
 }, [navigate, autoplayResetKey]);

 useEffect(() => {
 // Reduced-motion: no pointer tilt / texture reveal - reset any leftover transforms.
 if (reduceMotion || !mouseInteraction) {
  isHoveredRef.current = false;
  cardFaceRefs.current.forEach((face: any) => {
   if (!face) return;
   gsap.killTweensOf(face);
   gsap.set(face, { rotateX: 0, rotateY: 0, x: 0, y: 0 });
  });
  textureRefs.current.forEach((textureEl: any) => {
   if (!textureEl) return;
   gsap.killTweensOf(textureEl);
   gsap.set(textureEl, { opacity: 0, "--reveal-x": "50%", "--reveal-y": "50%" });
  });
  return;
 }

 const cards = cardRefs.current;
 const handlers: Array<{
 cardEl: HTMLDivElement;
 handleEnter: (e: MouseEvent) => void;
 handleMove: (e: MouseEvent) => void;
 handleLeave: () => void;
 getRaf: () => number | null;
 }> = [];

 cards.forEach((cardEl: HTMLDivElement, i: number) => {
 const cardFace = cardFaceRefs.current[i];
 const textureEl = textureRefs.current[i];
 if (!cardEl || !cardFace || !textureEl) return;

 // Track per-card enter progress so first mousemove eases in gently
 let enterProgress = 0;
 /** @type {number | null} */
 let enterRaf: number | null = null;

 const handleEnter = (e: MouseEvent) => {
 if (i !== centerRef.current || animating.current) return;
 isHoveredRef.current = true;
 enterProgress = 0;

 // Cancel any in-flight enter ramp
 if (enterRaf) cancelAnimationFrame(enterRaf);

 // Smoothly ramp enterProgress from 0 → 1 over ~350ms
 const startTime = performance.now();
 const RAMP_DURATION = safeSmoothness * 1000;

 const ramp = (now: number) => {
 enterProgress = Math.min((now - startTime) / RAMP_DURATION, 1);
 if (enterProgress < 1) enterRaf = requestAnimationFrame(ramp);
 else enterRaf = null;
 };
 enterRaf = requestAnimationFrame(ramp);
 };

 const handleMove = (e: MouseEvent) => {
 if (i !== centerRef.current || animating.current) return;

 const rect = cardEl.getBoundingClientRect();
 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;
 const centerX = rect.width / 2;
 const centerY = rect.height / 2;

 // Scale tilt & shift by enterProgress so first frames are subtle
 const ease = enterProgress;
 const rotateX = ((y - centerY) / 20) * ease;
 const rotateY = -(((x - centerX) / 20)) * ease;
 const moveX = ((x - centerX) / 60) * ease;
 const moveY = ((y - centerY) / 60) * ease;

 gsap.to(textureEl, {
"--reveal-x": `${x}px`,
"--reveal-y": `${y}px`,
 opacity: 0.3 * ease,
 duration: pointerDuration,
 ease:"power2.out",
 overwrite:"auto",
 });
 gsap.to(cardFace, {
 rotateX,
 rotateY,
 x: moveX,
 y: moveY,
 transformPerspective: 800,
 transformOrigin:"center",
 ease:"power2.out",
 duration: pointerDuration,
 overwrite:"auto",
 });
 };

 const handleLeave = () => {
 if (i !== centerRef.current) return;
 isHoveredRef.current = false;

 // Cancel any enter ramp still running
 if (enterRaf) {
 cancelAnimationFrame(enterRaf);
 enterRaf = null;
 }
 enterProgress = 0;

 gsap.to(cardFace, {
 rotateX: 0,
 rotateY: 0,
 x: 0,
 y: 0,
 ease:"power3.out",
 duration: safeSmoothness,
 overwrite:"auto",
 });
 gsap.to(textureEl, {
 opacity: 0,
 ease:"power2.out",
 duration: safeSmoothness,
 overwrite:"auto",
 });
 };

 cardEl.addEventListener("mouseenter", handleEnter);
 cardEl.addEventListener("mousemove", handleMove);
 cardEl.addEventListener("mouseleave", handleLeave);
 handlers.push({ cardEl, handleEnter, handleMove, handleLeave, getRaf: () => enterRaf });
 });

 return () => {
 handlers.forEach(({ cardEl, handleEnter, handleMove, handleLeave, getRaf }) => {
 cardEl.removeEventListener("mouseenter", handleEnter);
 cardEl.removeEventListener("mousemove", handleMove);
 cardEl.removeEventListener("mouseleave", handleLeave);
 const raf = getRaf();
 if (raf) cancelAnimationFrame(raf);
 });
 };
 }, [reduceMotion, isStackReady, mouseInteraction, pointerDuration, safeSmoothness]);

 return (
 <section ref={sectionRef} className="flex flex-col items-center px-6 pt-20 max-[1025px]:pt-40 max-md:pt-20 h-screen max-md:w-screen max-md:overflow-x-hidden pb-5 select-none bg-white max-md:h-full max-md:min-h-dvh">
<p className="text-sm max-md:text-sm max-[1025px]:text-lg font-medium text-blue-500 mb-1 max-[1025px]:mb-3">
  Hyperiux-UI Library
</p>

<h3 className="text-5xl max-[1025px]:text-4xl max-md:text-2xl font-medium text-center mb-0.5 leading-none tracking-tight text-gray-400">
  Build futuristic interfaces.
</h3>

<p className="text-5xl text-center max-[1025px]:text-4xl max-md:text-2xl text-gray-400 leading-none tracking-tight mb-4 max-[1025px]:mb-10">
  Crafted for modern web experiences.
</p>

 <div className="max-md:grid max-md:grid-cols-2 max-md:place-items-center max-md:gap-4 flex items-center justify-center">
 <button
 onClick={() => {
 navigate(-1);
 setAutoplayResetKey((value) => value + 1);
 }}
 className="max-md:hidden w-9 h-9 max-[1025px]:h-15 max-[1025px]:w-15 rounded-full border cursor-pointer border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors shrink-0 relative z-30"
 aria-label="Previous card"
 >
 <ChevronLeft size={20} strokeWidth={2} />
 </button>

 <div
 className="relative shrink-0 max-md:row-start-1 max-md:col-span-2 transition-opacity duration-200"
 style={{
 width: isMobile
 ? window.innerWidth - 32
 : cardWidth + 112 * 2 + 40,
 height: cardHeight + 70,
 opacity: isStackReady ? 1 : 0,
 perspective: 900,
 perspectiveOrigin:"50% 50%",
 }}
 >
 {cards.map((card: any, i: number) => (
 <SliderCard
 key={card.num}
 card={card}
 index={i}
 cardRefs={cardRefs}
 cardFaceRefs={cardFaceRefs}
 textureRefs={textureRefs}
 cardWidth={cardWidth}
 cardHeight={cardHeight}
 />
 ))}
 </div>

 <button
 onClick={() => {
 navigate(1);
 setAutoplayResetKey((value) => value + 1);
 }}
 className="max-md:hidden w-9 h-9 max-[1025px]:h-15 max-[1025px]:w-15 cursor-pointer rounded-full border border-gray-400 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors shrink-0 relative z-30"
 aria-label="Next card"
 >
 <ChevronRight size={20} strokeWidth={2} />
 </button>
 </div>
 <div className="hidden max-md:flex max-md:order-2 items-center justify-center gap-8 mt-4">
 <button
 onClick={() => {
 navigate(-1);
 setAutoplayResetKey((value) => value + 1);
 }}
 className="w-15 h-15 rounded-full border border-gray-400  flex items-center justify-center text-gray-600 hover:bg-gray-100  transition-colors"
 aria-label="Previous card"
 >
 <ChevronLeft size={25} strokeWidth={2} />
 </button>

 <button
 onClick={() => {
 navigate(1);
 setAutoplayResetKey((value) => value + 1);
 }}
 className="w-15 h-15 rounded-full border border-gray-400  flex items-center justify-center text-gray-600 hover:bg-gray-100  transition-colors"
 aria-label="Next card"
 >
 <ChevronRight size={25} strokeWidth={2} />
 </button>
 </div>

 <p
 key={claimedText}
 className="mt-4 max-[1025px]:mt-8 max-md:mt-3 max-md:order-1 text-xs max-[1025px]:text-lg max-md:text-base text-gray-400 h-5"
 style={{ animation:"fadeUp 0.4s ease forwards" }}
 >
 {claimedText}
 </p>

 <style>{`
 @keyframes fadeUp {
 from { opacity: 0; transform: translateY(6px); }
 to { opacity: 1; transform: translateY(0); }
 }
 `}</style>
 </section>
 );
}
