"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { EASINGS } from "./why-vault-data";

const TUNE_TEXT = "Tune it until it feels right.";
const WORDS = TUNE_TEXT.split(" ");
const label = "text-[11px] font-semibold uppercase tracking-[.14em]";
const range =
    "col-span-full mt-1.5 h-[1.4vw] w-full cursor-pointer appearance-none bg-transparent max-md:h-[6vw] " +
    "[&::-webkit-slider-runnable-track]:h-[0.2vw] [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--primary)_var(--fill),rgba(29,29,29,.15)_var(--fill))] max-md:[&::-webkit-slider-runnable-track]:h-[0.5vw] " +
    "[&::-webkit-slider-thumb]:-mt-[0.5vw] [&::-webkit-slider-thumb]:h-[1.2vw] [&::-webkit-slider-thumb]:w-[0.5vw] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-primary max-md:[&::-webkit-slider-thumb]:-mt-[2.3vw] max-md:[&::-webkit-slider-thumb]:h-[5vw] max-md:[&::-webkit-slider-thumb]:w-[2vw] " +
    "[&::-moz-range-track]:h-[0.2vw] [&::-moz-range-track]:bg-[#1D1D1D]/15 max-md:[&::-moz-range-track]:h-[0.5vw] " +
    "[&::-moz-range-progress]:h-[0.2vw] [&::-moz-range-progress]:bg-primary max-md:[&::-moz-range-progress]:h-[0.5vw] " +
    "[&::-moz-range-thumb]:h-[1.2vw] [&::-moz-range-thumb]:w-[0.5vw] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary max-md:[&::-moz-range-thumb]:h-[5vw] max-md:[&::-moz-range-thumb]:w-[2vw]";

function SmoothRange({ min, max, step, defaultValue, digits, label, onRelease }) {
    const inputRef = useRef(null);
    const outRef = useRef(null);
    const releaseRef = useRef(onRelease);
    useEffect(() => { releaseRef.current = onRelease; });

    useEffect(() => {
        const el = inputRef.current;
        const paint = () => {
            const v = +el.value;
            if (outRef.current) outRef.current.textContent = `${v.toFixed(digits)}s`;
            el.style.setProperty("--fill", `${((v - min) / (max - min)) * 100}%`);
        };
        const commit = () => releaseRef.current(+el.value);
        paint();
        el.addEventListener("input", paint);
        el.addEventListener("change", commit);
        return () => {
            el.removeEventListener("input", paint);
            el.removeEventListener("change", commit);
        };
    }, [min, max, digits]);

    return (
        <label className={`grid grid-cols-[1fr_auto] text-[#6B6B6B] font-medium! ${label === "Duration" || label === "Stagger" ? "" : ""} text-[11px] font-semibold uppercase tracking-[.14em]`}>
            {label} <output ref={outRef} className="text-[#1D1D1D]">{defaultValue.toFixed(digits)}s</output>
            <input
                ref={inputRef}
                type="range"
                data-sound-hover="off"
                data-sound-click="off"
                min={min}
                max={max}
                step={step}
                defaultValue={defaultValue}
                aria-label={label}
                className={range}
            />
        </label>
    );
}

export default function TuneCard({ replayKey }) {
    const wordsRef = useRef([]);
    // Live values live in a ref, not state, so slider drags cause no renders
    const tune = useRef({ duration: 1.4, stagger: 0.06, ease: "expo.out" });
    const [ease, setEase] = useState("expo.out"); // only drives aria-pressed

    const replay = useCallback(() => {
        const words = wordsRef.current.filter(Boolean);
        if (!words.length) return;
        gsap.killTweensOf(words);
        if (prefersReducedMotion()) {
            gsap.set(words, { yPercent: 0, opacity: 1 });
            return;
        }
        const { duration, stagger, ease } = tune.current;
        gsap.fromTo(
            words,
            { yPercent: 110, opacity: 0 },
            { yPercent: 0, opacity: 1, duration, stagger, ease, overwrite: true }
        );
    }, []);

    useEffect(() => {
        if (replayKey) replay();
    }, [replayKey, replay]);

    useEffect(() => () => gsap.killTweensOf(wordsRef.current.filter(Boolean)), []);

    return (
        <div className="relative grid aspect-[16/11] grid-cols-[1.1fr_.9fr] overflow-hidden bg-[#ececec] text-[#1D1D1D] max-md:aspect-[4/5] max-md:grid-cols-1">
            <div className="grid place-items-center border-r border-[#1D1D1D]/10 p-6 max-md:hidden">
                <p className="text-center font-avenir text-[clamp(1.6rem,2.8vw,2.6rem)] leading-[1.05] tracking-[-.03em]">
                    {WORDS.map((word, i) => (
                        <Fragment key={i}>
                            <span className="inline-block overflow-hidden px-[.08em] pt-[.14em] pb-[.24em] align-top -mx-[.08em] -mt-[.14em] -mb-[.24em]">
                                <span ref={(el) => { wordsRef.current[i] = el; }} className="inline-block will-change-transform">{word}</span>
                            </span>
                            {i < WORDS.length - 1 ? " " : ""}
                        </Fragment>
                    ))}
                </p>
            </div>
            <div className="grid content-center gap-5 p-6">
                <SmoothRange
                    label="Duration" min={0.4} max={3} step={0.05} defaultValue={1.4} digits={2}
                    onRelease={(v) => { tune.current.duration = v; replay(); }}
                />
                <SmoothRange
                    label="Stagger" min={0} max={0.2} step={0.005} defaultValue={0.06} digits={3}
                    onRelease={(v) => { tune.current.stagger = v; replay(); }}
                />
                <div className="font-medium!">
                    <span className={`text-[#6B6B6B] font-medium! ${label}`}>Easing</span>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                        {EASINGS.map(([name, value]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={ease === value}
                                data-sound-hover="off"
                                onClick={() => { tune.current.ease = value; setEase(value); replay(); }}
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
