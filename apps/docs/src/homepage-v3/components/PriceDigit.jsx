"use client";

import { memo, useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

const DIGITS = [...Array(10).keys()];

/** A single price digit on a vertical reel, so the number rolls on plan change. */
const PriceDigit = memo(function PriceDigit({ digit, visible = true, plan }) {
    const reelRef = useRef(null);
    const hasMounted = useRef(false);
    const lap = useRef(0);

    useEffect(() => {
        if (!reelRef.current) return;

        // The reel holds two laps of 0-9, so a slot whose digit is the same in
        // both plans (the middle 9s of 1999 -> 17990) still has somewhere to
        // travel: it rolls a full turn into the other lap.
        const rest = -Number(digit) * 5;

        // First paint rests on the right digit instead of animating up to it.
        if (!hasMounted.current) {
            hasMounted.current = true;
            gsap.set(reelRef.current, { yPercent: rest });
            return;
        }

        lap.current = lap.current === 0 ? 1 : 0;

        gsap.to(reelRef.current, {
            yPercent: rest - lap.current * 50,
            duration: prefersReducedMotion() ? 0 : 0.55,
            ease: "power3.out",
        });
    }, [digit, plan]);

    return (
        <span
            aria-hidden="true"
            className="relative inline-block h-[1em] w-[0.56em] overflow-hidden leading-none transition-[width,opacity] duration-300"
            style={{ width: visible ? undefined : 0, opacity: visible ? 1 : 0 }}
        >
            <span ref={reelRef} className="flex  flex-col will-change-transform">
                {DIGITS.concat(DIGITS).map((d, i) => (
                    <span key={i} className="flex h-[1em] items-center justify-center">
                        {d}
                    </span>
                ))}
            </span>
        </span>
    );
});

export default PriceDigit;

/**
 * A price that rolls digit by digit between values of different shapes
 * (7.42 <-> 9, 14.92 <-> 19): the slots line up on the decimal point and are
 * sized for the longest value in `values`; slots the current value doesn't
 * use collapse to zero width. `plan` changes re-roll even an unchanged digit.
 */
export function RollingPrice({ value, values, plan }) {
    const parts = (v) => { const [int, frac = ""] = String(v).split("."); return { int, frac }; };
    const all = values.map(parts);
    const intLen = Math.max(...all.map((p) => p.int.length));
    const fracLen = Math.max(...all.map((p) => p.frac.length));
    const cur = parts(value);
    const intDigits = cur.int.padStart(intLen, "0");
    const hasFrac = cur.frac.length > 0;

    return (
        <>
            <span className="sr-only">{value}</span>
            {[...intDigits].map((d, i) => (
                <PriceDigit key={`i${i}`} digit={d} visible={i >= intLen - cur.int.length} plan={plan} />
            ))}
            {fracLen > 0 && (
                <span
                    aria-hidden="true"
                    className="inline-block overflow-hidden transition-[width,opacity] duration-300"
                    style={{ width: hasFrac ? "0.28em" : 0, opacity: hasFrac ? 1 : 0 }}
                >
                    .
                </span>
            )}
            {Array.from({ length: fracLen }, (_, i) => (
                <PriceDigit key={`f${i}`} digit={cur.frac[i] ?? "0"} visible={i < cur.frac.length} plan={plan} />
            ))}
        </>
    );
}
