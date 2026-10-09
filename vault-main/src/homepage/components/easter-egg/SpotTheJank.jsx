"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import CornerMarks from "../CornerMarks";
import { ButtonChrome, buttonClassName } from "../Button";
import { BADGES, CYCLE_S, FLAW_KEYS, FLAWS, SCENES, drawScene, lerp } from "./jank-scenes";

const STORAGE = { best: "hx-jank-best", badges: "hx-jank-badges" };
const TICK_MS = 250;
const RIGHT_PAUSE_MS = 1300;
const WRONG_PAUSE_MS = 2600;
const MAX_LIVES = 3;
const MAX_DPR = 2;
const FOCUS_DELAY_MS = 200;
const EXIT_MS = 320;

// Engines without the jank voices get the closest game sound instead
const JANK_FALLBACK = { right: "catch", wrong: "bug", streak: "level", start: "open", over: "over" };

const label = "text-[11px] font-semibold uppercase tracking-[.14em]";
const btnBase = `inline-flex h-11 items-center px-5 no-underline transition-[box-shadow,background-color] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] ${label}`;
const btnGhost = `${btnBase} bg-white/5 text-white shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.6)]`;

function readSaved() {
    try {
        return {
            best: +(localStorage.getItem(STORAGE.best) || 0),
            badges: JSON.parse(localStorage.getItem(STORAGE.badges) || "{}"),
        };
    } catch {
        return { best: 0, badges: {} };
    }
}

function writeSaved(best, badges) {
    try {
        localStorage.setItem(STORAGE.best, String(best));
        localStorage.setItem(STORAGE.badges, JSON.stringify(badges));
    } catch {
        // Storage blocked: progress lasts for this visit only
    }
}

const freshRun = () => ({
    score: 0, streak: 0, maxStreak: 0, lives: MAX_LIVES, round: 0, diff: 0, t0: 0, limit: 6,
    side: 0, flaw: null, scene: "cards", state: "idle", spotted: {}, missed: {}, right: 0, total: 0, tick: -1,
});

export default function SpotTheJank({ onClose, sound, toast, realHref = "/effects" }) {
    const runRef = useRef(freshRun());
    const [savedInit] = useState(readSaved);
    const savedRef = useRef(savedInit);
    const canvasRefs = useRef([]);
    const timerRef = useRef(null);
    const startBtnRef = useRef(null);
    const againBtnRef = useRef(null);
    const dialogRef = useRef(null);
    const closeTimerRef = useRef(0);
    const sizeRef = useRef({ W: 0, H: 0, pr: 1, font: "system-ui, sans-serif" });
    const nextTimerRef = useRef(0);

    const [closing, setClosing] = useState(false);
    const [startHovered, setStartHovered] = useState(false);
    const [againHovered, setAgainHovered] = useState(false);
    const [screen, setScreen] = useState("start"); 
    const [hud, setHud] = useState({ score: 0, streak: 0, lives: MAX_LIVES, round: 0, best: savedInit.best });
    const [reveal, setReveal] = useState(null); 
    const [note, setNote] = useState("");
    const [result, setResult] = useState(null); 

    const sfx = useCallback((ev, n) => {
        if (sound?.jank) sound.jank(ev, n);
        else if (JANK_FALLBACK[ev]) sound?.gameSfx?.(JANK_FALLBACK[ev], n);
    }, [sound]);

    const syncHud = useCallback(() => {
        const S = runRef.current;
        setHud({ score: S.score, streak: S.streak, lives: S.lives, round: S.round, best: savedRef.current.best });
    }, []);

    const measure = useCallback(() => {
        const pr = Math.min(devicePixelRatio || 1, MAX_DPR);
        canvasRefs.current.forEach((c) => {
            if (!c) return;
            const r = c.getBoundingClientRect();
            c.width = r.width * pr;
            c.height = r.height * pr;
        });
        const first = canvasRefs.current[0]?.getBoundingClientRect();
        const family = getComputedStyle(document.body).getPropertyValue("--font-avenir").trim();
        sizeRef.current = { W: first?.width || 0, H: first?.height || 0, pr, font: `${family ? `${family}, ` : ""}system-ui, sans-serif` };
    }, []);

    const award = useCallback((key) => {
        const saved = savedRef.current;
        if (saved.badges[key]) return;
        saved.badges = { ...saved.badges, [key]: 1 };
        writeSaved(saved.best, saved.badges);
        toast?.(`Achievement unlocked · ${BADGES.find((b) => b[0] === key)[1]}`);
    }, [toast]);

    const nextRound = useCallback(() => {
        const S = runRef.current;
        S.round++;
        S.diff = Math.min(1, (S.round - 1) / 16);
        S.scene = SCENES[(Math.random() * SCENES.length) | 0];
        S.flaw = {
            k: FLAW_KEYS[(Math.random() * FLAW_KEYS.length) | 0],
            hitch: 0.2 + Math.random() * 0.4,
            off: [0, 0.9, -0.6, 1, -0.3, 0.7, -0.9, 0.4, 0.2].sort(() => Math.random() - 0.5),
        };
        S.side = Math.random() < 0.5 ? 0 : 1;
        S.limit = lerp(6.5, 3.2, S.diff);
        S.t0 = performance.now();
        S.state = "play";
        setReveal(null);
        setNote("");
        syncHud();
    }, [syncHud]);

    const endGame = useCallback(() => {
        const S = runRef.current;
        const saved = savedRef.current;
        S.state = "over";
        const newBest = S.score > saved.best;
        if (newBest) {
            saved.best = S.score;
            writeSaved(saved.best, saved.badges);
        }
        syncHud();
        sfx("over");
        const accuracy = S.total ? Math.round((S.right / S.total) * 100) : 0;
        const worst = Object.keys(S.missed).sort((a, b) => S.missed[b] - S.missed[a])[0];
        let verdict = "Keep looking";
        if (newBest) verdict = "New best";
        else if (S.score >= 3000) verdict = "Motion-literate";
        else if (S.score >= 1200) verdict = "Trained eye";
        setResult({
            verdict,
            score: S.score,
            summary: `${S.right} of ${S.total} spotted (${accuracy}%), best streak ${S.maxStreak}.${worst ? ` Hardest for you: ${FLAWS[worst][0]}.` : ""} Vault handles all of these by default, so your users never see them.`,
            badges: BADGES.map(([key, text]) => ({ key, text, got: !!saved.badges[key] })),
        });
        setScreen("over");
    }, [sfx, syncHud]);

    const choose = useCallback((side) => {
        const S = runRef.current;
        if (S.state !== "play") return;
        const correct = side === 1 - S.side;
        const elapsed = performance.now() - S.t0;
        const [flawName, flawWhy] = FLAWS[S.flaw.k];
        S.state = "reveal";
        S.total++;
        setReveal({ flawedSide: S.side, flawName });
        if (correct) {
            S.right++;
            S.streak++;
            S.maxStreak = Math.max(S.maxStreak, S.streak);
            const timeBonus = Math.round(Math.max(0, 1 - elapsed / (S.limit * 1000)) * 100);
            const points = 100 + S.streak * 25 + timeBonus + Math.round(S.diff * 150);
            S.score += points;
            S.spotted[S.flaw.k] = 1;
            setNote(`+${points} · ${flawWhy}`);
            sfx("right", S.streak);
            if (S.streak % 5 === 0) sfx("streak");
            if (S.streak >= 5) award("s5");
            if (S.streak >= 12) award("s12");
            if (S.diff >= 0.8) award("pro");
            if (S.score >= 3000) award("p3k");
            if (Object.keys(S.spotted).length === FLAW_KEYS.length) award("all");
        } else {
            S.lives--;
            S.streak = 0;
            S.missed[S.flaw.k] = (S.missed[S.flaw.k] || 0) + 1;
            setNote(`${side === -1 ? "Time. " : ""}${S.side ? "B" : "A"} had ${flawName}. ${flawWhy}`);
            sfx("wrong");
        }
        syncHud();
        nextTimerRef.current = setTimeout(() => {
            if (S.lives <= 0) endGame();
            else nextRound();
        }, correct ? RIGHT_PAUSE_MS : WRONG_PAUSE_MS);
    }, [award, endGame, nextRound, sfx, syncHud]);

    const start = useCallback(() => {
        measure();
        runRef.current = freshRun();
        setResult(null);
        setScreen("play");
        sfx("start");
        nextRound();
    }, [measure, nextRound, sfx]);

    const requestClose = useCallback(() => {
        if (closing) return;
        setClosing(true);
        closeTimerRef.current = setTimeout(onClose, EXIT_MS);
    }, [closing, onClose]);

    // Open: lock page scroll, focus the start button
    useEffect(() => {
        sfx("start");
        document.documentElement.style.overflow = "hidden";
        const focusTimer = setTimeout(() => startBtnRef.current?.focus(), FOCUS_DELAY_MS);
        return () => {
            clearTimeout(focusTimer);
            clearTimeout(closeTimerRef.current);
            clearTimeout(nextTimerRef.current);
            runRef.current.state = "idle";
            document.documentElement.style.overflow = "";
        };
    }, [sfx]);

    useEffect(() => {
        if (screen === "over") againBtnRef.current?.focus();
    }, [screen]);

    // Draw loop and countdown
    useEffect(() => {
        measure();
        let raf = 0;
        const loop = (now) => {
            raf = requestAnimationFrame(loop);
            const S = runRef.current;
            const size = sizeRef.current;
            if (!size.W) return;
            const t = Math.min(1, (((now / 1000) % CYCLE_S) / CYCLE_S) * 1.25);
            canvasRefs.current.forEach((c, i) => {
                const g = c?.getContext("2d");
                if (g) drawScene(g, S.scene, t, S.state !== "idle" && i === S.side ? S.flaw : null, { diff: S.diff, ...size });
            });
            if (S.state !== "play") return;
            const left = 1 - (now - S.t0) / (S.limit * 1000);
            if (timerRef.current) timerRef.current.style.transform = `scaleX(${Math.max(0, left)})`;
            if (left < 0.3 && Math.floor(now / TICK_MS) !== S.tick) {
                S.tick = Math.floor(now / TICK_MS);
                sfx("tick");
            }
            if (left <= 0) choose(-1);
        };
        raf = requestAnimationFrame(loop);
        window.addEventListener("resize", measure);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", measure);
        };
    }, [measure, choose, sfx]);

    // Keys: Esc closes, ←/→ (or a/b, 1/2) pick, Tab stays inside the dialog
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") { e.preventDefault(); requestClose(); return; }
            if (["ArrowLeft", "a", "1"].includes(e.key)) { e.preventDefault(); choose(0); }
            if (["ArrowRight", "b", "2"].includes(e.key)) { e.preventDefault(); choose(1); }
            if (e.key !== "Tab") return;
            const focusable = Array.from(dialogRef.current?.querySelectorAll("button,a") || []).filter((x) => x.offsetParent !== null);
            if (!focusable.length) return;
            const i = focusable.indexOf(document.activeElement);
            if (e.shiftKey && i <= 0) { e.preventDefault(); focusable.at(-1).focus(); }
            else if (!e.shiftKey && i === focusable.length - 1) { e.preventDefault(); focusable[0].focus(); }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [requestClose, choose]);

    const share = () => {
        const text = `I scored ${runRef.current.score} in Spot the Jank, the hidden game on Hyperiux Vault. Think your eye is sharper?`;
        if (!navigator.clipboard) { toast?.(text); return; }
        navigator.clipboard.writeText(text).then(() => toast?.("Score copied. Go challenge someone."), () => toast?.(text));
    };

    const lives = "●●●".slice(0, hud.lives) + "○○○".slice(0, MAX_LIVES - hud.lives);
    const screenCls = "absolute inset-0 grid place-content-center justify-items-center gap-[18px] bg-[radial-gradient(60%_60%_at_50%_50%,rgba(15,15,15,.6),rgba(15,15,15,.92))] p-8 text-center";
    const display = "font-aeonik text-[clamp(2.6rem,6vw,5rem)] font-normal leading-[1.02] tracking-[-.035em]";
    const eyebrow = `inline-flex items-center gap-2.5 text-[#9c9c9c] before:size-[5px] before:bg-primary before:content-[''] ${label}`;

    return createPortal(
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stj-title"
            className={`fixed inset-0 z-[2147482000] grid place-items-center bg-[rgba(8,8,8,.78)] p-[clamp(12px,3vw,40px)] font-avenir leading-relaxed text-white backdrop-blur-[18px] backdrop-saturate-[1.4] ${closing ? "motion-safe:animate-[hx-fade-out_.32s_ease-in_both]" : "motion-safe:animate-[hx-fade-in_.5s_ease-out_both]"}`}
            data-lenis-prevent
            onClick={(e) => { if (e.target === e.currentTarget) requestClose(); }}
        >
            <div className={`relative grid aspect-[16/10] max-h-[calc(100vh-24px)] w-[min(1040px,100%)] grid-rows-[auto_auto_1fr_auto] border border-grey bg-[#0f0f0f] px-[clamp(16px,3vw,40px)] pt-16 pb-[26px] shadow-[0_60px_120px_-40px_rgba(255,107,0,.35)] max-md:aspect-auto max-md:h-[calc(100vh-24px)] ${closing ? "motion-safe:animate-[hx-scale-out_.32s_cubic-bezier(.7,0,.84,0)_both]" : "motion-safe:animate-[hx-scale-in_.8s_cubic-bezier(.16,1,.3,1)_both]"}`}>
                {/* <CornerMarks /> */}
                <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-center gap-[clamp(12px,3vw,34px)] px-[22px] py-[18px] text-[#8a8a8a] max-md:flex-wrap max-md:gap-y-1 max-md:pr-[70px] ${label}`} aria-hidden="true">
                    {[["Score", hud.score], ["Streak", hud.streak], ["Lives", lives], ["Round", hud.round], ["Best", hud.best]].map(([name, value]) => (
                        <span key={name}>{name} <b className="ml-1.5 font-semibold text-white tabular-nums">{value}</b></span>
                    ))}
                </div>
                <button type="button" onClick={requestClose} aria-label="Close game" className={`absolute top-3 right-4 z-20 h-[30px] border border-grey bg-[#0f0f0f] px-2.5 text-white transition-colors duration-500 hover:border-primary hover:text-foreground ${label}`}>
                    Esc
                </button>

                <div className="mt-1.5 h-0.5 overflow-hidden bg-white/10" aria-hidden="true">
                    <i ref={timerRef} className="block h-full origin-left bg-primary" />
                </div>
                <p className={`mt-[18px] mb-3.5 text-center text-[#8a8a8a] ${label}`} aria-hidden="true">Which one is smooth?</p>

                <div className="grid min-h-0 grid-cols-2 gap-[clamp(10px,2vw,22px)] max-md:grid-cols-1 max-md:grid-rows-2">
                    {[0, 1].map((side) => {
                        const isFlawed = reveal && reveal.flawedSide === side;
                        const isGood = reveal && reveal.flawedSide !== side;
                        let ring = "shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)] hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.55),0_20px_50px_-24px_rgba(255,107,0,.5)]";
                        if (isGood) ring = "shadow-[inset_0_0_0_2px_rgba(99,214,154,.7)]";
                        if (isFlawed) ring = "shadow-[inset_0_0_0_2px_rgba(255,90,74,.6)]";
                        return (
                            <button
                                key={side}
                                type="button"
                                onClick={() => choose(side)}
                                aria-label={`Choose ${side ? "B" : "A"}`}
                                className={`relative bg-[#161616] transition-shadow duration-500 ${ring}`}
                            >
                                {/* <CornerMarks /> */}
                                <canvas ref={(el) => { canvasRefs.current[side] = el; }} className="absolute inset-0 size-full" />
                                <span className={`absolute top-3 left-3.5 flex items-center gap-2 text-[#9c9c9c] ${label}`}>
                                    {side ? "B" : "A"}
                                    <span className="inline-flex items-center px-1.5 py-px text-[11px] text-[#9c9c9c] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)]">{side ? "→" : "←"}</span>
                                </span>
                                {reveal && (
                                    <span className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-[7px] whitespace-nowrap ${label} ${isGood ? "bg-[rgba(99,214,154,.14)] text-[#63d69a] shadow-[inset_0_0_0_1px_rgba(99,214,154,.4)]" : "bg-[rgba(255,90,74,.14)] text-[#ff7a6a] shadow-[inset_0_0_0_1px_rgba(255,90,74,.45)]"}`}>
                                        {isGood ? "✓ smooth" : `✕ ${reveal.flawName}`}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <p className="mt-3.5 min-h-[1.6em] text-center text-sm text-[#b5b5b5]" aria-live="polite">{note}</p>

                {screen === "start" && (
                    <div className={screenCls}>
                        <p className={eyebrow}>You found the easter egg</p>
                        <h2 id="stj-title" className={display}>Spot the <span className="gradient-text-animate">jank.</span></h2>
                        <p className="max-w-[46ch] text-[#b5b5b5]">
                            Two versions of the same interaction play side by side. One is Vault-smooth. The other hides a flaw: dropped frames, stiff easing, layout shift, sloppy stagger. Pick the smooth one before time runs out. The flaws get subtler as you go.
                        </p>
                        <p className={`text-[#6d6d6d] ${label}`}>Click a panel or press ← / → · 3 lives</p>
                        <button
                            ref={startBtnRef}
                            type="button"
                            onClick={start}
                            onMouseEnter={() => setStartHovered(true)}
                            onMouseLeave={() => setStartHovered(false)}
                            onFocus={() => setStartHovered(true)}
                            onBlur={() => setStartHovered(false)}
                            className={buttonClassName({ variant: "outline" })}
                        >
                            <ButtonChrome label="Train my eye" hovered={startHovered} />
                        </button>
                    </div>
                )}

                {screen === "over" && result && (
                    <div className={`${screenCls} *:motion-safe:animate-[hx-up_1.2s_cubic-bezier(.16,1,.3,1)_both] [&>*:nth-child(2)]:[animation-delay:.08s] [&>*:nth-child(3)]:[animation-delay:.16s] [&>*:nth-child(4)]:[animation-delay:.24s] [&>*:nth-child(5)]:[animation-delay:.32s]`}>
                        <p className={eyebrow}>{result.verdict}</p>
                        <h2 id="stj-title" className={display}>{result.score} <span>points</span></h2>
                        <p className="max-w-[46ch] text-[#b5b5b5]">{result.summary}</p>
                        <ul className="flex max-w-[560px] flex-wrap justify-center gap-2">
                            {result.badges.map((b) => (
                                <li key={b.key} className={`px-2.5 py-1.5 text-xs ${b.got ? "bg-primary/10 text-[#FFB27A] shadow-[inset_0_0_0_1px_rgba(255,107,0,.5)]" : "text-[#6d6d6d] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)]"}`}>
                                    {b.got ? "✓ " : ""}{b.text}
                                </li>
                            ))}
                        </ul>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button
                                ref={againBtnRef}
                                type="button"
                                onClick={start}
                                onMouseEnter={() => setAgainHovered(true)}
                                onMouseLeave={() => setAgainHovered(false)}
                                onFocus={() => setAgainHovered(true)}
                                onBlur={() => setAgainHovered(false)}
                                className={buttonClassName({ variant: "outline" })}
                            >
                                <ButtonChrome label="Play again" hovered={againHovered} />
                            </button>
                            <Link href={realHref} onClick={requestClose} className={btnGhost}>See how Vault avoids jank</Link>
                            <button type="button" onClick={share} className={btnGhost}>Copy score</button>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
