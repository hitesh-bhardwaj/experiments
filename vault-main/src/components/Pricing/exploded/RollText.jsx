"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

const DURATION = 0.9;
const EASE = "expo.out";
const STAGGER = 0.08;
const TRAVEL = 110;

/**
 * Text that rolls line by line when it changes (SplitText, masked lines): the
 * old lines slide out and the new ones slide in from the opposite side, up
 * when `dir` is 1 and down when it is -1. Changing the text mid-roll hands
 * the lines on screen over to the next ones.
 * With `fixed`, every text is laid over the same box (give it a height), so
 * the text stays in place whatever its length.
 * With `block`, the whole text rolls as one piece (all its lines together) instead
 * of line by line.
 * `travel` is how far (in % of a line) the text moves and `stagger` the delay
 * between lines. The line box is the mask, so a tighter line-height class on the
 * text makes the roll start closer.
 */
export default function RollText({ text, dir = 1, fixed = false, block = false, travel = TRAVEL, stagger = STAGGER, className = "" }) {
  const [layers, setLayers] = useState([{ id: 0, text }]);
  const nextId = useRef(1);
  const els = useRef(new Map());
  const splits = useRef(new Map());
  const last = useRef(text);

  useEffect(() => {
    if (text === last.current) return;
    last.current = text;
    if (prefersReducedMotion()) {
      setLayers([{ id: nextId.current++, text }]);
      return;
    }
    // Lines already on screen leave from wherever they are now
    splits.current.forEach((split) => gsap.killTweensOf(split.lines));
    els.current.forEach((el) => { delete el.dataset.anim; });
    setLayers((prev) => [
      ...prev.map((l) => ({ ...l, leaving: true, enter: false, dir })),
      { id: nextId.current++, text, enter: true, dir },
    ]);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    layers.forEach((l) => {
      const el = els.current.get(l.id);
      if (!el || el.dataset.anim || !(l.enter || l.leaving)) return;
      el.dataset.anim = "1";
      let split = splits.current.get(l.id);
      if (!split) {
        split = block ? { lines: [el], revert() {} } : SplitText.create(el, { type: "lines", mask: "lines" });
        splits.current.set(l.id, split);
      }
      // A block moves in pixels, by the taller of its own text and the box it rolls in,
      // so every line of it clears the box (a leaving layer's own height is only the box's)
      const dist = block ? Math.max(el.scrollHeight, el.parentElement.offsetHeight) : 0;
      const at = (sign) => (block ? { y: sign * l.dir * dist } : { yPercent: sign * l.dir * travel });
      const rest = block ? { y: 0 } : { yPercent: 0 };
      if (l.enter) {
        gsap.fromTo(split.lines, at(1), { ...rest, duration: DURATION, ease: EASE, stagger });
      } else {
        gsap.to(split.lines, {
          ...at(-1),
          duration: DURATION,
          ease: EASE,
          stagger,
          onComplete: () => {
            splits.current.delete(l.id);
            setLayers((prev) => prev.filter((x) => x.id !== l.id));
          },
        });
      }
    });
  }, [layers]);

  useEffect(() => () => splits.current.forEach((split) => split.revert()), []);

  return (
    <div aria-live="polite" className={`relative overflow-hidden ${className}`}>
      {layers.map((l) => (
        <span
          key={l.id}
          ref={(el) => { if (el) els.current.set(l.id, el); else els.current.delete(l.id); }}
          className={l.leaving || fixed ? "absolute inset-0 block" : "relative block"}
        >
          {l.text}
        </span>
      ))}
    </div>
  );
}
