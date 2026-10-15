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
 /** Opacity the pieces start from before revealing (0-1). */
 startOpacity?: number;
 /** Which side the pieces swing in from. */
 direction?: "top" | "bottom";
 /** Animate per character, per word, or per line. */
 splitBy?: "chars" | "words" | "lines";
 /** Starting tilt around the X axis in degrees; its sign follows the direction. */
 rotation?: number;
 /** GSAP ease for the reveal. */
 ease?: string;
 /** Perspective distance in px - lower is a stronger 3D effect. */
 perspective?: number;
}

const DEFAULT_TEXT = <p className="text-2xl">Perspective text tilts into place as it scrolls into view.</p>;

export default function PerspectiveTextReveal({
 children = DEFAULT_TEXT,
 animateOnScroll = true,
 delay = 0,
 duration = 0.8,
 stagger = 0.08,
 className = "",
 scrub = false,
 startOpacity = 0,
 direction = "top",
 splitBy = "lines",
 rotation = 70,
 ease = "power3.out",
 perspective = 800,
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
 // Characters are split inside their words so a word never breaks
 // across lines mid-animation.
 const split = SplitText.create(element, {
 type: splitBy === "chars" ? "words,chars" : splitBy === "words" ? "words" : "lines",
 linesClass:"line++",
 reduceWhiteSpace: false,
 });

 splitRefs.current.push(split);
 const pieces = split[splitBy] ?? split.lines;
 if (splitBy !== "lines") {
 gsap.set(pieces, { display: "inline-block" });
 }
 linesRef.current.push(...pieces);
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

 const fromBottom = direction === "bottom";

 gsap.set(linesRef.current, {
 yPercent: fromBottom ? 100 : -100,
 rotateX: fromBottom ? -rotation : rotation,
 opacity: Math.min(1, Math.max(0, startOpacity)),
 transformPerspective: perspective,
 // Hide the mirrored back of each piece while it rotates past 90deg.
 backfaceVisibility: "hidden",
 transformOrigin: fromBottom ? "50% 0%" : "50% 100%",
 willChange:"transform, opacity",
 });

 gsap.set(containerRef.current, { opacity: 1 });

 const animationProps = {
 yPercent: 0,
 rotateX: 0,
 opacity: 1,
 duration,
 stagger,
 ease,
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
 }, [animateOnScroll, delay, duration, scrub, stagger, startOpacity, direction, splitBy, rotation, ease, perspective]);

 return (
 <div
 ref={containerRef}
 data-copy-wrapper="true"
 className={`opacity-0 ${className}`.trim()}
 style={{ perspective: `${perspective}px` }}
 >
 {children}
 </div>
 );
}
