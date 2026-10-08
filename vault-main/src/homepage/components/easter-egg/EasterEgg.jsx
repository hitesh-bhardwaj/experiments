"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useInteraction } from "../InteractionProvider";
import SpotTheJank from "./SpotTheJank";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const TOAST_MS = 3600;

const EasterEggContext = createContext({ openGame: () => {}, toast: () => {} });
export const useEasterEgg = () => useContext(EasterEggContext);

// Small status message at the bottom centre (achievements, "score copied")
function Toast({ message }) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-[2147482001] max-w-[calc(100vw-2rem)] -translate-x-1/2 border border-grey bg-[#1f1f1f] px-[18px] py-3 text-sm text-[#F4F4F4] shadow-[0_20px_40px_-12px_#000] transition-transform duration-1000 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none ${message ? "translate-y-0" : "translate-y-[240%]"}`}
        >
            {message}
        </div>
    );
}

// The hidden "Spot the Jank" game: opened by the orange dot after "Missing"
// in the hero, or by the Konami code (↑ ↑ ↓ ↓ ← → ← → b a) anywhere. Smooth
// scroll pauses while it's open. Mounted once by SiteInteractions.
export function EasterEggProvider({ children, realHref = "/effects" }) {
    const { sound } = useInteraction();
    const lenis = useLenis();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState("");
    const lastFocusRef = useRef(null);
    const toastTimerRef = useRef(0);

    const toast = useCallback((text) => {
        setMessage(text);
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setMessage(""), TOAST_MS);
    }, []);

    const openGame = useCallback(() => {
        lastFocusRef.current = document.activeElement;
        sound?.tap?.();
        setOpen(true);
    }, [sound]);

    const closeGame = useCallback(() => {
        setOpen(false);
        lastFocusRef.current?.focus?.();
    }, []);

    // Stop smooth scroll while the game is open, and start it again only when the
    // game closes - not on every run of this effect, which would restart Lenis
    // that something else (e.g. the page-change loader) has stopped.
    const stoppedLenisRef = useRef(false);
    useEffect(() => {
        if (open) {
            lenis?.stop();
            stoppedLenisRef.current = true;
        } else if (stoppedLenisRef.current) {
            lenis?.start();
            stoppedLenisRef.current = false;
        }
    }, [open, lenis]);

    // Konami code
    useEffect(() => {
        let pos = 0;
        const onKey = (e) => {
            if (open) return;
            if (e.key === KONAMI[pos]) pos++;
            else pos = e.key === KONAMI[0] ? 1 : 0;
            if (pos === KONAMI.length) {
                pos = 0;
                openGame();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, openGame]);

    useEffect(() => () => clearTimeout(toastTimerRef.current), []);

    const value = useMemo(() => ({ openGame, toast }), [openGame, toast]);

    return (
        <EasterEggContext.Provider value={value}>
            {children}
            {open && <SpotTheJank onClose={closeGame} sound={sound} toast={toast} realHref={realHref} />}
            <Toast message={message} />
        </EasterEggContext.Provider>
    );
}

// The orange full stop. Put it straight after the word, with no space:
// …Missing</span><EasterEggDot /> It stays solid orange even inside
// gradient-clipped headline text, and glints every few seconds.
export function EasterEggDot({ className = "" }) {
    const { openGame } = useEasterEgg();
    return (
        <button
            type="button"
            aria-label="Something’s hiding here. Play Spot the Jank"
            onClick={(e) => { e.preventDefault(); openGame(); }}
            className={`relative inline cursor-pointer border-0 bg-none px-[.05em] font-[inherit] leading-[inherit] tracking-[inherit] text-primary [-webkit-text-fill-color:var(--color-primary,#FF6B00)] motion-safe:animate-[hx-egg-glint_6s_ease-in-out_infinite] hover:text-[#FFB27A] hover:[-webkit-text-fill-color:#FFB27A] hover:[text-shadow:0_0_18px_rgba(255,107,0,.9),0_0_40px_rgba(255,107,0,.5)] focus-visible:text-[#FFB27A] focus-visible:outline-none focus-visible:[-webkit-text-fill-color:#FFB27A] ${className}`}
        >
            .
        </button>
    );
}

// Footer whisper that hints the egg exists
// export function EggHint({ className = "" }) {
//     return (
//         <span className={`text-[#3f3f3f] transition-colors duration-800 hover:text-[#8a8a8a] ${className}`} aria-hidden="true">
//             · psst, the first sentence is hiding something
//         </span>
//     );
// }
