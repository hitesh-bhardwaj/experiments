"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const ButterflyTrailCursor = dynamic(() => import("@/components/butterfly-trail-cursor"), {
    ssr: false,
});

// Hint fades out while the pointer moves over the card, back after it rests
const IDLE_MS = 1200;

export default function CursorDemo() {
    const rootRef = useRef(null);
    const [moving, setMoving] = useState(false);

    useEffect(() => {
        const root = rootRef.current;
        let idle = 0;
        const onMove = () => {
            setMoving(true);
            clearTimeout(idle);
            idle = setTimeout(() => setMoving(false), IDLE_MS);
        };
        const onLeave = () => { clearTimeout(idle); setMoving(false); };
        root.addEventListener("pointermove", onMove, { passive: true });
        root.addEventListener("pointerleave", onLeave);
        return () => {
            clearTimeout(idle);
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerleave", onLeave);
        };
    }, []);

    return (
        <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-[#1a1a1a]">
            <ButterflyTrailCursor
                embedded
                backgroundColor="#1a1a1a"
                wingColor="#ff5f00"
            />
            <p
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-1/2 z-1 -translate-y-1/2 text-center font-neue-haas text-[11px] tracking-[.2em] text-white/40 uppercase transition-[opacity,filter] duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${moving ? "opacity-0 blur-[2px]" : "opacity-100 blur-0"}`}
            >
                HOVER TO REVEAL.
            </p>
        </div>
    );
}
