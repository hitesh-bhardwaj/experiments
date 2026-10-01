"use client";

import { useState } from "react";
import RectangularTextReveal from "@/components/rectangular-text-reveal";

const TEXT = "Signal appears when the noise decides to leave.";

function StarField() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {Array.from({ length: 44 }).map((_, index) => {
                const left = (index * 37) % 100;
                const top = (index * 53) % 100;
                const opacity = 0.18 + ((index * 11) % 30) / 100;
                return (
                    <span
                        key={index}
                        className="absolute size-[2px] bg-white"
                        style={{ left: `${left}%`, top: `${top}%`, opacity }}
                    />
                );
            })}
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
            <StarField />
            <button type="button" onClick={() => setRun((n) => n + 1)} className="relative z-1 cursor-pointer text-left" title="Click to replay">
                <RectangularTextReveal
                    key={run}
                    once
                    direction="left"
                    baseColor="#FF6B00"
                    overlayColor="#F4F4F4"
                    className="font-avenir text-[3.2vw] font-normal leading-[1.02] tracking-[-.03em] text-[#F4F4F4] uppercase max-md:text-[8vw]"
                >
                    {TEXT}
                </RectangularTextReveal>
            </button>
        </div>
    );
}
