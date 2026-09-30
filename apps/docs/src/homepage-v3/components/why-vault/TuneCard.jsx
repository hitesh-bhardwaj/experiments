"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { EASINGS } from "./why-vault-data";

const TUNE_TEXT = "Small motion. Big signal.";
const WORDS = TUNE_TEXT.split(" ");
const label = "text-[11px] font-semibold uppercase tracking-[.14em]";
const range =
    "col-span-full h-[22px] w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:bg-[#1D1D1D]/15 [&::-webkit-slider-runnable-track]:h-0.5 [&::-webkit-slider-runnable-track]:bg-[#1D1D1D]/15 [&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary";

// 03 "Tune everything": duration, stagger and easing controls that replay a
// word reveal. Replays when the item becomes active (`replayKey` changes).
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
                    <input type="range" min="0.4" max="3" step="0.05" value={duration} aria-label="Duration" className={range}
                        onChange={(e) => setDuration(+e.target.value)} onPointerUp={(e) => replay(+e.currentTarget.value)} onKeyUp={(e) => replay(+e.currentTarget.value)} />
                </label>
                <label className={`grid grid-cols-[1fr_auto] gap-y-1.5 text-[#6B6B6B] font-medium! ${label}`}>
                    Stagger <output className="text-[#1D1D1D]">{stagger.toFixed(3)}s</output>
                    <input type="range" min="0" max="0.2" step="0.005" value={stagger} aria-label="Stagger" className={range}
                        onChange={(e) => setStagger(+e.target.value)} onPointerUp={(e) => replay(duration, +e.currentTarget.value)} onKeyUp={(e) => replay(duration, +e.currentTarget.value)} />
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
