"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { lerp, prefersReducedMotion } from "./utils";

gsap.registerPlugin(CustomEase);
CustomEase.create("centerLinesEase", "0.75,-0.01,0.16,1");

const DEFAULT_LINE_COUNT = 33;
const LINE_H = 1;
const EDGE_PAD = 12;
const DIAMOND_MAX = 0.92;
const DIAMOND_MIN = 0.06;

const STAGGER_MS = 34;
const APPEAR_MS = 260;
const MORPH_MS = 720;
const PAIR_FADE_MS = 260;
const TRANSLATE_UP_MS = 820;
const HOLD_END_MS = 260;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
}

interface CenterLinesLoadingProps {
    lineCount?: number;
    title?: string;
    subtitle?: string;
    duration?: number;
    lineHeight?: number;
    darkLineColor?: string;
    fadeOutDuration?: number;
    onComplete?: () => void;
}

export default function CenterLinesLoading(
    {
        lineCount = DEFAULT_LINE_COUNT,
        title = "Build better interfaces",
        subtitle = "Hyperiux Vault",
        duration = 1,
        lineHeight = 1,
        darkLineColor = "#ffffff",
        fadeOutDuration = 0.5,
        onComplete,
    }: CenterLinesLoadingProps = {}
) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const blackPanelRef = useRef<HTMLDivElement | null>(null);
    const revealPanelRef = useRef<HTMLDivElement | null>(null);
    const linesWrapRef = useRef<HTMLDivElement | null>(null);
    const heroWordRefs = useRef<(HTMLElement | null)[]>([]);
    const heroSubtitleRef = useRef<HTMLParagraphElement | null>(null);
    const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
    const tlRef = useRef<gsap.core.Timeline | null>(null);
    const layoutRef = useRef<{ y: number[]; coneScale: number[] }>({
      y: [],
      coneScale: [],
    });
    const [done, setDone] = useState(false);
    const safeDuration = clampNumber(duration, 0.25, 3, 1);
    const safeLineHeight = clampNumber(lineHeight, 1, 12, 1);
    const safeFadeOutDuration = clampNumber(fadeOutDuration, 0.1, 3, 0.5);

    const recomputeLayout = useCallback(
      (lineCount: number) => {
        const el = containerRef.current;
        if (!el) return;
        const { height } = el.getBoundingClientRect();
        const h = Math.max(1, Math.round(height));

        const count = Math.max(3, Math.floor(lineCount));
        const mid = (count - 1) / 2;
        const usable = Math.max(1, h - EDGE_PAD * 2);
        const spacing = usable / Math.max(1, count - 1);
        const topY = EDGE_PAD;

        const y: number[] = [];
        const coneScale: number[] = [];

        for (let i = 0; i < count; i++) {
            y.push(Math.round(topY + i * spacing));

            // Linear falloff gives a crisp"diamond" edge (not a curved funnel).
            const t = mid === 0 ? 0 : Math.abs(i - mid) / mid; // 0 at center, 1 at extremes
            const wPct = lerp(DIAMOND_MAX, DIAMOND_MIN, t);
            coneScale.push(wPct);
        }

        layoutRef.current = { y, coneScale };
    }, []);

    const heroWords = title.split("").filter((c) => c !== " ");
    const words = title.split(" ");

    const run = useCallback(() => {
        tlRef.current?.kill();
        setDone(false);

        const count = Math.max(3, Math.floor(lineCount));
        recomputeLayout(count);

        const lines = lineRefs.current.slice(0, count);
        const { y, coneScale } = layoutRef.current;

        const wordEls = heroWordRefs.current.slice(0, heroWords.length).filter(Boolean);

        gsap.set(blackPanelRef.current, { yPercent: 0, opacity: 1 });
        gsap.set(revealPanelRef.current, { scaleY: 0, transformOrigin: "50% 50%" });
        gsap.set(linesWrapRef.current, { opacity: 1 });
        gsap.set(wordEls, { opacity: 0, y: 16, filter: "blur(12px)" });
        gsap.set(heroSubtitleRef.current, { opacity: 0, y: 14, filter: "blur(10px)" });
        gsap.set(lines, {
            opacity: 1,
            left: "50%",
            xPercent: -50,
            y: (i: number) => y[i],
            scaleX: 0,
            transformOrigin: "50% 50%",
        });

        if (prefersReducedMotion()) {
            // Lines already at full width - smooth opacity only (no scale morph / pair wipe).
            gsap.set(lines, {
                scaleX: 1,
                opacity: 0,
                y: (i: number) => y[i],
            });
            gsap.set(linesWrapRef.current, { opacity: 1 });
            gsap.set(revealPanelRef.current, {
                scaleY: 1,
                opacity: 0,
                transformOrigin: "50% 50%",
            });
            gsap.set(blackPanelRef.current, { opacity: 1 });
            gsap.set(wordEls, { opacity: 0, y: 0, filter: "blur(0px)" });
            gsap.set(heroSubtitleRef.current, {
                opacity: 0,
                y: 0,
                filter: "blur(0px)",
            });

            const tl = gsap.timeline({
                defaults: { ease: "power2.inOut" },
                onComplete: () => {
                    setDone(true);
                    onComplete?.();
                },
            });
            tlRef.current = tl;
            tl.timeScale(1 / safeDuration);

            tl.to(lines, {
                opacity: 1,
                duration: 0.65,
                stagger: { each: 0.02, from: "center" },
            });
            tl.to(
                lines,
                {
                    opacity: 0,
                    duration: safeFadeOutDuration,
                    stagger: { each: 0.015, from: "edges" },
                },
                "+=0.35"
            );
            tl.to(linesWrapRef.current, { opacity: 0, duration: 0.35 }, "<");
            tl.to(
                revealPanelRef.current,
                { opacity: 1, duration: 0.55 },
                "-=0.2"
            );
            tl.to(blackPanelRef.current, { opacity: 0, duration: 0.55 }, "<");
            tl.to(
                wordEls,
                {
                    opacity: 1,
                    duration: 0.5,
                },
                "-=0.2"
            );
            tl.to(
                heroSubtitleRef.current,
                { opacity: 1, duration: 0.45 },
                "-=0.25"
            );
            return;
        }

        const staggerS = STAGGER_MS / 1000;
        const appearS = APPEAR_MS / 1000;
        const morphS = MORPH_MS / 1000;
        const totalS = appearS + morphS;
        const appearPct = totalS === 0 ? 1 : appearS / totalS;
        const scaleSetters = lines.map((el) => (el ? gsap.quickSetter(el, "scaleX") : null));

        const tl = gsap.timeline({
            defaults: { ease: "centerLinesEase" },
            onComplete: () => {
                setDone(true);
                onComplete?.();
            },
        });
        tlRef.current = tl;
        tl.timeScale(1 / safeDuration);

        const mid = (count - 1) / 2;
        const orderIdx = Array.from({ length: count }, (_, i) => i).sort((a, b) => {
            const da = Math.abs(a - mid);
            const db = Math.abs(b - mid);
            return da - db;
        });

        for (let i = 0; i < count; i++) {
            const idx = orderIdx[i];
            const startAt = i * staggerS;
            const setScaleX = scaleSetters[idx];
            if (!setScaleX) continue;

            const driver = { p: 0 };
            tl.to(
                driver,
                {
                    p: 1,
                    duration: totalS,
                    onUpdate: () => {
                        const p = driver.p;
                        const scaled =
                            p <= appearPct
                                ? coneScale[idx] * (appearPct === 0 ? 1 : p / appearPct)
                                : coneScale[idx] + (1 - coneScale[idx]) * ((p - appearPct) / (1 - appearPct));
                        setScaleX(scaled);
                    },
                },
                startAt
            );
        }

        const lastStart = (count - 1) * staggerS;
        const allLinesEnd = lastStart + totalS;

        // Fade top+bottom lines in synchronous pairs, leaving only the middle line.
        const midIdx = Math.floor((count - 1) / 2);
        const pairCount = midIdx;
        const pairFadeDur = safeFadeOutDuration;
        const pairGap = 0.045;
        for (let k = 0; k < pairCount; k++) {
            const a = k;
            const b = count - 1 - k;
            tl.to(
                [lines[a], lines[b]].filter(Boolean),
                { opacity: 0, duration: pairFadeDur },
                allLinesEnd + k * pairGap
            );
        }

        const pairsEnd = allLinesEnd + (pairCount - 1) * pairGap + pairFadeDur;
        const revealStart = pairsEnd + 0.02;

        // Page reveal: white expands from the center to top and bottom.
        tl.to(
            revealPanelRef.current,
            { scaleY: 1, duration: TRANSLATE_UP_MS / 1000 },
            revealStart
        );
        tl.to(
            blackPanelRef.current,
            { opacity: 0, duration: TRANSLATE_UP_MS / 1000 + 0.25 },
            revealStart + 0.14
        );
        tl.to(linesWrapRef.current, { opacity: 0, duration: safeFadeOutDuration }, revealStart + 0.06);
        tl.to(lines[midIdx], { opacity: 0, duration: safeFadeOutDuration }, revealStart + 0.06);

        tl.to(
            wordEls,
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.78,
                stagger: 0.06,
            },
            revealStart + 0.18
        );
        tl.to(
            heroSubtitleRef.current,
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.68,
            },
            revealStart + 0.32
        );
        tl.to({}, { duration: Math.max(0, HOLD_END_MS / 1000) }, revealStart + TRANSLATE_UP_MS / 1000);
    }, [heroWords.length, lineCount, onComplete, recomputeLayout, safeDuration, safeFadeOutDuration]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const count = Math.max(3, Math.floor(lineCount));
        const ro = new ResizeObserver(() => recomputeLayout(count));
        ro.observe(el);

        const id = setTimeout(run, 60);
        return () => {
            clearTimeout(id);
            ro.disconnect();
            tlRef.current?.kill();
        };
    }, [lineCount, recomputeLayout, run]);

    let charIdx = 0;
    return (
        <div ref={containerRef} className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
            <div
                ref={blackPanelRef}
                className="absolute inset-0 z-20 bg-black will-change-transform"
            />
            <div
                ref={revealPanelRef}
                className="absolute inset-0 z-30 bg-white scale-y-0 will-change-transform"
            />
            <div className="absolute inset-0 z-50 flex items-center justify-center">
                <div className="px-6 text-center">
                    <h1 className="select-none font-mono text-[3.5vw] max-[1025px]:text-[5vw] max-md:text-[10vw] font-semibold leading-[1.05] tracking-[-0.03em] text-black">
                        {words.map((word, wordIdx) => (
                            <span key={`${word}-${wordIdx}`}>
                                <span className="inline-block whitespace-nowrap">
                                    {word.split("").map((char, charIdxInWord) => {
                                        const currentIdx = charIdx++;
                                        return (
                                            <span
                                                key={`${char}-${charIdxInWord}`}
                                                ref={(el) => {
                                                    heroWordRefs.current[currentIdx] = el;
                                                }}
                                                className="inline-block opacity-0"
                                            >
                                                {char}
                                            </span>
                                        );
                                    })}
                                </span>
                                {wordIdx === words.length - 1 ? "" : " "}
                            </span>
                        ))}
                    </h1>
                    <p
                        ref={heroSubtitleRef}
                        className="mt-4 select-none font-mono text-[13px] tracking-[0.18em] text-black/70 opacity-0"
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
            <div ref={linesWrapRef} className="pointer-events-none absolute inset-0 z-40 opacity-0">
                {Array.from({ length: Math.max(3, Math.floor(lineCount)) }, (_, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            lineRefs.current[i] = el;
                        }}
                        className="absolute left-1/2 top-0 w-full origin-center will-change-transform"
                        style={{ height: safeLineHeight, backgroundColor: darkLineColor }}
                    />
                ))}
            </div>

            {done && (
                <button
                    onClick={run}
                    className="absolute bottom-7 max-[1025px]:bottom-10 left-1/2 z-60 -translate-x-1/2 cursor-pointer rounded-sm border border-black/20 bg-black/5 px-5.5 py-1.75 font-mono text-[0.75vw] max-[1025px]:text-base max-md:text-sm tracking-widest text-black/70 backdrop-blur max-md:bottom-20"
                >
                    Replay
                </button>
            )}
        </div>
    );
}
