"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mountThereminRibbons } from "../lib/theremin-ribbons";
import { useInteraction } from "./InteractionProvider";

const UNLOCK_TITLE = "Effect unlocked · Liquid shatter";
const UNLOCK_BODY =
    "You just played one of Vault’s WebGL moments. Every interaction on this page ships as real code you own.";
const UNLOCK_VISIBLE_MS = 3500;
const UNLOCK_EXIT_MS = 320; // matches hx-scale-out / hx-fade-out below

// Shown in the middle of the screen when a full hold shatters the ribbons
// into particles: a small blurred card over the scene, not a bottom toast.
function UnlockNotice({ onClose }) {
    const [closing, setClosing] = useState(null); // null | "scale" | "fade"

    // Play the exit animation, then unmount
    const requestClose = useCallback((how = "scale") => {
        setClosing((c) => c ?? how);
        setTimeout(onClose, UNLOCK_EXIT_MS);
    }, [onClose]);

    useEffect(() => {
        const timer = setTimeout(requestClose, UNLOCK_VISIBLE_MS);
        const onKey = (e) => { if (e.key === "Escape") requestClose(); };
        // Scrolling away fades it out instead of leaving it over the page
        const onScroll = () => requestClose("fade");
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onScroll, { passive: true, once: true });
        return () => {
            clearTimeout(timer);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onScroll);
        };
    }, [requestClose]);

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-9000 flex items-center justify-center p-6">
            <div
                role="status"
                aria-live="polite"
                className={`pointer-events-auto relative w-[min(26rem,100%)] border border-white/10 bg-black/30 p-5 pr-12 text-left backdrop-blur-sm ${closing === "fade" ? "motion-safe:animate-[hx-fade-out_.32s_ease-out_both]" : closing ? "motion-safe:animate-[hx-scale-out_.32s_cubic-bezier(.7,0,.84,0)_both]" : "motion-safe:animate-[hx-scale-in_.8s_cubic-bezier(.16,1,.3,1)_both]"}`}
            >
                <p className="type-label text-primary">{UNLOCK_TITLE}</p>
                <p className="mt-2 type-small text-white/80">{UNLOCK_BODY}</p>
                <button
                    type="button"
                    onClick={() => requestClose()}
                    aria-label="Dismiss"
                    className="absolute top-3 right-3 flex size-7 items-center justify-center text-white/60 transition-colors hover:text-white"
                >
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>,
        document.body
    );
}

// Homepage hero ribbons (WebGL, Theremin model). Transparent, so the
// site-wide grid (SiteBackground) shows through. The ribbons rise in on
// `play` (loader finished) and the layer fades up with them, so nothing is
// seen before the loader clears.
export default function HeroRibbons({ play = false }) {
    const hostRef = useRef(null);
    const canvasRef = useRef(null);
    const ribbonsRef = useRef(null);
    const playRef = useRef(play);
    const { sound } = useInteraction();
    const [unlocked, setUnlocked] = useState(false);

    // The module reads this once at mount; keep the latest value reachable
    useEffect(() => {
        playRef.current = play;
    }, [play]);

    useEffect(() => {
        let ribbons;
        try {
            ribbons = mountThereminRibbons(hostRef.current, canvasRef.current, {
                pose: "hero",
                sound,
                onUnlock: () => setUnlocked(true),
            });
        } catch (err) {
            console.warn("[HeroRibbons] WebGL unavailable, ribbons disabled.", err);
            return undefined;
        }
        ribbonsRef.current = ribbons;
        if (playRef.current) ribbons.play();

        return () => {
            ribbons.destroy();
            ribbonsRef.current = null;
        };
    }, [sound]); // sound is stable (created once by the provider)

    useEffect(() => {
        if (play) ribbonsRef.current?.play();
    }, [play]);

    const closeNotice = useCallback(() => setUnlocked(false), []);

    return (
        <div
            ref={hostRef}
            className="absolute inset-0 transition-opacity duration-1200 ease-out"
            style={{ opacity: play ? 1 : 0 }}
        >
            <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />
            {unlocked && <UnlockNotice onClose={closeNotice} />}
        </div>
    );
}
