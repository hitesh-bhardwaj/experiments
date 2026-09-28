// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createSuspendedRaf } from "./createSuspendedRaf";

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

interface SpotlightTextProps {
  className?: string;
  size?: string;
  align?: 'left' | 'center' | 'right';
  baseTextColor?: string;
  spotlightColor?: string;
  lerp?: number;
  spotlightSize?: number;
  smoothness?: number;
}

export default function SpotlightText({
 className ="",
 size ="text-3xl md:text-5xl",
 align ="center",
 baseTextColor = "#525252",
 spotlightColor = "#ffffff",
 lerp = 0.08,
 spotlightSize = 220,
 smoothness = 0.12,
}: SpotlightTextProps) {
 const text ="Hyperiux Vault is where design meets precision - a thoughtfully crafted component library built for developers who care about performance, aesthetics, and experience. Every interaction is intentional, every animation feels alive, and every component is designed to elevate modern interfaces beyond the ordinary.";
 const containerRef = useRef<HTMLDivElement | null>(null);

 const target = useRef({ x: 0, y: 0 });
 const current = useRef({ x: 0, y: 0 });
 const targetOpacity = useRef(0);
 const currentOpacity = useRef(0);
 const isInside = useRef(false);

 const [isMobile, setIsMobile] = useState(false);
 const prefersReducedMotion = usePrefersReducedMotion();

 const mix = (start: number, end: number, factor: number): number => start + (end - start) * factor;

 useEffect(() => {
 const checkMobile = () => {
 const isTouch = window.matchMedia("(pointer: coarse)").matches;
 const isSmallScreen = window.innerWidth < 1025;
 setIsMobile(isTouch || isSmallScreen);
 };

 checkMobile();

 window.addEventListener("resize", checkMobile);
 return () => window.removeEventListener("resize", checkMobile);
 }, []);

 useEffect(() => {
 if (isMobile) return; //  disable effect on mobile

 const el = containerRef.current as HTMLDivElement;
 const positionLerpFactor = prefersReducedMotion ? 1 : Math.min(1, Math.max(0.01, Number(lerp) || 0.08));
 const opacityLerpFactor = prefersReducedMotion ? 1 : Math.min(1, Math.max(0.01, Number(smoothness) || 0.12));

 const updateTarget = (e: MouseEvent) => {
 const rect = el.getBoundingClientRect();

 const x = e.clientX - rect.left;
 const y = e.clientY - rect.top;

 target.current.x = x;
 target.current.y = y;
 };

 const handleEnter = (e: MouseEvent) => {
 updateTarget(e);
 current.current.x = target.current.x;
 current.current.y = target.current.y;
 isInside.current = true;
 targetOpacity.current = 1;
 };

 const handleMove = (e: MouseEvent) => {
 updateTarget(e);
 };

 const handleLeave = () => {
 isInside.current = false;
 targetOpacity.current = 0;
 };

 const loop = createSuspendedRaf({
 root: el,
 onFrame: () => {
 current.current.x = mix(current.current.x, target.current.x, positionLerpFactor);
 current.current.y = mix(current.current.y, target.current.y, positionLerpFactor);
 currentOpacity.current = mix(currentOpacity.current, targetOpacity.current, opacityLerpFactor);

 el.style.setProperty("--x", `${current.current.x}px`);
 el.style.setProperty("--y", `${current.current.y}px`);
 el.style.setProperty("--opacity", `${currentOpacity.current}`);
 },
 });

 loop.start();

 el.addEventListener("mouseenter", handleEnter);
 el.addEventListener("mousemove", handleMove);
 el.addEventListener("mouseleave", handleLeave);

 return () => {
 loop.destroy();
 el.removeEventListener("mouseenter", handleEnter);
 el.removeEventListener("mousemove", handleMove);
 el.removeEventListener("mouseleave", handleLeave);
 };
 }, [isMobile, prefersReducedMotion, lerp, smoothness]);

 const alignment =
 align ==="center"
 ?"text-center"
 : align ==="right"
 ?"text-right"
 :"text-left";

 return (
 <section className={`w-full ${className}`}>
 <div
 ref={containerRef}
 className={`relative font-semibold max-md:font-medium max-md:text-[7vw]! ${size} ${alignment}`}
 style={
 isMobile
 ? {}
 : ({
"--x":"0px",
"--y":"0px",
"--opacity": 0,
 } as CSSProperties & Record<string, string | number>)
 }
 >
 {/* Dim text (mobile becomes fully visible) */}
 <p className="max-[1025px]:opacity-90 leading-tight whitespace-pre-wrap" style={{ color: isMobile ? spotlightColor : baseTextColor }}>
 {text}
 </p>

 {/* Spotlight (disabled on mobile) */}
 {!isMobile && (
 <p
 className="pointer-events-none absolute inset-0 leading-tight whitespace-pre-wrap"
 style={{
 color: spotlightColor,
 WebkitMaskImage: `
 radial-gradient(
 circle ${spotlightSize}px at var(--x) var(--y),
 rgba(255,255,255,1) 0%,
 rgba(255,255,255,0.85) 25%,
 rgba(255,255,255,0.5) 50%,
 rgba(255,255,255,0.2) 70%,
 rgba(255,255,255,0.05) 85%,
 transparent 100%
 )
 `,
 maskImage: `
 radial-gradient(
 circle ${spotlightSize}px at var(--x) var(--y),
 rgba(255,255,255,1) 0%,
 rgba(255,255,255,0.85) 25%,
 rgba(255,255,255,0.5) 50%,
 rgba(255,255,255,0.2) 70%,
 rgba(255,255,255,0.05) 85%,
 transparent 100%
 )
 `,
 opacity:"var(--opacity)",
 }}
 >
 {text}
 </p>
 )}
 </div>
 </section>
 );
}
