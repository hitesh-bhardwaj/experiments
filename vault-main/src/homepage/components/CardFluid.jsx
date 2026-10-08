"use client";

import { useEffect, useRef } from "react";
import { createFluidField } from "../lib/fluid-field";

const CARD_FLUID = { cell: 18, iterations: 8, scrollDrift: false, dyeDecay: 0.985, pointerForce: 0.2, pointerInk: 0.006 };

// Card-sized dotted grid + mouse fluid. Place it as the first child of a dark
// card that has `relative isolate overflow-hidden`: it paints above the card's
// background and below its content.
export default function CardFluid() {
    const dotsRef = useRef(null);
    const inkRef = useRef(null);

    useEffect(() => {
        const fluid = createFluidField({ ink: inkRef.current, dots: dotsRef.current, ...CARD_FLUID }).start();
        return () => fluid.destroy();
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 -z-1" aria-hidden="true">
            <canvas ref={dotsRef} className="absolute inset-0 block size-full" />
            <canvas ref={inkRef} className="absolute inset-0 block size-full opacity-60 mix-blend-screen blur-[14px] saturate-[1.2]" />
        </div>
    );
}
