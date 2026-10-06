"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";

gsap.registerPlugin(Draggable);

const DEFAULT_DRIFT_AMOUNT = 30;
const DEFAULT_ROTATION_AMOUNT = 0;
const DEFAULT_SMOOTHNESS = 0.7;
const DEFAULT_LERP = 0.35;

function clampNumber(value: number, min: number, max: number, fallback: number) {
 const number = Number(value);
 if (!Number.isFinite(number)) return fallback;
 return Math.min(Math.max(number, min), max);
}

function getCardRotation(index: number, amount: number) {
 if (amount === 0) return 0;
 const normalized = (((index * 37) % 100) / 50) - 1;
 return normalized * amount;
}

const getNumberProperty = (target: HTMLElement, property: string) =>
 Number(gsap.getProperty(target, property)) || 0;

function usePrefersReducedMotion() {
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

 useEffect(() => {
 const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
 const update = () => setPrefersReducedMotion(mediaQuery.matches);
 update();
 mediaQuery.addEventListener("change", update);
 return () => mediaQuery.removeEventListener("change", update);
 }, []);

 return prefersReducedMotion;
}

export default function CardDriftComp({
 data = [],
 backgroundColor = "#000000",
 backgroundTextColor = "#ffffff",
 cardColor = "#4f46e5",
 cardTextColor = "#ffffff",
 barColor = "#262626",
 driftAmount = DEFAULT_DRIFT_AMOUNT,
 smoothness = DEFAULT_SMOOTHNESS,
}: any) {
 const containerRef = useRef<any>(null);
 const configRef = useRef({
  driftAmount: DEFAULT_DRIFT_AMOUNT,
  smoothness: DEFAULT_SMOOTHNESS,
 });
 const reducedMotion = usePrefersReducedMotion();
 const safeDriftAmount = clampNumber(driftAmount, 0, 90, DEFAULT_DRIFT_AMOUNT);
 const safeSmoothness = clampNumber(smoothness, 0.15, 1.5, DEFAULT_SMOOTHNESS);

 useEffect(() => {
  configRef.current = {
   driftAmount: safeDriftAmount,
   smoothness: safeSmoothness,
  };
 }, [safeDriftAmount, safeSmoothness]);

 useEffect(() => {
 const ctx = gsap.context(() => {
 const container = /** @type {HTMLDivElement} */ (containerRef.current);
 const cards = /** @type {HTMLElement[]} */ (gsap.utils.toArray<HTMLElement>(".testimonial-card"));

 const containerRect = container.getBoundingClientRect();

 const isMobile = containerRect.width < 640;
 const isTablet = containerRect.width >= 640 && containerRect.width < 1025;
 const cols = isMobile || isTablet ? 2 : Math.ceil(Math.sqrt(cards.length));
 const rows = Math.ceil(cards.length / cols);

 const cellWidth = containerRect.width / cols;

 // On mobile, base cellHeight on actual card height instead of screen height
 const firstCardRect = cards[0]?.getBoundingClientRect();
 const cardHeight = firstCardRect?.height || 0;
 const cellHeight = isMobile
 ? cardHeight + 60
 : isTablet
 ? cardHeight + 110
 : containerRect.height / rows;

 // Shared z-index counter across all cards
 let zCounter = cards.length;

 cards.forEach((card, i) => {
 const col = i % cols;
 const row = Math.floor(i / cols);

 const cardRect = card.getBoundingClientRect();

 let x =
 col * cellWidth +
 (cellWidth - cardRect.width) / 2 +
 gsap.utils.random(-configRef.current.driftAmount, configRef.current.driftAmount);

 const verticalOffset = isMobile
 ? containerRect.height * 0.16
 : isTablet
 ? containerRect.height * 0.08
 : 0;

 let y =
 row * cellHeight +
 (cellHeight - cardRect.height) / 2 +
 verticalOffset +
 gsap.utils.random(-configRef.current.driftAmount, configRef.current.driftAmount);

 x = Math.max(0, Math.min(x, containerRect.width - cardRect.width));
 y = Math.max(0, Math.min(y, containerRect.height - cardRect.height));

 gsap.set(card, {
 x,
 y,
 rotation: getCardRotation(i, DEFAULT_ROTATION_AMOUNT),
 zIndex: i + 1,
 opacity: 1,
 });

 let lastX = x;
 let lastY = y;
 let velX = 0;
 let velY = 0;
 let lastTime = 0;

 Draggable.create(card, {
 type:"x,y",
 // No bounds - card can go freely outside during drag
 onPress() {
 gsap.killTweensOf(card);

 velX = 0;
 velY = 0;
 lastX = getNumberProperty(card, "x");
 lastY = getNumberProperty(card, "y");
 lastTime = performance.now();

 // Assign the next highest z-index on press
 zCounter += 1;
 card.style.zIndex = String(zCounter);

 gsap.to(card, {
 scale: 1.05,
 duration: Math.min(configRef.current.smoothness, 0.35),
 ease:"power2.out",
 });
 },

 onDrag() {
 const now = performance.now();
 const dt = now - lastTime;

 if (dt > 0) {
 const curX = getNumberProperty(card, "x");
 const curY = getNumberProperty(card, "y");

 // Exponential moving average for smoother velocity
 const alpha = Math.min(1, DEFAULT_LERP + dt / 1000);
 velX = velX * (1 - alpha) + ((curX - lastX) / dt) * alpha;
 velY = velY * (1 - alpha) + ((curY - lastY) / dt) * alpha;

 lastX = curX;
 lastY = curY;
 lastTime = now;
 }
 },

 onRelease() {
 gsap.to(card, {
 scale: 1,
 duration: Math.min(configRef.current.smoothness, 0.35),
 ease:"power2.out",
 });

 const bounds = container.getBoundingClientRect();
 const maxX = bounds.width - card.offsetWidth;
 const maxY = bounds.height - card.offsetHeight;

 const throwDuration = configRef.current.smoothness;
 const throwX = velX * throwDuration * 1000 * (configRef.current.driftAmount / 90);
 const throwY = velY * throwDuration * 1000 * (configRef.current.driftAmount / 90);

 const curX = getNumberProperty(card, "x");
 const curY = getNumberProperty(card, "y");

 // Throw target is always clamped inside bounds -
 // if card is outside, it smoothly comes back in
 const targetX = Math.max(0, Math.min(curX + throwX, maxX));
 const targetY = Math.max(0, Math.min(curY + throwY, maxY));

 const speed = Math.sqrt(velX * velX + velY * velY);

 // Extra duration if card is far outside bounds (longer trip back)
 const distOutX = Math.max(0, -curX, curX - maxX);
 const distOutY = Math.max(0, -curY, curY - maxY);
 const distOut = Math.sqrt(distOutX * distOutX + distOutY * distOutY);
 const baseDuration = gsap.utils.clamp(0.2, 1.0, speed * configRef.current.smoothness);
 const duration = gsap.utils.clamp(0.25, 1.6, baseDuration + distOut * 0.002);

 gsap.to(card, {
 x: targetX,
 y: targetY,
 duration,
 ease:"power3.out",
 });
 },
 });
 });
 }, containerRef);

 return () => ctx.revert();
 }, [data]);

 return (
 <div
 ref={containerRef}
 className="relative w-screen h-screen overflow-hidden"
 style={{ backgroundColor }}
 >

 <h1
 className="absolute inset-0 flex items-center justify-center text-9xl max-[1025px]:text-7xl font-light pointer-events-none select-none text-center leading-none"
 style={{ color: backgroundTextColor }}
 >
 Draggable <br /> Testimonial
 </h1>

 {/* Cards */}
 {data.map((item: any, index: number) => (
 <Card
 key={index}
 item={item}
 cardColor={cardColor}
 cardTextColor={cardTextColor}
 barColor={barColor}
 />
 ))}

 {reducedMotion && (
 <div
 aria-live="polite"
 className="pointer-events-none fixed bottom-6 right-6 z-60 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-white p-6 text-center shadow-sm"
 >
 <h2 className="text-[1.15vw] max-[1025px]:text-[2vw] max-md:text-[3.5vw] leading-none text-black">
 This effect can&apos;t be reduced.
 </h2>
 <p className="mx-auto mt-4 text-sm leading-6 text-black">
 The scattered cards only move when you drag them - dragging
 stays fully interactive since it&apos;s a direct, user-initiated
 action, not automatic motion.
 </p>
 </div>
 )}
 </div>
 );
}


function Card({ item, cardColor, cardTextColor, barColor }: any) {
 return (
 <div className="testimonial-card opacity-0 absolute cursor-grab active:cursor-grabbing">
 <div
 className="w-96 max-md:w-42 max-[1025px]:w-60"
 style={{ backgroundColor: cardColor, color: cardTextColor }}
 >
 {/* Top bar */}
 <div
 className="flex justify-between text-xs px-3 max-md:px-2 py-1"
 style={{ backgroundColor: barColor }}
 >
 <span>{item.year}</span>
 <span>{item.tag}</span>
 </div>

 {/* Content */}
 <div className="p-6 max-[1025px]:p-3  text-lg max-[1025px]:text-lg max-md:text-base leading-none font-light">
 {item.text}
 </div>
 </div>
 </div>
 );
}
