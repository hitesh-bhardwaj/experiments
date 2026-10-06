// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import SplitText from 'gsap/dist/SplitText';
import ScrambleTextPlugin from 'gsap/dist/ScrambleTextPlugin';
import ScrollTrigger from 'gsap/dist/ScrollTrigger';

gsap.registerPlugin(SplitText, ScrambleTextPlugin, ScrollTrigger);

const REDUCED_MOTION_FADE_DURATION = 0.8;
const REDUCED_MOTION_Y_OFFSET = 24;

const ScrambleText = ({
  speed = 0.6,
  charType = 'uppercase',
  textSize,
  textColor = '#111111',
  align = 'left',
  start = 'top 85%',
  duration = 0.7,
  stagger = 0.04,
  className,
}: any) => {
 const text = "Signal appears when the noise decides to leave.";
 const elRef = useRef<any>(null);
 const splitRef = useRef<any>(null);
 const tlRef = useRef<any>(null);
 const resolvedFontSize =
 typeof textSize === 'number' ? `${textSize}vw` : undefined;

 const alignClass =
 align ==='right'
 ?'text-right'
 :'text-left';

 useEffect(() => {
 let isCancelled = false;
 let fallbackRaf: number | null = null;

 const setup = async () => {
 try {
 if (document?.fonts?.ready) {
 await document.fonts.ready;
 } else {
 await new Promise((r) => {
 fallbackRaf = requestAnimationFrame(() => {
 fallbackRaf = null;
 r(null);
 });
 });
 }
 } catch {}

 if (isCancelled || !elRef.current) return;

 tlRef.current?.kill();
 splitRef.current?.revert();
 splitRef.current = null;

 const ctx = gsap.context(() => {
 const el = elRef.current;

 const prefersReduced =
 window.matchMedia &&
 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

 if (prefersReduced) {
 gsap.set(el, { opacity: 0, y: REDUCED_MOTION_Y_OFFSET });

 const tl = gsap.timeline({ paused: true });
 tlRef.current = tl;

 tl.to(el, {
 opacity: 1,
 y: 0,
 duration: REDUCED_MOTION_FADE_DURATION,
 ease:'power2.out',
 });

 ScrollTrigger.create({
 trigger: el,
 start,
 once: true,
 onEnter: () => tl.play(),
 });

 return;
 }

 // Lock height before split to prevent layout shift
 const originalHeight = el.offsetHeight;
 gsap.set(el, { minHeight: originalHeight });

 const split = new SplitText(el, { type:'words,chars' });
 splitRef.current = split;

 const chars = split.chars;
 const words = split.words;

 // Prevent word breaking
 gsap.set(words, {
 display:'inline-block',
 whiteSpace:'nowrap',
 });

 gsap.set(el, {
 wordBreak:'keep-all',
 });

 // Character styling
 gsap.set(chars, {
 display:'inline-block',
 });

 el.removeAttribute('aria-label');
 chars.forEach((c) => c.removeAttribute('aria-label'));

 gsap.set(chars, { opacity: 0 });

 const originals = chars.map((c) => c.textContent ||'');

 const tl = gsap.timeline({
 paused: true,
 defaults: { ease:'none' },
 onComplete: () => {
  gsap.set(el, { minHeight:'auto' });
 }

 });

 tlRef.current = tl;

 tl.fromTo(
 el,
 { opacity: 0 },
 { opacity: 1, duration: 0.4, ease:'power1.out' }
 );

 tl.to(chars, {
 duration,
 scrambleText: {
 text: (i: number) => originals[i],
 chars: charType ||'uppercase',
 speed,
 revealDelay: 0.2,
 } as any,
 opacity: 1,
 stagger,
 });

 tl.to(
 chars,
 {
 opacity: 1,
 duration: Math.max(0.1, duration * 0.55),
 stagger: stagger * 0.5,
 ease:'power1.out',
 },
'>-0.2'
 );

 tl.to(
 chars,
 {
 opacity: 0.85,
 duration: Math.max(0.1, duration * 0.45),
 stagger: stagger * 0.5,
 },
'>-0.2'
 );

 const trigger = ScrollTrigger.create({
 trigger: el,
 start,
 once: true,
 onEnter: () => tl.play(),
 });

 const rect = el.getBoundingClientRect();
 if (rect.top < window.innerHeight && rect.bottom > 0 && tl.progress() === 0) {
 tl.play(0);
 trigger.kill();
 }
 }, elRef);

 return () => ctx.revert();
 };

 const clean = setup();

 return () => {
 isCancelled = true;
 if (fallbackRaf) {
 cancelAnimationFrame(fallbackRaf);
 fallbackRaf = null;
 }
 (async () => {
 await clean;
 })();
 tlRef.current?.kill();
 splitRef.current?.revert();
 };
 }, [speed, charType, start, duration, stagger]);

 return (
 <div className="relative w-full">
 <p
 aria-hidden="true"
 className={`${alignClass} invisible w-full tracking-tight ${
 className ??''
 }`}
 style={{
 wordBreak:'keep-all',
 overflowWrap:'normal',
 fontSize: resolvedFontSize,
 color: textColor,
 }}
 >
 {text}
 </p>
 <p
 ref={elRef}
 className={`${alignClass} absolute inset-0 w-full tracking-tight opacity-0 ${
 className ??''
 }`}
 style={{
 wordBreak:'keep-all',
 overflowWrap:'normal',
 fontSize: resolvedFontSize,
 color: textColor,
 minHeight: "1em",
 }}
 >
 {text}
 </p>
 </div>
 );
};

export default ScrambleText ;
