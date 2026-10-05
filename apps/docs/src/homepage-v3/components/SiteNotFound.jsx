"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Matter from "matter-js";
import { createFellOver } from "../lib/fell-over";
import { suggestPages } from "../lib/suggest-pages";
import { useInteraction } from "./InteractionProvider";
import ButtonV3 from "./ButtonV3";

// The physics digits are drawn on a canvas in Aeonik Pro Bold. next/font
// renames the family behind --font-aeonik, so the real name is read at mount.
function aeonikOptions() {
    const family = getComputedStyle(document.body).getPropertyValue("--font-aeonik").trim() || "system-ui";
    return {
        font: `700 {s}px ${family}, system-ui, sans-serif`,
        fontLoad: `700 100px ${family}`,
    };
}

const MORE_LINKS = [
    { label: "Templates", href: "/templates" },
    { label: "Docs", href: "/docs" },
    { label: "Pricing", href: "/pricing" },
];
const QUIP_MS = 3600;

const label = "text-[1.15vw] max-md:text-[4.5vw] max-[1025px]:text-[2.2vw]";
const riseIn = "motion-safe:animate-[hx-up_1s_cubic-bezier(.16,1,.3,1)_both]";

// "This page fell over": drag 4 0 4 back onto the line (or skip the physics),
// then pick from the closest real pages. Plays notes once sound is on.
export default function SiteNotFound({ pages = [] }) {
    const canvasRef = useRef(null);
    const fellRef = useRef(null);
    const quipTimerRef = useRef(0);
    const { sound } = useInteraction();
    const asked = usePathname() || "/";
    // Query params aren't in usePathname; read them after mount.
    const [search, setSearch] = useState("");
    useEffect(() => setSearch(window.location.search), [asked]);
    const suggestions = useMemo(() => suggestPages(asked, pages, { search, limit: 3 }), [asked, pages, search]);

    const [standing, setStanding] = useState(false);
    const [grabbed, setGrabbed] = useState(false);
    const [revealed, setRevealed] = useState(false);
    // The text stays put while the pill fades out, so the box never collapses empty mid-fade.
    const [quip, setQuip] = useState("");
    const [quipVisible, setQuipVisible] = useState(false);

    const showQuip = useCallback((text) => {
        clearTimeout(quipTimerRef.current);
        if (!text) {
            setQuipVisible(false);
            return;
        }
        setQuip(text);
        setQuipVisible(true);
        quipTimerRef.current = setTimeout(() => setQuipVisible(false), QUIP_MS);
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
            ...aeonikOptions(),
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
        <main className="fixed inset-0 bg-[#141414] font-aeonik text-[#F4F4F4]">
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
                <section className="fixed top-[var(--hintY,62vh)] left-1/2 z-2 grid w-[min(720px,calc(100vw-40px))] -translate-x-1/2 justify-items-center text-center" aria-live="polite">
                    <p className={`text-[17px] text-[#bdbdbd] max-md:text-[4vw] ${riseIn}`}>Shame the page still doesn’t exist.</p>
                    <ul className={`mt-10 flex flex-wrap justify-center gap-4 max-md:mt-7 max-md:gap-2.5 ${riseIn} [animation-delay:.08s]`}>
                        {suggestions.map((p) => (
                            <li key={p.href}>
                                <Link href={p.href} className="inline-flex h-10 items-center border border-white/15 bg-white/[.04] px-5 text-[15px] text-[#F4F4F4] no-underline transition-[background-color,border-color] duration-400 hover:border-primary/60 hover:bg-primary/10 focus-visible:border-primary/60 focus-visible:bg-primary/10">
                                    {p.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className={`mt-6 flex flex-wrap justify-center gap-2.5 ${riseIn} [animation-delay:.16s]`}>
                        <ButtonV3 text="Back to home" href="/" />
                        <ButtonV3 text="Browse effects" href="/effects" variant="outline" className="bg-transparent!" />
                    </div>
                    <p className={`mt-5 text-white/60 ${riseIn} [animation-delay:.24s] text-[1vw] max-md:text-[4vw] max-[1025px]:text-[2vw]`}>
                        Or try{" "}
                        {MORE_LINKS.map((l, i) => (
                            <span key={l.href}>
                                <Link href={l.href} className="bg-[linear-gradient(currentColor,currentColor)] bg-size-[100%_1px] bg-position-[100%_100%] bg-no-repeat pb-0.5 text-[#e8e8e8] transition-colors duration-300 hover:text-primary focus-visible:text-primary motion-safe:hover:animate-[hx-underline-redraw_.8s_cubic-bezier(.65,0,.35,1)]">{l.label}</Link>
                                {i < MORE_LINKS.length - 2 ? ", " : i === MORE_LINKS.length - 2 ? " or " : ""}
                            </span>
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
                className={`pointer-events-none fixed bottom-[92px] left-1/2 z-3 -translate-x-1/2 border border-white/20 bg-transparent px-3.5 py-[9px] text-sm font-normal whitespace-nowrap text-white/80 transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] max-sm:bottom-20 ${quipVisible ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"}`}
            >
                {quip}
            </p>
        </main>
    );
}
