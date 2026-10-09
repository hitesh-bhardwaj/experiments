"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Tiles pop in with a springy scale and width, and shrink away when they go,
// the way attachments are added and removed. Tiles for `used` credits fill.
// Each tile is a slot (animates width only) holding a pop wrapper (scale + fade only):
// scaling the element whose width is changing made it wobble as its centre moved
const OUT_POP = { opacity: 0, scale: 0.4, duration: 0.35, ease: "power3.in" };
const OUT_SLOT = { width: 0, duration: 0.45, ease: "power3.inOut" };

function Tile({ index, filled: filledProp, leaving = false, delay, sizeClass, onTile }) {
  // A tile on its way out keeps the look it had, so it scales and fades away in one
  // smooth motion instead of first losing its fill and showing its border
  const [heldFilled, setHeldFilled] = useState(filledProp);
  if (!leaving && heldFilled !== filledProp) setHeldFilled(filledProp);
  const filled = leaving ? heldFilled : filledProp;
  const ref = useRef(null);
  const popRef = useRef(null);
  const numRef = useRef(null);
  const first = useRef(true);
  // Explicit start and end values (not gsap.from), so a re-run or a remount
  // never captures a half-hidden state as the "natural" one
  useIsoLayoutEffect(() => {
    const el = ref.current, pop = popRef.current;
    const width = el.offsetWidth;
    el.dataset.w = width;
    if (prefersReducedMotion()) return undefined;
    const clear = () => { gsap.set(el, { clearProps: "width" }); gsap.set(pop, { clearProps: "opacity,scale,transform" }); };
    // The slot opens smoothly (no overshoot, so nothing after it jumps); the tile
    // pops in once there's room, springy but on scale only
    const tl = gsap.timeline({ delay, onComplete: clear });
    tl.fromTo(el, { width: 0 }, { width, duration: 0.5, ease: "power3.out" }, 0)
      .fromTo(pop, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, 0.15);
    return () => { tl.kill(); clear(); };
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
      <span ref={popRef} className="flex origin-center">
      <i ref={(el) => onTile?.(index, el)} className={`flex origin-center items-center justify-center not-italic transition-colors duration-500 ${sizeClass} ${filled ? "bg-primary text-background" : "border border-foreground/20 text-foreground/40"}`}>
        <span ref={numRef} className="inline-block">{index + 1}</span>
      </i>
      </span>
    </span>
  );
}

export default function CreditTiles({ count, used, sizeClass = "size-[1.8vw] text-[0.7vw] max-md:size-[7vw] max-md:text-[2.8vw]", onTile }) {
  const rootRef = useRef(null);
  const mountedRef = useRef(false);
  const [shown, setShown] = useState(count);

  useEffect(() => {
    // First load: the tiles run their own entrance, nothing to add or remove yet
    if (!mountedRef.current) { mountedRef.current = true; return undefined; }
    const tiles = [...rootRef.current.children];
    if (count > shown) {
      // Intentional: new tiles mount here and run their own entrance; a smaller count animates out first
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(count);
    } else if (count < shown) {
      const leaving = tiles.slice(count);
      if (prefersReducedMotion()) { setShown(count); return undefined; }
      // Tile shrinks away first, then its slot closes
      const tl = gsap.timeline({ onComplete: () => setShown(count) });
      tl.to(leaving.map((el) => el.firstElementChild), { ...OUT_POP, stagger: { each: 0.08, from: "end" } }, 0)
        .to(leaving, { ...OUT_SLOT, stagger: { each: 0.08, from: "end" } }, 0.2);
      return () => tl.kill();
    } else {
      // The count came back while tiles were leaving: bring only those back (not on
      // first load, where this would overwrite the tiles' own entrance)
      const leaving = tiles.filter((el) => Number(gsap.getProperty(el.firstElementChild, "opacity")) < 1);
      if (leaving.length) {
        gsap.to(leaving, { width: (i, el) => Number(el.dataset.w) || el.scrollWidth, duration: 0.45, ease: "power3.out", overwrite: true, clearProps: "width" });
        gsap.to(leaving.map((el) => el.firstElementChild), { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.6)", overwrite: true, clearProps: "opacity,scale,transform", delay: 0.1 });
      }
    }
    return undefined;
  }, [count]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={rootRef} className="flex" aria-label={`${count} template credits, ${Math.min(used, count)} used`}>
      {Array.from({ length: shown }, (_, i) => (
        <Tile key={i} index={i} filled={i < used} leaving={i >= count} sizeClass={sizeClass} onTile={onTile} delay={Math.max(0, i - (shown - 1)) * 0.08} />
      ))}
    </div>
  );
}
