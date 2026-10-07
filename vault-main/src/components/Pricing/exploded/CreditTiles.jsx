"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Tiles pop in with a springy scale and width, and shrink away when they go,
// the way attachments are added and removed. Tiles for `used` credits fill.
const OUT = { width: 0, opacity: 0, scale: 0.4, duration: 0.5, ease: "power3.in" };

function Tile({ index, filled, delay, sizeClass, onTile }) {
  const ref = useRef(null);
  const numRef = useRef(null);
  const first = useRef(true);
  // Explicit start and end values (not gsap.from), so a re-run or a remount
  // never captures a half-hidden state as the "natural" one
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const width = el.offsetWidth;
    el.dataset.w = width;
    if (prefersReducedMotion()) return undefined;
    const tween = gsap.fromTo(
      el,
      { width: 0, opacity: 0, scale: 0.4 },
      { width, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.8)", delay, clearProps: "width,opacity,scale,transform" },
    );
    return () => { tween.kill(); gsap.set(el, { clearProps: "width,opacity,scale,transform" }); };
  }, []);  

  // The number scales up from nothing when its credit is used, and back down when it isn't
  useEffect(() => {
    const on = { scale: 1, opacity: 1 }, off = { scale: 0.4, opacity: 0 };
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      gsap.set(numRef.current, filled ? on : off);
      return;
    }
    gsap.to(numRef.current, { ...(filled ? on : off), duration: 0.6, ease: filled ? "back.out(1.8)" : "power3.in", overwrite: true });
  }, [filled]);

  return (
    <span ref={ref} className="flex shrink-0 justify-start overflow-hidden py-[0.2vw] pr-[0.5vw] max-md:py-[0.8vw] max-md:pr-[2vw]">
      <i ref={(el) => onTile?.(index, el)} className={`flex origin-center items-center justify-center not-italic transition-colors duration-500 ${sizeClass} ${filled ? "bg-primary text-background" : "border border-foreground/20 text-foreground/40"}`}>
        <span ref={numRef} className="inline-block">{index + 1}</span>
      </i>
    </span>
  );
}

export default function CreditTiles({ count, used, sizeClass = "size-[1.8vw] text-[0.7vw] max-md:size-[7vw] max-md:text-[2.8vw]", onTile }) {
  const rootRef = useRef(null);
  const [shown, setShown] = useState(count);

  useEffect(() => {
    const tiles = [...rootRef.current.children];
    if (count > shown) {
      // Intentional: new tiles mount here and run their own entrance; a smaller count animates out first
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(count);
    } else if (count < shown) {
      const leaving = tiles.slice(count);
      if (prefersReducedMotion()) { setShown(count); return undefined; }
      const tween = gsap.to(leaving, { ...OUT, stagger: { each: 0.08, from: "end" }, onComplete: () => setShown(count) });
      return () => tween.kill();
    } else {
      // The count came back while tiles were leaving: bring them back
      gsap.to(tiles, { width: (i, el) => Number(el.dataset.w) || el.scrollWidth, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)", overwrite: true, clearProps: "width,opacity,scale,transform" });
    }
    return undefined;
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={rootRef} className="flex" aria-label={`${count} template credits, ${Math.min(used, count)} used`}>
      {Array.from({ length: shown }, (_, i) => (
        <Tile key={i} index={i} filled={i < used} sizeClass={sizeClass} onTile={onTile} delay={Math.max(0, i - (shown - 1)) * 0.08} />
      ))}
    </div>
  );
}
