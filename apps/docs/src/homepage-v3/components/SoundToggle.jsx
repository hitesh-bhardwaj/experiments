"use client";

import { useEffect, useState } from "react";
import AudioCanvas from "@/components/Audio/AudioCanvas";
import { useInteraction } from "./InteractionProvider";

const SOUND_PREFERENCE_KEY = "hx-sound";

// localStorage throws in some private modes and when site data is blocked;
// no preference is the safe answer either way.
export function readSoundPreference() {
    try {
        const saved = window.localStorage.getItem(SOUND_PREFERENCE_KEY);
        return saved === null ? null : saved === "1";
    } catch {
        return null;
    }
}

function writeSoundPreference(isOn) {
    try {
        window.localStorage.setItem(SOUND_PREFERENCE_KEY, isOn ? "1" : "0");
    } catch {
        // Not persisted - the toggle still works for this page load.
    }
}

export default function SoundToggle({ className = "", size = 44 }) {
    const { sound, soundOn, setSound } = useInteraction();
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setMounted(true), []);
    if (!mounted || !sound) return null;

    const onToggle = () => {
        const next = !soundOn;
        setSound(next);
        writeSoundPreference(next);
    };

    return <AudioCanvas isOn={soundOn} onToggle={onToggle} size={size} className={className} />;
}
