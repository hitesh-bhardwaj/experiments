"use client";

import { useEffect, useRef } from "react";
import { createFluidField } from "../lib/fluid-field";

// Cheaper solver on narrow or low-core devices; desktop keeps the defaults
// (16px cells, 14 pressure iterations).
const LOW_QUALITY_FLUID = { cell: 22, iterations: 8 };
const LOW_CORE_COUNT = 4;

function isLowQualityDevice() {
    return (
        window.matchMedia("(max-width: 760px)").matches ||
        (navigator.hardwareConcurrency || 8) <= LOW_CORE_COUNT
    );
}

// Dotted grid + fluid ink behind every page. Fixed to the viewport at
// z-index -1: that paints above the <html> background and below all in-flow
// content, so no page needs a z-index to sit on top. Dark sections are
// transparent and show it; light or opaque sections simply cover it.
export default function SiteBackground() {
    const dotsRef = useRef(null);
    const inkRef = useRef(null);

    useEffect(() => {
        const fluid = createFluidField({
            ink: inkRef.current,
            dots: dotsRef.current,
            ...(isLowQualityDevice() ? LOW_QUALITY_FLUID : null),
        }).start();
        return () => fluid.destroy();
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 -z-1" aria-hidden="true">
            <canvas ref={dotsRef} className="absolute inset-0 block size-full" />
            {/* The fluid is simulated at ~16px cells; the blur makes it silky */}
            <canvas
                ref={inkRef}
                className="absolute inset-0 block size-full opacity-95 mix-blend-screen blur-[14px] saturate-[1.2]"
            />
        </div>
    );
}
