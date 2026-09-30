"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "../components/ButtonV3";
import { useInteraction } from "../components/InteractionProvider";
import NotAnotherUIKit from "./NotAnotherUIKit";


const HOLD_DEAD_ZONE_MS = 200;
const HOLD_CHARGE_MS = 1900;
const TAP_MAX_MS = 220;
const FULL_CHARGE = 0.985;
export default function SignalSection() {
    const sectionRef = useRef(null);
    const canvasRef = useRef(null);
    const anchorRef = useRef(null);
    const waveAreaRef = useRef(null);
    const { sound } = useInteraction();
    const [webgl, setWebgl] = useState(false);

    useFadeUp(sectionRef);

    useLayoutEffect(() => {
        // WebGL capability is only knowable on the client, after hydration
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWebgl(!(isLighthouseOrHeadless() || isSoftwareRenderer()));
    }, []);

    useEffect(() => {
        if (!webgl) return undefined;
        const section = sectionRef.current;
        let wave = null;
        let disposed = false;
        const offs = [];

        import("../lib/signal-wave").then(({ createSignalWave }) => {
            if (disposed) return;
            try {
                wave = createSignalWave(canvasRef.current, {
                    anchor: anchorRef.current,
                    // Only the wave's own block plays the string, not the cards below it
                    hitArea: waveAreaRef.current,
                    onLevel: sound?.theremin ? (level, y, b) => sound.theremin(level, y, b) : null,
                    onPluck: sound?.pluckString ? (y, a) => sound.pluckString(y, a) : null,
                }).start();
            } catch (err) {
                console.warn("[SignalSection] WebGL unavailable; the wave is disabled.", err);
                return;
            }

            // Press and hold
            let pressedAt = 0;
            let raf = 0;
            let charge = 0;
            const tick = () => {
                raf = requestAnimationFrame(tick);
                const progress = (performance.now() - pressedAt - HOLD_DEAD_ZONE_MS) / HOLD_CHARGE_MS;
                charge = progress > 0 ? Math.min(1, progress) ** 2 : 0;
                wave.setCharge(charge);
            };
            const onDown = (e) => {
                if (e.button !== 0 || e.target.closest("a,button,input")) return;
                pressedAt = performance.now();
                charge = 0;
                sound?.holdStart?.();
                raf = requestAnimationFrame(tick);
            };
            const onUp = () => {
                if (!pressedAt) return;
                cancelAnimationFrame(raf);
                const held = performance.now() - pressedAt;
                pressedAt = 0;
                const full = charge > FULL_CHARGE;
                sound?.holdEnd?.(full);
                if (held < TAP_MAX_MS) wave.tap();
                else {
                    const kind = wave.release(full);
                    if (kind) sound?.release?.(kind);
                }
                wave.setCharge(0);
            };
            section.addEventListener("pointerdown", onDown);
            window.addEventListener("pointerup", onUp);
            offs.push(() => {
                section.removeEventListener("pointerdown", onDown);
                window.removeEventListener("pointerup", onUp);
                cancelAnimationFrame(raf);
            });

            // Soundtrack chords pluck the string
            if (sound?.onPulse) offs.push(sound.onPulse((v) => wave.pulse(v)));
        });

        return () => {
            disposed = true;
            offs.forEach((off) => off());
            wave?.destroy();
        };
    }, [sound, webgl]); // sound is stable (created once by the provider)

    return (
        <section ref={sectionRef} id="signal" className="relative isolate text-[#F4F4F4]">
            {/* One viewport-sized canvas, pinned for the whole section and on
                top of it, so the wave is never clipped by a section edge or
                covered by the cards. Pointer events pass through to the page. */}
            <div className="pointer-events-none sticky top-0 z-30  -mb-[100vh] h-screen" aria-hidden="true">
                <canvas ref={canvasRef} className="block size-full" />
            </div>
            <div ref={waveAreaRef} className="relative z-1 mx-auto h-[80vh] max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] pt-[clamp(7rem,18vh,12rem)] pb-[clamp(6rem,14vh,10rem)]">
                <div className="grid min-h-[62vh] grid-cols-2 items-start gap-12 max-[1000px]:min-h-[50vh] max-[1000px]:grid-cols-1">
                    <div>
                        <h2 className="fadeup  max-w-[30vw] font-aeonik text-[3.85vw] font-normal leading-[1.02] tracking-[-.035em]">
                            Small Motion.<br/> <span className="gradient-text-animate">Big Signal.</span>
                        </h2>
                        <div className="fadeup mt-[4vw] flex flex-wrap gap-4" data-fadeup-delay="0.16">
                            <ButtonV3 href="/effects" text="Browse effects" />
                            <ButtonV3 variant="outline" href="/docs" text="Read the docs" />
                        </div>
                    </div>
                    {/* The wave centres on this empty column */}
                    <div ref={anchorRef} className="min-h-[40vh] self-stretch" aria-hidden="true" />
                </div>
            </div>
            {/* "Not another UI kit": the principle cards, part of this section */}
            <NotAnotherUIKit />
        </section>
    );
}
