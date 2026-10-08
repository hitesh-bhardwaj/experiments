"use client";

import { memo, useEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

const DIGITS = [...Array(10).keys()];
const REEL_DIGITS = DIGITS.concat(DIGITS, DIGITS);
const REST_LAP = 10;
const ROLL_LAP = 20;

/** A single price digit on a vertical reel, so the number rolls on plan change. */
const PriceDigit = memo(function PriceDigit({ digit, visible = true, plan }) {
    const reelRef = useRef(null);
    const hasMounted = useRef(false);
    const currentDigitRef = useRef(Number(digit) || 0);

    useEffect(() => {
        if (!reelRef.current) return;

        const nextDigit = Number(digit) || 0;
        const restIndex = REST_LAP + nextDigit;
        const rollIndex = nextDigit <= currentDigitRef.current
            ? ROLL_LAP + nextDigit
            : REST_LAP + nextDigit;

        // First paint rests on the right digit instead of animating up to it.
        if (!hasMounted.current) {
            hasMounted.current = true;
            currentDigitRef.current = nextDigit;
            gsap.set(reelRef.current, { y: `${-restIndex}em` });
            return;
        }

        if (prefersReducedMotion()) {
            currentDigitRef.current = nextDigit;
            gsap.set(reelRef.current, { y: `${-restIndex}em` });
            return;
        }

        gsap.killTweensOf(reelRef.current);
        gsap.to(reelRef.current, {
            y: `${-rollIndex}em`,
            duration: 0.72,
            ease: "power3.inOut",
            onComplete: () => {
                currentDigitRef.current = nextDigit;
                gsap.set(reelRef.current, { y: `${-restIndex}em` });
            },
        });
    }, [digit, plan]);

    return (
        <span
            aria-hidden="true"
            className="relative inline-block h-[1em] w-[0.56em] overflow-hidden leading-none transition-[width,opacity] duration-300"
            style={{ width: visible ? undefined : 0, opacity: visible ? 1 : 0 }}
        >
            <span ref={reelRef} className="flex flex-col will-change-transform">
                {REEL_DIGITS.map((d, i) => (
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
