// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

const REDUCED_MOTION_FADE_DURATION = 0.8;
const REDUCED_MOTION_Y_OFFSET = 24;

interface PerspectiveTextRevealProps {
 children?: React.ReactNode;
 animateOnScroll?: boolean;
 delay?: number;
 duration?: number;
 stagger?: number;
 className?: string;
 scrub?: boolean;
}

export default function PerspectiveTextReveal({
 children,
 animateOnScroll = true,
 delay = 0,
 duration = 0.8,
 stagger = 0.08,
 className = "",
 scrub = false,
}: PerspectiveTextRevealProps) {
 const containerRef = useRef<any>(null);
 const splitRefs = useRef<any[]>([]);
 const linesRef = useRef<any[]>([]);

 useLayoutEffect(() => {
 if (!containerRef.current) return;

 splitRefs.current = [];
 linesRef.current = [];

 const elements = containerRef.current.hasAttribute("data-copy-wrapper")
 ? Array.from(containerRef.current.children)
 : [containerRef.current];

 const prefersReduced =
 window.matchMedia &&
 window.matchMedia("(prefers-reduced-motion: reduce)").matches;

 let ctx: ReturnType<typeof gsap.context> | undefined;

 const init = async () => {
 await document.fonts.ready;

 ctx = gsap.context(() => {
 elements.forEach((element) => {
 const split = SplitText.create(element, {
 type:"lines",
 linesClass:"line++",
 reduceWhiteSpace: false,
 });

 splitRefs.current.push(split);
 linesRef.current.push(...split.lines);
 });

 if (prefersReduced) {
 gsap.set(linesRef.current, { yPercent: 0, rotateX: 0, opacity: 1 });
 gsap.set(containerRef.current, { opacity: 0, y: REDUCED_MOTION_Y_OFFSET });

 const fadeUpProps = {
 opacity: 1,
 y: 0,
 duration: REDUCED_MOTION_FADE_DURATION,
 ease:"power2.out",
 delay,
 };

 if (animateOnScroll) {
 gsap.to(containerRef.current, {
 ...fadeUpProps,
 scrollTrigger: {
 trigger: containerRef.current,
 start:"top 90%",
 scrub,
 },
 });
 } else {
 gsap.to(containerRef.current, fadeUpProps);
 }

 return;
 }

 gsap.set(linesRef.current, {
 yPercent: -100,
 rotateX: 70,
 opacity: 0,
 transformPerspective: 800,
 transformOrigin:"50% 100%",
 willChange:"transform, opacity",
 });

 gsap.set(containerRef.current, { opacity: 1 });

 const animationProps = {
 yPercent: 0,
 rotateX: 0,
 opacity: 1,
 duration,
 stagger,
 ease:"power3.out",
 delay,
 };

 if (animateOnScroll) {
 gsap.to(linesRef.current, {
 ...animationProps,
 scrollTrigger: {
 trigger: containerRef.current,
 start:"top 90%",
 scrub,
//  markers:true,
 },
 });
 } else {
 gsap.to(linesRef.current, animationProps);
 }
 }, containerRef);
 };

 init();

 return () => {
 if (ctx) ctx.revert();
 splitRefs.current.forEach((split) => split?.revert());
 };
 }, [animateOnScroll, delay, duration, scrub, stagger]);

 return (
 <div
 ref={containerRef}
 data-copy-wrapper="true"
 className={`opacity-0 ${className}`.trim()}
 style={{ perspective:"800px" }}
 >
 {children}
 </div>
 );
}
