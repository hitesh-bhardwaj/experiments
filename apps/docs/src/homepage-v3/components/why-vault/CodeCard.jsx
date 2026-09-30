"use client";

import { useEffect, useRef } from "react";
import { createFluidField } from "../../lib/fluid-field";
import InstallationProcess from "../InstallationProcess";

// Fluid kept inside the card: coarser cells (it's small and mostly blurred),
// no scroll drag (the card scrolls with the page), a gentle auto-stir so the
// orange keeps moving while nobody touches it.
// Kept minimal: slow, faint stirs and a light pointer response
const CARD_FLUID = { cell: 18, iterations: 8, scrollDrift: false, dyeDecay: 0.985, pointerForce: 0.2, pointerInk: 0.006 };
const STIR_EVERY_MS = 1600;
const STIR_POWER = 0.25;

// 02 "Code you own": the install walkthrough's windows, translucent and
// blurred like Theremin's, over an orange fluid that lives only in this card.
// Pointer movement over the card stirs it too. `play` starts the typing.
export default function CodeCard({ play }) {
    const cardRef = useRef(null);
    const inkRef = useRef(null);
    const sizeRef = useRef(null);

    useEffect(() => {
        const fluid = createFluidField({ ink: inkRef.current, dots: sizeRef.current, ...CARD_FLUID }).start();
        const stir = setInterval(() => {
            const card = cardRef.current;
            if (!card || document.hidden) return;
            fluid.burst(Math.random() * card.clientWidth, Math.random() * card.clientHeight, STIR_POWER);
        }, STIR_EVERY_MS);
        return () => {
            clearInterval(stir);
            fluid.destroy();
        };
    }, []);

    return (
        <div
            ref={cardRef}
            className="relative isolate overflow-hidden bg-[#141414] p-3.5 text-white [&_[data-panel-body]]:[overflow-wrap:anywhere] [&_[data-panel-body]_*]:min-w-0"
        >
            {/* The engine sizes itself from this (invisible) canvas; only the ink shows */}
            <canvas ref={sizeRef} className="pointer-events-none absolute inset-0 -z-1 block size-full opacity-0" aria-hidden="true" />
            <canvas
                ref={inkRef}
                className="pointer-events-none absolute inset-0 -z-1 block size-full opacity-60 mix-blend-screen blur-[14px] saturate-[1.2]"
                aria-hidden="true"
            />
            <InstallationProcess id="" play={play} />
        </div>
    );
}
