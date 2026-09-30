"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Manrope } from "next/font/google";
import Matter from "matter-js";
import { createFellOver } from "../lib/fell-over";
import { suggestPages } from "../lib/suggest-pages";
import { useInteraction } from "./InteractionProvider";

// The physics digits are drawn on a canvas in an 800 weight. The site's own
// face only ships 400/500, so Manrope 800 is loaded for this page alone.
// next/font renames the family, so the canvas is handed the real name.
const manrope = Manrope({ weight: "800", subsets: ["latin"], display: "swap" });
const FELL_OPTIONS = {
    font: `800 {s}px ${manrope.style.fontFamily}, system-ui, sans-serif`,
    fontLoad: `800 100px ${manrope.style.fontFamily}`,
};

const QUICK_LINKS = [
    { label: "Effects", href: "/effects" },
    { label: "Templates", href: "/templates" },
    { label: "Docs", href: "/docs" },
    { label: "Home", href: "/" },
];
const QUIP_MS = 3600;

const label = "text-[11px] font-semibold uppercase tracking-[.14em]";
const riseIn = "motion-safe:animate-[hx-up_1s_cubic-bezier(.16,1,.3,1)_both]";

// "This page fell over": drag 4 0 4 back onto the line (or skip the physics),
// then pick from the closest real pages. Plays notes once sound is on.
export default function SiteNotFound({ pages = [] }) {
    const canvasRef = useRef(null);
    const fellRef = useRef(null);
    const quipTimerRef = useRef(0);
    const { sound } = useInteraction();
    const asked = usePathname() || "/";
    const suggestions = useMemo(() => suggestPages(asked, pages), [asked, pages]);

    const [standing, setStanding] = useState(false);
    const [grabbed, setGrabbed] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [quip, setQuip] = useState("");

    const showQuip = useCallback((text) => {
        clearTimeout(quipTimerRef.current);
        setQuip(text);
        if (text) quipTimerRef.current = setTimeout(() => setQuip(""), QUIP_MS);
    }, []);

    useEffect(() => {
        document.documentElement.style.overflow = "hidden";
        const fell = createFellOver(canvasRef.current, {
            Matter,
            onFirstGrab: () => setGrabbed(true),
            onGrab: (x) => sound?.hover?.(x),
            onSnap: (i) => sound?.note?.(i + 2),
            onHit: () => sound?.tap?.(),
            onQuip: showQuip,
            onDone: () => { sound?.reform?.(); setStanding(true); setRevealed(true); },
            onUndone: () => setStanding(false),
            ...FELL_OPTIONS,
        });
        fellRef.current = fell;
        return () => {
            clearTimeout(quipTimerRef.current);
            fell.destroy();
            fellRef.current = null;
            document.documentElement.style.overflow = "";
        };
    }, [sound, showQuip]);

    const skip = () => {
        if (!fellRef.current?.tidy()) setRevealed(true);
    };

    return (
        <main className="fixed inset-0 bg-[#141414] font-neue-haas text-[#F4F4F4]">
            <canvas ref={canvasRef} className="fixed inset-0 block h-screen w-screen touch-none [&.can]:cursor-grab [&.grab]:cursor-grabbing" aria-hidden="true" />

            <header className="pointer-events-none fixed inset-x-0 top-[var(--headY,18vh)] z-2 text-center">
                <h1 key={standing ? "standing" : "fell"} className={`text-[clamp(2rem,3.4vw,3.2rem)] leading-[1.05] font-normal tracking-[-.035em] ${riseIn}`}>
                    {standing ? <>Standing <span className="gradient-text-animate">again.</span></> : <>This page <span className="gradient-text-animate">fell over.</span></>}
                </h1>
            </header>

            <p className={`pointer-events-none fixed inset-x-0 top-[var(--hintY,62vh)] z-2 text-center text-[#999] transition-opacity duration-800 ${grabbed || revealed ? "opacity-0" : "motion-safe:animate-[hx-fade_1.2s_cubic-bezier(.16,1,.3,1)_.9s_both]"} ${label}`}>
                Drag 4 0 4 back onto the line
            </p>

            {revealed && (
                <section className="fixed top-[var(--hintY,62vh)] left-1/2 z-2 grid w-[min(620px,calc(100vw-40px))] -translate-x-1/2 justify-items-center gap-4 text-center" aria-live="polite">
                    <p className={`text-[16.5px] text-[#bdbdbd] ${riseIn}`}>Shame the page still doesn’t exist. Try one of these:</p>
                    <ul className={`flex flex-wrap justify-center gap-2 ${riseIn} [animation-delay:.08s]`}>
                        {suggestions.map((p) => (
                            <li key={p.href}>
                                <Link href={p.href} className="inline-flex h-10 items-center rounded-full bg-white/5 px-4 text-[15px] text-[#F4F4F4] no-underline shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)] transition-[background-color,box-shadow] duration-400 hover:bg-primary/10 hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.5)] focus-visible:bg-primary/10">
                                    {p.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <p className={`flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 text-[#6a6a6a] ${riseIn} [animation-delay:.16s] ${label}`}>
                        You asked for{" "}
                        <code className="rounded-md bg-white/5 px-2 py-[3px] font-mono text-[12.5px] tracking-normal text-[#cfcfcf] normal-case">{asked}</code>
                        {QUICK_LINKS.map((l) => (
                            <Link key={l.href} href={l.href} className="text-[#bdbdbd] underline decoration-white/20 underline-offset-4 hover:text-white">{l.label}</Link>
                        ))}
                    </p>
                </section>
            )}

            <button
                type="button"
                onClick={skip}
                className={`fixed bottom-[30px] left-1/2 z-3 -translate-x-1/2 cursor-pointer whitespace-nowrap text-[#9c9c9c] underline decoration-white/20 underline-offset-4 transition-colors duration-400 hover:text-white hover:decoration-primary max-sm:bottom-6 ${label}`}
            >
                Skip the physics
            </button>

            <p
                aria-live="polite"
                className={`pointer-events-none fixed bottom-[92px] left-1/2 z-3 -translate-x-1/2 rounded-full bg-[#F4F4F4] px-3.5 py-[9px] text-xs tracking-[.08em] whitespace-nowrap text-[#1D1D1D] uppercase transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] max-sm:bottom-20 ${quip ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"} font-semibold`}
            >
                {quip}
            </p>
        </main>
    );
}
