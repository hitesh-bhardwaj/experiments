// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { useState, useEffect, useRef } from'react';
import { motion } from 'motion/react';
import { createSuspendedRaf } from './createSuspendedRaf';

interface MousePosition {
  x: number | null;
  y: number | null;
}

function useMousePosition(): MousePosition {
 const [mousePosition, setMousePosition] = useState<MousePosition>({ x: null, y: null });

 useEffect(() => {
 const updateMousePosition = (e: MouseEvent) => {
 setMousePosition({ x: e.clientX, y: e.clientY });
 };
 window.addEventListener('mousemove', updateMousePosition);
 return () => window.removeEventListener('mousemove', updateMousePosition);
 }, []);

 return mousePosition;
}

function useIsPointerFine() {
 const [isPointerFine, setIsPointerFine] = useState(
 () => typeof window !== 'undefined'
 && window.matchMedia('(pointer: fine)').matches
 );

 useEffect(() => {
 const mq = window.matchMedia('(pointer: fine)');
 const handler = (e: MediaQueryListEvent) => setIsPointerFine(e.matches);
 mq.addEventListener('change', handler);
 return () => mq.removeEventListener('change', handler);
 }, []);

 return isPointerFine;
}

function usePrefersReducedMotion() {
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(
 () => typeof window !== 'undefined'
 && window.matchMedia('(prefers-reduced-motion: reduce)').matches
 );

 useEffect(() => {
 const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
 const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
 mq.addEventListener('change', handler);
 return () => mq.removeEventListener('change', handler);
 }, []);

 return prefersReducedMotion;
}

interface CircleTextRevealProps {
  textColor?: string;
  circleColorBg?: string;
  RevealedTextColor?: string;
  lerp?: number;
  smoothness?: number;
  circleSize?: number;
}

export default function CircleTextReveal({
 textColor ='#111',
 circleColorBg ='#E76F2E',
 RevealedTextColor ='#fefefe',
 lerp = 0.15,
 smoothness = 0.5,
 circleSize = 500,
}: CircleTextRevealProps) {
 const sectionRef = useRef<HTMLElement | null>(null);
 const [isHovered, setIsHovered] = useState(false);
 const { x, y } = useMousePosition();
 const isPointerFine = useIsPointerFine();
 const prefersReducedMotion = usePrefersReducedMotion();

 const [smoothPos, setSmoothPos] = useState<{ x: number, y: number } | null>(null);

 const baseCircleSize = Math.max(24, Number(circleSize) || 500);
 const size = isHovered ? baseCircleSize : Math.max(24, baseCircleSize * 0.08);
 const lerpFactor = prefersReducedMotion ? 1 : Math.min(1, Math.max(0.01, Number(lerp) || 0.15));
 const safeSmoothness = prefersReducedMotion ? 0 : Math.max(0, Number(smoothness) || 0.5);

 useEffect(() => {
 if (!isPointerFine) return;

 const mix = (start: number, end: number, factor: number): number => start + (end - start) * factor;

 const loop = createSuspendedRaf({
 root: sectionRef.current,
 onFrame: () => {
 setSmoothPos((prev) => {
 if (x === null || y === null) return prev;
 if (prev === null) return { x, y };
 return {
 x: mix(prev.x, x, lerpFactor),
 y: mix(prev.y, y, lerpFactor),
 };
 });
 },
 });

 loop.start();

 return () => loop.destroy();
 }, [x, y, isPointerFine, prefersReducedMotion, lerpFactor]);

 return (
 <section ref={sectionRef} className="w-screen h-screen flex items-center justify-center text-[7vw] text-center px-[5vw] bg-[#fefefe] relative overflow-hidden">

 {(!isPointerFine) && (
 <div className="absolute hidden max-[1025px]:flex max-md:flex inset-0 z-20 top-[30%]  items-center justify-center px-8 text-center pointer-events-none">
 <div className="flex max-w-sm flex-col items-center gap-3">
 <p className="text-[4vw] leading-[1.2]!" style={{ color: `${textColor}` }}>
 Open on desktop to reveal the text underneath.
 </p>
 </div>
 </div>
 )}

 {/* ── Masked layer - desktop/mouse only, hidden until first mouse move ── */}
 {isPointerFine && smoothPos !== null && (
 <motion.div
 className="absolute inset-0 flex items-center justify-center z-10"
 style={{
 WebkitMaskImage:'radial-gradient(circle at center, black 50%, transparent 51%)',
 WebkitMaskRepeat:'no-repeat',
 }}
 animate={{
 WebkitMaskPosition: `${smoothPos.x - size / 2}px ${smoothPos.y - size / 2}px`,
 WebkitMaskSize: `${size}px ${size}px`,
 } as any}
 transition={
 prefersReducedMotion
 ? { type:'tween', ease:'linear', duration: 0 }
 : { type:'tween', ease:'backOut', duration: safeSmoothness }
 }
 >
 <div className="absolute inset-0" style={{ backgroundColor: circleColorBg }} />

 <h2
 className="relative z-10 leading-tight cursor-default select-none"
 style={{ color: RevealedTextColor }}
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 >
 The hidden layer has been waiting for your cursor.
 </h2>
 </motion.div>
 )}


 <div className="relative z-0">
 <h1
 className="leading-tight select-none"
 style={{ color: textColor }}
 >
 Some ideas only bloom when you move toward them.
 </h1>
 </div>
 </section>
 );
}
