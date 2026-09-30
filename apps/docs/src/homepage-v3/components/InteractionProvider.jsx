'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createSound, wireSoundUI } from '../lib/sound';

const Ctx = createContext({ sound: null, soundOn: false, toggleSound: () => {}, setSound: () => {} });
export const useInteraction = () => useContext(Ctx);

// Site-wide sound: one engine for the whole app, mounted once by
// SiteInteractions around every page. `sound` is null on the server and
// silent until setSound(true) runs from a user gesture (browsers block audio
// before one).
//
//   const { sound, soundOn, setSound, toggleSound } = useInteraction();
export default function InteractionProvider({ children, uiSounds = true }) {
    // Created during the first client render (no audio starts until set(true)),
    // so children already have it in their first effect.
    const [sound] = useState(() => (typeof window !== 'undefined' ? createSound() : null));
    const [soundOn, setSoundOn] = useState(false);

    useEffect(() => {
        return () => { sound?.destroy(); setSoundOn(false); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Soft ticks on hover/click of links and buttons, site-wide
    useEffect(() => {
        if (!sound || !uiSounds) return undefined;
        return wireSoundUI(sound);
    }, [sound, uiSounds]);

    const setSound = useCallback((v) => { if (sound) setSoundOn(sound.set(v)); }, [sound]);
    const toggleSound = useCallback(() => { if (sound) setSoundOn(sound.set(!sound.on)); }, [sound]);

    return <Ctx.Provider value={{ sound, soundOn, toggleSound, setSound }}>{children}</Ctx.Provider>;
}
