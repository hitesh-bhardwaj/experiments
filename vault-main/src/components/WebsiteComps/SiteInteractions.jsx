"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import InteractionProvider, {
    useInteraction,
} from "@/homepage/components/InteractionProvider";
import { readSoundPreference } from "@/homepage/components/SoundToggle";
import { EasterEggProvider } from "@/homepage/components/easter-egg/EasterEgg";
import SiteCursor from "@/components/WebsiteComps/SiteCursor";


const SiteBackground = dynamic(
    () => import("@/homepage/components/SiteBackground"),
    { ssr: false },
);

const SHOWCASE_PREFIXES = ["/demo", "/template-demo"];

const matchesPrefix = (path, prefixes) =>
    Boolean(path) &&
    prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));


function ResumeSavedSound() {
    const { setSound } = useInteraction();

    useEffect(() => {
        if (readSoundPreference() !== true) return;

        const onFirstGesture = (e) => {
           
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


export default function SiteInteractions({ children }) {
    const pathname = usePathname();
    const isShowcase = matchesPrefix(pathname, SHOWCASE_PREFIXES);

    return (
        <InteractionProvider uiSounds={!isShowcase}>
            {!isShowcase && <SiteBackground />}
            {!isShowcase && <ResumeSavedSound />}
            {!isShowcase && <SiteCursor />}
            {isShowcase ? children : <EasterEggProvider>{children}</EasterEggProvider>}
        </InteractionProvider>
    );
}
