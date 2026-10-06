"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import InteractionProvider, {
    useInteraction,
} from "@/homepage-v3/components/InteractionProvider";
import { readSoundPreference } from "@/homepage-v3/components/SoundToggle";
import { EasterEggProvider } from "@/homepage-v3/components/easter-egg/EasterEgg";

// Client-only: the fluid touches canvas/window on mount and has nothing to
// server-render.
const SiteBackground = dynamic(
    () => import("@/homepage-v3/components/SiteBackground"),
    { ssr: false },
);

// Effect showcases paint their own full-bleed scenes; the site's grid would
// change what they show.
const SHOWCASE_PREFIXES = ["/demo", "/template-demo"];

const matchesPrefix = (path, prefixes) =>
    Boolean(path) &&
    prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

// Browsers block audio until a user gesture, so a saved "on" preference is
// honoured at the first pointerdown/keydown of the page load - never before.
function ResumeSavedSound() {
    const { setSound } = useInteraction();

    useEffect(() => {
        if (readSoundPreference() !== true) return;

        const onFirstGesture = (e) => {
            // The toggle's own click decides - resuming here first would
            // make that click switch the sound straight back off.
            if (e.target?.closest?.("[data-sound-toggle]")) return;
            removeListeners();
            setSound(true);
        };
        const removeListeners = () => {
            window.removeEventListener("pointerdown", onFirstGesture, true);
            window.removeEventListener("keydown", onFirstGesture, true);
        };

        window.addEventListener("pointerdown", onFirstGesture, true);
        window.addEventListener("keydown", onFirstGesture, true);
        return removeListeners;
    }, [setSound]);

    return null;
}

// Mounted once in the root layout: one sound engine, the full-page dotted
// grid and fluid (the sound toggle itself lives in NavbarV3), and the hidden "Ship at 60" game.
// The layout never remounts on client navigation, so the music keeps playing.
export default function SiteInteractions({ children }) {
    const pathname = usePathname();
    const isShowcase = matchesPrefix(pathname, SHOWCASE_PREFIXES);

    return (
        <InteractionProvider uiSounds={!isShowcase}>
            {!isShowcase && <SiteBackground />}
            {!isShowcase && <ResumeSavedSound />}
            {isShowcase ? children : <EasterEggProvider>{children}</EasterEggProvider>}
        </InteractionProvider>
    );
}
