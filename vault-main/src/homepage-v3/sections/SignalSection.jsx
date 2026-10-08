"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import LineReveal from "@/components/Animations/LineReveal";
import ButtonV3 from "../components/ButtonV3";
import { useInteraction } from "../components/InteractionProvider";
import NotAnotherUIKit from "./NotAnotherUIKit";


const HOLD_DEAD_ZONE_MS = 200;
const HOLD_CHARGE_MS = 1900;
const TAP_MAX_MS = 220;
const FULL_CHARGE = 0.985;
// Computed once per page load: the software-renderer probe creates a GL context
let webglSupport = null;
function canUseWebgl() {
    if (webglSupport === null) {
        webglSupport = !(isLighthouseOrHeadless() || isSoftwareRenderer()) && window.matchMedia("(min-width: 768px)").matches;
    }
    return webglSupport;
}
const noopSubscribe = () => () => {};

export default function SignalSection() {
    const sectionRef = useRef(null);
    const canvasRef = useRef(null);
    const anchorRef = useRef(null);
    const { sound } = useInteraction();
    const webgl = useSyncExternalStore(noopSubscribe, canUseWebgl, () => false);

    useFadeUp(sectionRef);

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
                    zone: section,
                    hitArea: section,
                    onLevel: sound?.theremin ? (level, y, b) => sound.theremin(level, y, b) : null,
                    onPluck: sound?.pluckString ? (y, a) => sound.pluckString(y, a) : null,
                }).start();
            } catch (err) {
                console.warn("[SignalSection] WebGL unavailable; the wave is disabled.", err);
                return;
            }

            // Press and hold
            let pressedAt = 0;
            // As in the prototype, the hold sound only starts once the dead zone has passed,
            // so a quick click is just a pluck
            let sounding = false;
            let raf = 0;
            const charge = { v: 0 };
            let decay = null;
            const tick = () => {
                raf = requestAnimationFrame(tick);
                const progress = (performance.now() - pressedAt - HOLD_DEAD_ZONE_MS) / HOLD_CHARGE_MS;
                charge.v = progress > 0 ? Math.min(1, progress) ** 2 : 0;
                if (progress > 0 && !sounding) {
                    sounding = true;
                    sound?.holdStart?.();
                }
                wave.setCharge(charge.v);
            };
            const onDown = (e) => {
                // Same exclusions as the prototype's ring cursor
                if (e.button !== 0 || e.target.closest("a,button,input,h1,h2,h3,p")) return;
                pressedAt = performance.now();
                decay?.kill();
                charge.v = 0;
                sounding = false;
                raf = requestAnimationFrame(tick);
            };
            const onUp = () => {
                if (!pressedAt) return;
                cancelAnimationFrame(raf);
                const held = performance.now() - pressedAt;
                pressedAt = 0;
                const full = charge.v > FULL_CHARGE;
                if (sounding) sound?.holdEnd?.(full);
                sounding = false;
                if (held < TAP_MAX_MS) wave.tap();
                else {
                    const kind = wave.release(full);
                    if (kind) sound?.release?.(kind);
                }
                // The charge eases back out, still pulling the line as it fades
                decay = gsap.to(charge, { v: 0, duration: 1.4, ease: "expo.out", onUpdate: () => wave.setCharge(charge.v) });
            };
            section.addEventListener("pointerdown", onDown);
            window.addEventListener("pointerup", onUp);
            offs.push(() => {
                section.removeEventListener("pointerdown", onDown);
                window.removeEventListener("pointerup", onUp);
                cancelAnimationFrame(raf);
                decay?.kill();
            });
        });

        return () => {
            disposed = true;
            offs.forEach((off) => off());
            wave?.destroy();
        };
    }, [sound, webgl]); // sound is stable (created once by the provider)

    return (
        <section ref={sectionRef} id="signal" className="relative z-20 text-[#F4F4F4]">
           
            <div className="pointer-events-none absolute inset-x-0 -top-[100vh] -bottom-[100vh] z-50 max-md:hidden" aria-hidden="true">
                <div className="sticky top-0 h-screen">
                    <canvas ref={canvasRef} className="block size-full" />
                </div>
            </div>
            <div className="relative z-[60]! mx-auto h-[80vh]  max-w-[1536px] px-[calc(var(--cvw)*4.5)] py-[7%] max-md:h-fit max-md:px-[calc(var(--cvw)*5)] max-sm:px-[calc(var(--cvw)*7)]">
                <div className="grid min-h-[62vh] grid-cols-2 items-start gap-12 max-md:min-h-fit max-md:grid-cols-1">
                    <div>
                        <LineReveal as="h2" className="type-h1 max-w-[calc(var(--cvw)*30)] max-lg:max-w-full">
                            Small Motion. <span className="gradient-text-animate gradient-text-single">Big Signal.</span>
                        </LineReveal>
                        <div className="fadeup mt-[calc(var(--cvw)*4)] flex flex-wrap gap-4 max-md:mt-8 max-sm:flex-col max-sm:items-start" data-fadeup-delay="0.16">
                            <ButtonV3 href="/effects" text="Browse Effects" />
                            <ButtonV3 variant="outline" href="/docs" text="Read the Docs" />
                        </div>
                    </div>
                    {/* The line centres on this empty column, beside the heading */}
                    <div ref={anchorRef} className="min-h-[40vh] self-stretch max-md:hidden" aria-hidden="true" />
                </div>
            </div>
            {/* "Not another UI kit": the principle cards, part of this section */}
            <NotAnotherUIKit />
        </section>
    );
}
