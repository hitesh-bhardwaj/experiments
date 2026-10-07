"use client";

import { memo, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

// Three laps of 0-9: rest in the middle one, so a digit can roll up past 9 to 0
// (or down past 0 to 9) by moving into the next (or previous) lap.
const REEL = Array.from({ length: 30 }, (_, i) => i % 10);
const STEP = 100 / REEL.length;
const DURATION = 0.7;
const EASE = "power3.out";

// Tween only when the value actually changes (never on a re-render), so one
// change of digit is one roll. First paint rests on the right value.
function useRoll(ref, vars, deps) {
  const first = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      gsap.set(el, vars);
      return;
    }
    gsap.to(el, { ...vars, duration: DURATION, ease: EASE, overwrite: "auto" });
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

const Digit = memo(function Digit({ digit, active, dir }) {
  const reelRef = useRef(null);
  const wrapRef = useRef(null);
  const first = useRef(true);

  // Slots the value doesn't use collapse to zero width
  useRoll(wrapRef, { width: active ? "0.6em" : 0, opacity: active ? 1 : 0 }, [active]);

  useEffect(() => {
    const reel = reelRef.current;
    const rest = () => gsap.set(reel, { yPercent: -(10 + digit) * STEP });
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      rest();
      return;
    }
    // Where the reel is now, folded into the middle lap (the laps look the same)
    const at = -gsap.getProperty(reel, "yPercent") / STEP;
    const from = 10 + (((at % 10) + 10) % 10);
    gsap.killTweensOf(reel);
    gsap.set(reel, { yPercent: -from * STEP });
    // Going up rolls forward to the digit, going down rolls back to it
    const forward = (((digit - from) % 10) + 10) % 10;
    const back = (((from - digit) % 10) + 10) % 10;
    const to = dir < 0 ? from - back : from + forward;
    if (to === from) return;
    gsap.to(reel, { yPercent: -to * STEP, duration: DURATION, ease: EASE, onComplete: rest });
  }, [digit]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span ref={wrapRef} aria-hidden="true" className="inline-block h-[1em] overflow-hidden leading-none" style={{ width: active ? "0.6em" : 0, opacity: active ? 1 : 0 }}>
      <span ref={reelRef} className="flex flex-col will-change-transform">
        {REEL.map((d, i) => (
          <span key={i} className="flex h-[1em] items-center justify-center">{d}</span>
        ))}
      </span>
    </span>
  );
});

const Dot = memo(function Dot({ active }) {
  const wrapRef = useRef(null);
  useRoll(wrapRef, { width: active ? "0.3em" : 0, opacity: active ? 1 : 0 }, [active]);
  return (
    <span ref={wrapRef} aria-hidden="true" className="inline-block overflow-hidden leading-none" style={{ width: active ? "0.3em" : 0, opacity: active ? 1 : 0 }}>
      .
    </span>
  );
});

/**
 * A number that rolls digit by digit. `values` lists every value it can take,
 * so the slots line up on the decimal point and fit the longest one.
 */
export default function RollNumber({ value, values = [value] }) {
  const parts = (v) => {
    const [int, frac = ""] = String(v).split(".");
    return { int, frac };
  };
  const all = values.map(parts);
  const intLen = Math.max(...all.map((p) => p.int.length));
  const fracLen = Math.max(...all.map((p) => p.frac.length));
  const cur = parts(value);
  const intDigits = cur.int.padStart(intLen, "0");

  // Which way the number moved, so every digit rolls the same way
  const [prev, setPrev] = useState(Number(value));
  const [dir, setDir] = useState(0);
  if (Number(value) !== prev) {
    setPrev(Number(value));
    setDir(Math.sign(Number(value) - prev));
  }

  return (
    <span className="inline-flex lining-nums tabular-nums leading-none">
      <span className="sr-only">{value}</span>
      {[...intDigits].map((d, i) => (
        <Digit key={`i${i}`} digit={Number(d)} dir={dir} active={i >= intLen - cur.int.length} />
      ))}
      {fracLen > 0 && <Dot active={cur.frac.length > 0} />}
      {Array.from({ length: fracLen }, (_, i) => (
        <Digit key={`f${i}`} digit={Number(cur.frac[i] ?? 0)} dir={dir} active={i < cur.frac.length} />
      ))}
    </span>
  );
}
