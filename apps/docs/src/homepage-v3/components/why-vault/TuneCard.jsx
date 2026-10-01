"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { EASINGS } from "./why-vault-data";

const TUNE_TEXT = "Small motion. Big signal.";
const WORDS = TUNE_TEXT.split(" ");
const label = "text-[11px] font-semibold uppercase tracking-[.14em]";
const range =
    "col-span-full h-[22px] w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--primary)_var(--fill),rgba(29,29,29,.15)_var(--fill))] [&::-moz-range-progress]:h-0.5 [&::-moz-range-progress]:bg-primary [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-[#1D1D1D]/15 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary";

// 03 "Tune everything": duration, stagger and easing controls that replay a
// word reveal. Replays when the item becomes active (`replayKey` changes).
// Range whose thumb and primary fill ease toward the dragged value instead of
// snapping. The value itself updates straight away (labels stay exact).
function SmoothRange({ min, max, step, value, label, onChange, onRelease }) {
    const [display, setDisplay] = useState(value);
    const displayRef = useRef(value);
    const targetRef = useRef(value);
    const rafRef = useRef(0);

    useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

    const tick = () => {
        const target = targetRef.current;
        let next = displayRef.current + (target - displayRef.current) * 0.18;
        if (Math.abs(target - next) < (max - min) * 0.0005) next = target;
        displayRef.current = next;
        setDisplay(next);
        rafRef.current = next === target ? 0 : requestAnimationFrame(tick);
    };

    const snap = (v) => {
        const decimals = (String(step).split(".")[1] ?? "").length;
        return Math.min(max, Math.max(min, Number((Math.round((v - min) / step) * step + min).toFixed(decimals))));
    };

    const fill = ((display - min) / (max - min)) * 100;

    return (
        <input
            type="range"
            min={min}
            max={max}
            step="any"
            value={display}
            aria-label={label}
            aria-valuetext={String(value)}
            className={range}
            style={{ "--fill": `${fill}%` }}
            onChange={(e) => {
                const v = snap(+e.target.value);
                targetRef.current = v;
                onChange(v);
                if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    displayRef.current = v;
                    setDisplay(v);
                } else if (!rafRef.current) {
                    rafRef.current = requestAnimationFrame(tick);
                }
            }}
            onPointerUp={() => onRelease(targetRef.current)}
            onKeyUp={() => onRelease(targetRef.current)}
        />
    );
}

export default function TuneCard({ replayKey }) {
    const wordsRef = useRef([]);
    const [duration, setDuration] = useState(1.4);
    const [stagger, setStagger] = useState(0.06);
    const [ease, setEase] = useState("expo.out");

    const replay = useCallback((d = duration, s = stagger, e = ease) => {
        const words = wordsRef.current.filter(Boolean);
        gsap.killTweensOf(words);
        if (prefersReducedMotion()) {
            gsap.set(words, { yPercent: 0, opacity: 1 });
            return;
        }
        gsap.fromTo(words, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: d, stagger: s, ease: e });
    }, [duration, stagger, ease]);

    useEffect(() => {
        if (replayKey) replay();
        // Only a new activation replays; slider changes replay on release
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replayKey]);

    useEffect(() => () => gsap.killTweensOf(wordsRef.current.filter(Boolean)), []);

    return (
        <div className="relative grid aspect-[16/11] grid-cols-[1.1fr_.9fr] overflow-hidden bg-[#ececec] text-[#1D1D1D] max-md:aspect-[4/5] max-md:grid-cols-1">
            <div className="grid place-items-center border-r border-[#1D1D1D]/10 p-6 max-md:hidden">
                <p className="text-center font-neue-haas text-[clamp(1.6rem,2.8vw,2.6rem)] leading-[1.05] tracking-[-.03em]">
                    {WORDS.map((word, i) => (
                        <span key={i} className="inline-block overflow-hidden px-[.08em] pt-[.14em] pb-[.24em] align-top -mx-[.08em] -mt-[.14em] -mb-[.24em]">
                            <span ref={(el) => { wordsRef.current[i] = el; }} className="inline-block">{word}</span>
                            {i < WORDS.length - 1 ? " " : ""}
                        </span>
                    ))}
                </p>
            </div>
            <div className="grid content-center gap-5 p-6">
                <label className={`grid grid-cols-[1fr_auto] gap-y-1.5 text-[#6B6B6B] font-medium! ${label}`}>
                    Duration <output className="text-[#1D1D1D]">{duration.toFixed(2)}s</output>
                    <SmoothRange min={0.4} max={3} step={0.05} value={duration} label="Duration" onChange={setDuration} onRelease={(v) => replay(v)} />
                </label>
                <label className={`grid grid-cols-[1fr_auto] gap-y-1.5 text-[#6B6B6B] font-medium! ${label}`}>
                    Stagger <output className="text-[#1D1D1D]">{stagger.toFixed(3)}s</output>
                    <SmoothRange min={0} max={0.2} step={0.005} value={stagger} label="Stagger" onChange={setStagger} onRelease={(v) => replay(duration, v)} />
                </label>
                <div className="font-medium!">
                    <span className={`text-[#6B6B6B] font-medium! ${label}`}>Easing</span>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                        {EASINGS.map(([name, value]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={ease === value}
                                onClick={() => { setEase(value); replay(duration, stagger, value); }}
                                className={`h-7 px-2.5 text-xs shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-colors duration-[600ms] ${ease === value ? "bg-[#1D1D1D] text-[#F4F4F4]" : ""}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
