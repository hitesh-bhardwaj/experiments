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
 */
export default function RollText({ text, dir = 1, fixed = false, className = "" }) {
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
        split = SplitText.create(el, { type: "lines", mask: "lines" });
        splits.current.set(l.id, split);
      }
      if (l.enter) {
        gsap.fromTo(split.lines, { yPercent: l.dir * TRAVEL }, { yPercent: 0, duration: DURATION, ease: EASE, stagger: STAGGER });
      } else {
        gsap.to(split.lines, {
          yPercent: -l.dir * TRAVEL,
          duration: DURATION,
          ease: EASE,
          stagger: STAGGER,
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
    <p aria-live="polite" className={`relative overflow-hidden ${className}`}>
      {layers.map((l) => (
        <span
          key={l.id}
          ref={(el) => { if (el) els.current.set(l.id, el); else els.current.delete(l.id); }}
          className={l.leaving || fixed ? "absolute inset-0 block" : "relative block"}
        >
          {l.text}
        </span>
      ))}
    </p>
  );
}
