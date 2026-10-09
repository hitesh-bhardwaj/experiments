"use client";

import { useEffect, useRef, useState } from "react";
import { createFluidField } from "../../lib/fluid-field";
import RectangularTextReveal from "@/components/rectangular-text-reveal";

const TEXT = "Signal appears when the noise decides to leave.";

// Same dotted grid + fluid ink as the site background, kept inside the card:
// the pointer stirs the ink and pushes the dots.
const CARD_FLUID = { cell: 18, iterations: 8, scrollDrift: false, dyeDecay: 0.985, pointerForce: 0.25, pointerInk: 0.008 };

function FluidGrid() {
    const dotsRef = useRef(null);
    const inkRef = useRef(null);

    useEffect(() => {
        const fluid = createFluidField({ ink: inkRef.current, dots: dotsRef.current, ...CARD_FLUID }).start();
        return () => fluid.destroy();
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <canvas ref={dotsRef} className="absolute inset-0 block size-full" />
            <canvas ref={inkRef} className="absolute inset-0 block size-full opacity-60 mix-blend-screen blur-[14px] saturate-[1.2]" />
        </div>
    );
}

// The Text tab's live effect: Vault's Rectangular Text Reveal. An orange
// block sweeps each line, a white one follows, and the white text is left
// behind. It plays on mount (MomentsCard remounts it on every click of the
// "Text" tab); clicking the text remounts it to play again.
export default function TextDemo() {
    const [run, setRun] = useState(0);

    return (
        <div className="relative flex h-full items-center overflow-hidden bg-[#101010] px-[8%]">
            <FluidGrid />
            <button type="button" onClick={() => setRun((n) => n + 1)} className="relative z-1 cursor-pointer text-left" title="Click to replay">
                <RectangularTextReveal
                    key={run}
                    once
                    direction="left"
                    baseColor="#FF6B00"
                    overlayColor="#F4F4F4"
                    className="font-avenir text-[calc(var(--cvw)*3.2)] font-normal leading-[1.02] tracking-[-.03em] text-white uppercase max-md:text-[calc(var(--cvw)*8)]"
                >
                    {TEXT}
                </RectangularTextReveal>
            </button>
        </div>
    );
}
