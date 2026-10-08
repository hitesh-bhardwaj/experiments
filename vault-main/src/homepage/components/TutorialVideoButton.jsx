"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useLenis } from "lenis/react";
import { TUTORIAL_VIDEO_POSTER, TUTORIAL_VIDEO_SRC } from "./tutorial-video";

// One open/closed state for the walkthrough modal. Both header bars (desktop
// and mobile are mounted together) and in-page links like ExplainVault's
// "See How it Works" open it, while a single TutorialVideoHost renders it.
let isOpen = false;
let returnFocusTo = null;
const listeners = new Set();
const EXIT_MS = 320; // matches the hx-scale-out / hx-fade-out durations below
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

export function openTutorialVideo(e) {
    e?.preventDefault?.();
    returnFocusTo = document.activeElement;
    isOpen = true;
    emit();
}

function closeTutorialVideo() {
    isOpen = false;
    emit();
    returnFocusTo?.focus?.();
    returnFocusTo = null;
}

// Header play button
export default function TutorialVideoButton({ className = "", iconClassName = "size-4" }) {
    return (
        <button
            type="button"
            onClick={openTutorialVideo}
            aria-label="Watch the Vault walkthrough"
            aria-haspopup="dialog"
            title="Watch the walkthrough"
            className={`flex items-center justify-center text-primary transition-colors duration-300 ${className}`}
        >
            <svg viewBox="0 0 24 24" className={iconClassName} fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13a.75.75 0 0 0 1.14.64l10.4-6.5a.75.75 0 0 0 0-1.28L9.14 4.86A.75.75 0 0 0 8 5.5z" />
            </svg>
        </button>
    );
}

// Rendered once (Navbar). The video only mounts while the modal is open,
// so it costs nothing until asked for, and closing it stops playback.
export function TutorialVideoHost() {
    const open = useSyncExternalStore(subscribe, () => isOpen, () => false);
    return open ? <TutorialVideoModal /> : null;
}

function TutorialVideoModal() {
    const closeRef = useRef(null);
    const lenis = useLenis();
    const [closing, setClosing] = useState(false);

    // Play the exit animation, then unmount
    const requestClose = useCallback(() => {
        setClosing(true);
        setTimeout(closeTutorialVideo, EXIT_MS);
    }, []);

    // Hold the page still behind the modal, and close on Escape
    useEffect(() => {
        lenis?.stop();
        closeRef.current?.focus();
        const onKey = (e) => { if (e.key === "Escape") requestClose(); };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            lenis?.start();
        };
    }, [lenis, requestClose]);

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Vault walkthrough video"
            className={`fixed inset-0 z-9500 flex items-center justify-center bg-black/70 p-[4vw] backdrop-blur-sm max-md:p-4 ${closing ? "motion-safe:animate-[hx-fade-out_.32s_ease-in_both]" : "motion-safe:animate-[hx-fade-in_.5s_ease-out_both]"}`}
            onClick={requestClose}
            data-lenis-prevent
        >
            <div
                className={`relative w-full max-w-[80vw] max-lg:max-w-full ${closing ? "motion-safe:animate-[hx-scale-out_.32s_cubic-bezier(.7,0,.84,0)_both]" : "motion-safe:animate-[hx-scale-in_.8s_cubic-bezier(.16,1,.3,1)_both]"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    ref={closeRef}
                    type="button"
                    onClick={requestClose}
                    aria-label="Close video"
                    className="absolute -top-12 right-0 flex size-10 items-center justify-center bg-grey text-white transition-colors hover:text-primary"
                >
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                </button>
                <video
                    src={TUTORIAL_VIDEO_SRC}
                    poster={TUTORIAL_VIDEO_POSTER}
                    className="aspect-video w-full border border-grey bg-black object-cover"
                    controls
                    autoPlay
                    playsInline
                />
            </div>
        </div>,
        document.body
    );
}
