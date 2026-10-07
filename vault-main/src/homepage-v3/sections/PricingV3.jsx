"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import {
    clearScrollToPricingCardsIntent,
    hasScrollToPricingCardsIntent,
} from "@/lib/pricingScrollIntent";
import ButtonV3 from "../components/ButtonV3";
import PriceDigit from "../components/PriceDigit";
import { ScrambleText } from "../components/HoverLinkV3";
import LineReveal from "@/components/Animations/LineReveal";
import SplitLine from "@/components/WebsiteComps/SplitLine";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const PRICING = {
    USD: { symbol: "$", monthly: 20, yearly: 179 },
    INR: { symbol: "₹", monthly: 999, yearly: 8999 },
};

const ProCta = dynamic(() => import("./PricingV3Cta"), { ssr: false });

const FREE_FEATURES = [
    "50+ production-ready effects",
    "Copy-paste + CLI install",
    "Commercial-friendly usage",
    "Code you own",
];

const PRO_FEATURES = [
    "All 150+ effects",
    "New effects added regularly",
    "Priority access to upcoming packs",
    "Hyperiux CLI install + auth",
    "Dependency, performance & reduced-motion notes per effect",
    "Code you own, commercial-friendly",
];

// The Pro card's feature list - also shown by the effect page's upgrade modal
// (effects/[slug]/UpgradeToProModal). Same list on both billing periods here.
export function getProFeatures() {
    return PRO_FEATURES;
}

export function PriceDigits({ monthlyAmount, yearlyAmount, isYearly }) {
    const monthlyDigits = String(monthlyAmount).split("");
    const yearlyDigits = String(yearlyAmount).split("");
    const leadCount = yearlyDigits.length - monthlyDigits.length;

    return (
        <>
            {yearlyDigits.slice(0, leadCount).map((d, i) => (
                <PriceDigit
                    key={`lead-${i}`}
                    digit={d}
                    visible={isYearly}
                    plan={isYearly ? "yearly" : "monthly"}
                />
            ))}
            {monthlyDigits.map((d, i) => (
                <PriceDigit
                    key={`trail-${i}`}
                    digit={isYearly ? yearlyDigits[leadCount + i] : d}
                    plan={isYearly ? "yearly" : "monthly"}
                />
            ))}
        </>
    );
}

function CheckSquare({ className = "", onDark = false }) {
    return (
        <svg
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            className={`shrink-0 ${className}`}
        >
            <rect width="18" height="18" fill="currentColor" />
            <path
                d="M4.5 9.2L7.6 12.3L13.5 5.9"
                stroke={onDark ? "#0e0e0e" : "#ffffff"}
                strokeWidth="1.6"
                strokeLinecap="square"
                strokeLinejoin="miter"
            />
        </svg>
    );
}

export function FeatureList({ features, className = "", onDark = false }) {
    return (
        <ul className={`flex flex-col gap-[1.2vw] max-lg:gap-[2.5vw] max-md:gap-[3vw] max-sm:gap-[4.5vw] ${className}`}>
            {features.map((feature) => (
                <li key={feature} className="flex items-start gap-[1vw] max-lg:gap-[2vw] max-md:gap-[2.5vw] max-sm:gap-[3.5vw]">
                    <CheckSquare
                        onDark={onDark}
                        className="mt-[0.25vw] size-[1.1vw] max-lg:mt-[0.6vw] max-lg:size-[2.2vw] max-md:mt-[1.4vw] max-md:size-[2.4vw] max-sm:size-[4vw]"
                    />
                    <span className="text22 leading-[1.35] max-md:text-[2.2vw] max-sm:text-[4vw]">
                        {feature}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Four-square mark from the design. Hidden until its card is hovered, then the
 * squares stutter in with a white/dark flicker - `flashClassName` picks the
 * flash tone that reads against the card it sits on.
 */
function PixelSquares({ flashClassName }) {
    return (
        <span
            aria-hidden="true"
            className="absolute top-[1.5vw] right-[1.5vw] grid grid-cols-2 gap-[0.15vw] max-lg:top-[3vw] max-lg:right-[3vw] max-lg:gap-[0.3vw] max-md:top-[4vw] max-md:right-[4vw] max-md:gap-[0.4vw] max-sm:gap-[0.6vw]"
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <span
                    key={i}
                    style={{ animationDelay: `${i * 70}ms` }}
                    className="pixel-glitch-square relative size-[0.5vw] bg-primary max-lg:size-[1vw] max-md:size-[1.2vw] max-sm:size-[1.8vw]"
                >
                    <span
                        style={{ animationDelay: `${i * 70}ms` }}
                        className={`pixel-glitch-cell absolute inset-0 ${flashClassName}`}
                    />
                </span>
            ))}
        </span>
    );
}

export function BillingToggle({ isYearly, onChange }) {
    return (
        <div className="flex items-center gap-[1vw] text22 max-lg:gap-[2vw] max-md:gap-[2.5vw] max-md:text-[2.2vw] font-mono! max-sm:gap-[3.5vw] max-sm:text-[4vw]">
            <button
                type="button"
                onClick={() => onChange(false)}
                className={`cursor-pointer transition-colors ${!isYearly ? "text-primary" : ""}`}
            >
                Monthly
            </button>

            <button
                type="button"
                role="switch"
                aria-checked={isYearly}
                aria-label="Toggle billing cycle"
                onClick={() => onChange(!isYearly)}
                className="relative flex h-full w-[4vw] cursor-pointer items-center bg-light-grey/30  max-lg:h-[3vw] max-lg:w-[6vw] max-lg:p-[0.4vw] max-md:h-[3.4vw] max-md:w-[6.8vw] max-md:p-[0.5vw] max-sm:h-[5.5vw] max-sm:w-[11vw] max-sm:p-[0.8vw]"
            >
                <span
                    className={`h-full w-1/2 bg-primary transition-transform duration-300 ${isYearly ? "translate-x-full" : "translate-x-0"
                        }`}
                />
            </button>

            <button
                type="button"
                onClick={() => onChange(true)}
                className={`cursor-pointer transition-colors ${isYearly ? "text-primary" : ""}`}
            >
                Yearly
            </button>
        </div>
    );
}

export default function PricingV3({ isIndia = false, auth = false }) {
    const container = useRef(null);
    const [isYearly, setIsYearly] = useState(true);
    // The yearly perk only scrambles in once the cards are on screen, so the
    // write-on isn't spent while the section is still below the fold.
    const [armed, setArmed] = useState(false);

    const currency = isIndia ? "INR" : "USD";
    const { symbol, monthly: monthlyAmount, yearly: yearlyAmount } = PRICING[currency];
    const planLabel = isYearly ? "Yearly" : "Monthly";
    const planPrice = isYearly ? yearlyAmount : monthlyAmount;

    // The pricing hero's plan stacks relabel their titles from this.
    useEffect(() => {
        window.dispatchEvent(new CustomEvent("vault:billing", { detail: { yearly: isYearly } }));
    }, [isYearly]);

    // Anything that links here wanting to land on the cards (VaultHeader's
    // "Upgrade to Pro", the dashboard, CliTokenManager, etc.) needs a manual
    // scroll for two independent reasons: Lenis owns scroll and resets
    // position on init, so the browser's native anchor-jump doesn't stick on
    // its own - and a client-side <Link> navigation into /pricing from
    // elsewhere in the app was observed dropping the #pricing-cards hash
    // (and any query string) from the URL entirely once it lands, so a
    // window.location.hash check alone never fires for that path. The
    // sessionStorage flag from lib/pricingScrollIntent.js is what actually
    // covers that case reliably; the hash check stays as a fallback for a
    // real full page load (typing the URL, a shared link).
    const lenis = useLenis();
    const hasScrolledToHash = useRef(false);

    useEffect(() => {
        if (hasScrolledToHash.current) return;
        if (typeof window === "undefined") return;

        const wantsScroll =
            window.location.hash === "#pricing-cards" || hasScrollToPricingCardsIntent();

        if (!wantsScroll) return;

        const target = document.getElementById("pricing-cards");
        if (!target) return;

        const timer = setTimeout(() => {
            const targetTop = target.getBoundingClientRect().top + window.scrollY;

            if (lenis) {
                lenis.scrollTo(targetTop, { force: true });
            } else {
                window.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
            }

            hasScrolledToHash.current = true;
            clearScrollToPricingCardsIntent();
        }, 400);

        return () => clearTimeout(timer);
    }, [lenis]);

    // A fresh object identity restarts the write-on, so the perk replays every
    // time the toggle lands back on yearly.
    const perkRun = useMemo(() => ({ active: isYearly && armed }), [isYearly, armed]);

    // Both cards rise into place once, as the section scrolls in.
    useGSAP(
        () => {
            const cards = gsap.utils.toArray(".pricing-v3-card");

            gsap.fromTo(
                cards,
                { opacity: 0, y: "2vw" },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    stagger: 0.12,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: container.current,
                        start: "top 75%",
                        once: true,
                        onEnter: () => setArmed(true),
                    },
                },
            );
        },
        { scope: container },
    );

    return (
        <section
            ref={container}
            id="pricing"
            className="relative z-10 w-full bg-foreground max-md:mt-[-40vw]!   py-[7vw]  text-background max-md:py-[14vw] max-sm:py-[20vw]"
        >
            {/* HEADING */}
            <div className="text-center w-full">
                <LineReveal  as="h2" className="t96 w-full max-lg:w-[95%] max-lg:mx-auto font-avenir ">
                    Start Free. Upgrade When You&rsquo;re{" "}
                    <span className="gradient-text-animate">Ready.</span>
                </LineReveal>

                <SplitLine delay={.25} as="p" className="text24 w-[50%]  mx-auto mt-[2vw] text-background max-lg:mt-[3vw] max-lg:w-[80vw] max-md:mt-[4vw] max-md:w-[70vw] max-md:text-[2.2vw] max-sm:mt-[6vw] max-sm:w-[80vw] max-sm:text-[4vw]">
                The Free Core lets you judge Vault where it matters: inside your own stack. Pro gives frequent users the full library, advanced effects, and ongoing releases.

                </SplitLine>
            </div>

            {/* TOGGLE */}
            <div className="mt-[6vw] px-[13%] flex justify-end max-lg:mt-[6vw] max-lg:px-[5%] max-md:mt-[8vw] max-sm:mt-[12vw] max-sm:justify-center">
                <BillingToggle isYearly={isYearly} onChange={setIsYearly} />
            </div>

            {/* CARDS */}
            <div className="mt-[1.5vw] w-[75%] fadeup mx-auto flex items-stretch max-lg:mt-[4vw] max-lg:w-[90%] max-lg:flex-col-reverse max-lg:gap-[5vw] max-md:mt-[5vw] max-md:flex-col-reverse max-md:gap-[6vw] max-sm:gap-[8vw]" id="pricing-cards">
                {/* FREE */}
                <div className="pricing-v3-card relative flex w-1/2 flex-col justify-between border border-background/15 px-[3vw] py-[3vw] max-lg:w-full max-lg:px-[4vw] max-lg:py-[4.5vw] max-md:w-full max-md:px-[5vw] max-md:py-[6vw] max-sm:px-[6vw] max-sm:py-[8vw]">
                    <PixelSquares flashClassName="bg-background" />

                    <div>
                        <p className="text64  max-md:text-[5vw] font-avenir max-sm:text-[7vw]">Free</p>

                        <div className="mt-[1.5vw] flex items-end gap-[1vw] max-lg:mt-[3vw] max-lg:gap-[2vw] max-md:mt-[4vw] max-md:gap-[2.5vw] max-sm:mt-[6vw]">
                            <p className="t96 font-avenir  leading-none max-md:text-[7vw] max-sm:text-[11vw]">
                                {symbol}0
                            </p>
                            <p className="text22 mb-[0.4vw] max-md:text-[2.2vw] max-sm:text-[4vw]">
                                Forever
                            </p>
                        </div>

                        <p className="text22  mt-[1.5vw] text-background/70 max-lg:mt-[3vw] max-md:mt-[3vw] max-md:text-[2.2vw] max-sm:mt-[5vw] max-sm:text-[4vw]">
                            For trying real effects in real projects.
                        </p>

                        <FeatureList
                            features={FREE_FEATURES}
                            className="mt-[2.5vw] max-lg:mt-[4vw] max-md:mt-[5vw] max-sm:mt-[8vw]"
                        />
                    </div>

                    <div className="mt-[3vw] pb-[2.5vw] w-fit max-lg:mt-[5vw] max-md:mt-[6vw] max-sm:mt-[10vw] max-sm:w-full">
                        <ButtonV3
                            variant="outline"
                            href="/effects/free"
                            text="Browse Free Effects"
                            className="text-background max-sm:w-full max-sm:justify-center"
                        />
                    </div>
                </div>

                {/* PRO */}
                <div className="pricing-v3-card relative flex w-1/2 flex-col justify-between bg-background px-[3vw] py-[3vw] text-foreground max-lg:w-full max-lg:px-[4vw] max-lg:py-[4.5vw] max-md:w-full max-md:px-[5vw] max-md:py-[6vw] max-sm:px-[6vw] max-sm:py-[8vw]">
                    <PixelSquares flashClassName="bg-white" />

                    <div>
                        <p className="text64 font-avenir  max-md:text-[5vw] max-sm:text-[7vw]">Pro</p>

                        <div className="mt-[1.5vw] flex items-end gap-[1vw] max-lg:mt-[3vw] max-lg:gap-[2vw] max-md:mt-[4vw] max-md:gap-[2.5vw] max-sm:mt-[6vw]">
                            <p className="t96 font-avenir items-center  flex leading-none max-md:text-[7vw] max-sm:text-[11vw]">
                                <span className="sr-only">{`${symbol}${planPrice} ${planLabel.toLowerCase()}`}</span>
                                <span aria-hidden="true" className="flex items-center leading-none">
                                    <span>{symbol}</span>
                                    <PriceDigits
                                        monthlyAmount={monthlyAmount}
                                        yearlyAmount={yearlyAmount}
                                        isYearly={isYearly}
                                    />
                                </span>
                            </p>

                            <p className="text22 mb-[0.4vw] max-md:text-[2.2vw] max-sm:text-[4vw]">
                                {planLabel}
                            </p>

                            <p
                                aria-hidden={!isYearly}
                                className={`text22 mb-[0.4vw] text-primary transition-opacity max-md:text-[2.2vw] max-sm:text-[4vw] [--link-flash:var(--primary)] [--link-pre:var(--primary)] ${isYearly ? "opacity-100 duration-0" : "opacity-0 duration-300"
                                    }`}
                            >
                                <ScrambleText text="3 months free" run={perkRun} />
                            </p>
                        </div>

                        {isIndia && (
                            <p className="font-mono mt-[0.3vw] text-[1vw] text-[#c5c5c5] max-lg:text-[1.7vw] max-md:text-[1.8vw] max-sm:text-[3.2vw]">
                                +18% GST
                            </p>
                        )}

                        <p className="text22  mt-[1.5vw] max-lg:mt-[3vw] max-md:mt-[3vw] max-md:text-[2.2vw] max-sm:mt-[5vw] max-sm:text-[4vw]">
                            For developers, founders, and agencies shipping premium work.
                        </p>

                        <FeatureList
                            features={PRO_FEATURES}
                            onDark
                            className="mt-[2.5vw] max-lg:mt-[4vw] max-md:mt-[5vw] max-sm:mt-[8vw]"
                        />
                    </div>

                    <div className="mt-[3vw] max-lg:mt-[5vw] max-md:mt-[6vw] max-sm:mt-[10vw]">
                        <div className="w-fit max-sm:w-full">
                            {auth ? (
                                <ProCta isYearly={isYearly} currency={currency} />
                            ) : (
                                <ButtonV3
                                    variant="orange"
                                    href="/sign-up"
                                    text="Upgrade to Pro"
                                    className="max-sm:w-full max-sm:justify-center"
                                />
                            )}
                        </div>

                        <p className="font-mono mt-[1.2vw] text-[0.9vw] text-light-grey max-lg:mt-[2.5vw] max-lg:text-[1.7vw] max-md:mt-[3vw] max-md:text-[1.8vw] max-sm:mt-[5vw] max-sm:text-[3.2vw]">
                            Instant access · npx hyperiux login · Cancel anytime
                        </p>
                    </div>
                </div>
            </div>

            {/* FOOTNOTE */}
            <SplitLine as="p" className="text32  mx-auto mt-[5vw] w-[52vw] text-center leading-[1.35] max-lg:mt-[8vw] max-lg:w-[85%] max-md:mt-[10vw] max-md:w-[75vw]  max-sm:mt-[14vw] max-sm:w-[90%] ">
                The free core stays free forever. Every effect lives in
                your repo. So even if you leave, your code stays.
            </SplitLine>
        </section>
    );
}
