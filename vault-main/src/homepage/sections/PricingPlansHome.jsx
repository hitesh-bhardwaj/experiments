"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { RollingPrice } from "../components/PriceDigit";
import { useInteraction } from "../components/InteractionProvider";
import RollText from "@/components/Pricing/exploded/RollText";
import CardFluid from "../components/CardFluid";
import dynamic from "next/dynamic";
import Button from "../components/Button";
import { useCurrency } from "@/lib/useCurrency";
import {
    CURRENCY_SYMBOLS,
    PLANS,
    formatPrice,
    getCreditsPerYear,
    getMonthlyEquivalent,
    getPrice,
    getYearlySaving,
} from "@/lib/plans";


// Real checkout needs Clerk, which marketing routes (the homepage) don't load
// at all - so it's only pulled in where `checkout` is on (the pricing page).
const PlanCheckoutButton = dynamic(() => import("@/components/Payments/PlanCheckoutButton"));

// Prices, credits and install limits all come from lib/plans.js, in the
// visitor's currency (INR from India, before GST).
function buildPlans(currency) {
    const fmt = (n) => formatPrice(n, currency);
    const gst = currency === "INR" ? " + GST" : "";
    const amount = (tier) => ({ q: getMonthlyEquivalent(tier, "quarterly", currency), y: getMonthlyEquivalent(tier, "yearly", currency) });
    const billLine = (tier) => ({
        q: `Billed ${fmt(getPrice(tier, "quarterly", currency))} every 3 months${gst}`,
        y: <>Billed {fmt(getPrice(tier, "yearly", currency))} yearly{gst} <s className="ml-1.5 opacity-60">{fmt(getPrice(tier, "quarterly", currency) * 4)}</s></>,
    });
    const credits = (tier, interval) => getCreditsPerYear(tier, interval);

    return [
        {
            id: "pro",
            tier: "pro",
            name: "Pro",
            for: "For developers shipping polished interfaces",
            amount: amount("pro"),
            billLine: billLine("pro"),
            chip: {
                q: `Go yearly for ${credits("pro", "yearly")} template credits a year`,
                y: `Save ${getYearlySaving("pro", currency).percent}% + ${credits("pro", "yearly")} template credits`,
            },
            features: [
                { text: "Every component in the vault" },
                { text: <><b>{PLANS.pro.installsPerDay}</b> installs a day · copies, CLI &amp; MCP</> },
                {
                    q: <>Template credits on yearly billing only</>,
                    y: <><b>{credits("pro", "yearly")}</b> template credits a year · selected catalogue</>,
                },
                { text: "Hyperiux CLI install + auth" },
                { text: "Code you own · commercial use" },
            ],
            cta: { text: "Start Pro", variant: "outline" },
        },
        {
            id: "plus",
            tier: "pro_plus",
            name: <>Pro<span className="gradient-text-animate">+</span></>,
            badge: "Most Complete",
            for: "For builders who ship whole sites",
            amount: amount("pro_plus"),
            billLine: billLine("pro_plus"),
            chip: {
                q: "1 template credit every quarter",
                y: `Save ${getYearlySaving("pro_plus", currency).percent}% + ${credits("pro_plus", "yearly")} template credits${currency === "USD" ? " · worth ~$200" : ""}`,
            },
            features: [
                { text: <><b>Everything</b>: every component &amp; the full template catalogue</> },
                { text: <><b>{PLANS.pro_plus.installsPerDay}</b> installs a day · copies, CLI &amp; MCP</> },
                {
                    q: <><b>1</b> template credit every quarter · full catalogue</>,
                    y: <><b>{credits("pro_plus", "yearly")}</b> template credits a year · full catalogue</>,
                },
                { text: "Occasional freebies, on the house" },
                { text: "Priority access to new drops" },
                { text: "Code you own · commercial use" },
            ],
            cta: { text: "Get Pro+", variant: "orange" },
            yearlyNote: "Your credits are worth more than the plan.",
        },
    ];
}

// The billing line and the savings chip roll as one block, so each period's pair is built once
// (RollText tells a change by the element itself)
function buildPeriodCopy(plans) {
    return Object.fromEntries(plans.map((plan) => {
        const dark = plan.id === "plus";
        const pair = (p) => (
            <div className="flex flex-col gap-1">
                <span className={`min-h-[1.5em] ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>{plan.billLine[p]}</span>
                <span className="text-primary">{plan.chip[p]}</span>
            </div>
        );
        return [plan.id, { q: pair("q"), y: pair("y") }];
    }));
}

// Cross-fades its content: fades out, swaps once hidden, fades back in
function FadeSwap({ children, swapKey }) {
    const [shown, setShown] = useState(children);
    const [visible, setVisible] = useState(true);
    const latest = useRef(children);
    const first = useRef(true);
    latest.current = children;
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        // Always fades toward the newest content, so quick toggles never strand it half-faded
        setVisible(false);
        const t = setTimeout(() => {
            setShown(latest.current);
            setVisible(true);
        }, 250);
        return () => clearTimeout(t);
    }, [swapKey]);
    return (
        <div className={`transition-opacity duration-300 ease-out motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}>
            {shown}
        </div>
    );
}

const ASSURANCES = [
    "Cancel anytime",
    "Everything you copy stays in your repo",
    "INR pricing for India, plus GST",
    "Secure self-serve checkout",
];

const billingOptions = (currency) => [
    { id: "q", label: "Quarterly" },
    {
        id: "y",
        label: "Yearly",
        save: `Save up to ${Math.max(getYearlySaving("pro", currency).percent, getYearlySaving("pro_plus", currency).percent)}%`,
    },
];

const EASE = "cubic-bezier(.16,1,.3,1)";
// Button's outline variant is built for dark sections; on this light sheet it's a line button
const LIGHT_OUTLINE = "border-[#1D1D1D]/40! bg-transparent! text-[#1D1D1D]!";

function Tick({ tone = "primary" }) {
    return (
        <i className={`mt-px grid size-5 place-items-center text-foreground ${tone === "ink" ? "bg-[#1D1D1D]" : "bg-primary"}`}>
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.2 4L19 7" />
            </svg>
        </i>
    );
}


export default function PricingPlansHome({ currency: initialCurrency, checkout = false }) {
    const currency = useCurrency(initialCurrency);
    const plans = useMemo(() => buildPlans(currency), [currency]);
    const periodCopy = useMemo(() => buildPeriodCopy(plans), [plans]);
    const billing = useMemo(() => billingOptions(currency), [currency]);
    const rootRef = useRef(null);
    const billRef = useRef(null);
    const pillRef = useRef(null);
    const { sound } = useInteraction();
    const [period, setPeriod] = useState("y");
    // Which way the card text rolls: up when going to yearly, down when going back
    const dir = period === "y" ? 1 : -1;

    useFadeUp(rootRef);

    useLayoutEffect(() => {
        const bill = billRef.current;
        const place = () => {
            const on = bill.querySelector('[aria-checked="true"]');
            if (!on) return;
            pillRef.current.style.width = `${on.offsetWidth}px`;
            pillRef.current.style.height = `${on.offsetHeight}px`;
            pillRef.current.style.top = `${on.offsetTop}px`;
            pillRef.current.style.transform = `translateX(${on.offsetLeft}px)`;
        };
        place();
        const ro = new ResizeObserver(place);
        ro.observe(bill);
        bill.querySelectorAll('[role="radio"]').forEach((b) => ro.observe(b)); // the pill follows a button that changes width
        return () => ro.disconnect();
    }, [period]);

    const choose = (id) => {
        if (id === period) return;
        setPeriod(id);
        sound?.note?.(id === "y" ? 3 : 1);
    };

    return (
        <section ref={rootRef} id="pricing" data-sound-flow="off" data-sound-hover="off" className="relative bg-white px-[calc(var(--cvw)*4.5)] space-y-[3vw] py-[7%] max-md:py-[12%] font-avenir text-[#1D1D1D] max-md:px-[calc(var(--cvw)*7)]">
            <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-end justify-between gap-[calc(var(--cvw)*2)] max-md:gap-[calc(var(--cvw)*10)]">
                <LineReveal as="h2" className="type-h1 leading-[1.2]! w-[40%] max-xl:w-[80%] max-md:w-full">
                    Two plans. <span className="gradient-text-animate">Every Moment Covered.</span>
                </LineReveal>

                <div ref={billRef} role="radiogroup" aria-label="Billing period" className="fadeup  relative isolate inline-flex border border-[#1D1D1D]/15 bg-[#ececec] p-1 max-md:flex max-md:w-full">
                    {/* <CornerMarks /> */}
                    <i
                        ref={pillRef}
                        aria-hidden="true"
                        className="absolute top-0 left-0 z-0 bg-[#1D1D1D] transition-[transform,width] duration-800 motion-reduce:transition-none"
                        style={{ transitionTimingFunction: EASE }}
                    />
                    {billing.map((b) => {
                        const on = period === b.id;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => choose(b.id)}
                                className={`relative z-1 inline-flex h-10 items-center gap-2.5 px-[2vw] text-[11px] whitespace-nowrap max-md:h-[12vw] max-md:grow max-md:justify-center max-md:gap-[2vw] max-md:px-[3vw] max-md:text-[2.8vw] font-medium tracking-[.14em] uppercase transition-colors duration-700 ${on ? "text-white" : "text-[#6B6B6B]"}`}
                            >
                                {b.label}
                                {b.save && (
                                    <span className={`px-[7px] py-[3px] max-md:px-[2vw] max-md:py-[1vw] transition-colors duration-700 ${on ? "bg-primary text-[#141414]" : "bg-primary/20 text-primary/70"}`}>{b.save}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className={`mx-auto grid w-full max-w-[1536px] px-10 max-md:px-0 grid-cols-2 gap-[calc(var(--cvw)*1)] pt-[calc(var(--cvw)*3)]  max-md:grid-cols-1 max-md:gap-[calc(var(--cvw)*4)] max-md:pt-[calc(var(--cvw)*8)]`}>
                {plans.map((plan, planIndex) => {
                    const dark = plan.id === "plus";
                    return (
                        <article
                            key={plan.id}
                            data-fadeup-delay={planIndex * 0.12}
                            className={`fadeup relative flex flex-col gap-[18px] p-[calc(var(--cvw)*3)] max-md:p-[calc(var(--cvw)*6)] ${dark ? "bg-[#141414] text-white" : "border border-[#999999]/30 bg-white text-[#1D1D1D]"}`}
                        >
                            {/* Dotted grid + mouse fluid on the dark card; no swish (the section sets data-sound-flow="off") */}
                            {dark && <CardFluid />}
                            {plan.badge && (
                                <span className="text-shimmer absolute top-[22px] right-[22px] z-1 type-label max-sm:static max-sm:self-start">
                                    {plan.badge}
                                </span>
                            )}

                            <div className="relative grid gap-2">
                                <h3 className="type-h2 uppercase">{plan.name}</h3>
                                <span className={`type-body-lg ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>{plan.for}</span>
                            </div>

                            <div className="relative mt-2 flex items-baseline leading-none tracking-[-.05em]">
                                <span className="mt-[.35em] mr-1 self-start text-[calc(var(--cvw)*2.6)] max-md:text-[calc(var(--cvw)*6.6)]">{CURRENCY_SYMBOLS[currency]}</span>
                                {/* Each digit rolls on its own reel when the period changes */}
                                <span className="inline-flex text-[calc(var(--cvw)*6.4)] leading-none max-md:text-[calc(var(--cvw)*16)] tabular-nums">
                                    <RollingPrice value={plan.amount[period]} values={[plan.amount.q, plan.amount.y]} plan={period} />
                                </span>
                                <span className={`ml-2 text-[calc(var(--cvw)*1.1)] max-md:text-[calc(var(--cvw)*4.1)] tracking-normal ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>/mo</span>
                            </div>

                            {/* Billing + savings, closed off by a thin rule */}
                            <div className={`relative grid gap-1 border-b pb-[calc(var(--cvw)*1.4)] type-body ${dark ? "border-[#F4F4F4]/12" : "border-[#1D1D1D]/12"}`}>
                                <FadeSwap swapKey={`${currency}.${period}`}>{periodCopy[plan.id][period]}</FadeSwap>
                            </div>

                            <ul className={`relative mt-[calc(var(--cvw)*0.4)] grid flex-1 content-start gap-[calc(var(--cvw)*1.2)] max-md:gap-[calc(var(--cvw)*4)] type-body`}>
                                {plan.features.map((f, i) => (
                                    <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5">
                                        <Tick />
                                        <RollText text={f.text ?? f[period]} dir={dir} block className="[&_b]:font-medium" />
                                    </li>
                                ))}
                            </ul>

                            <div className="relative mt-2.5 flex flex-col items-start gap-1">
                                {checkout ? (
                                    <PlanCheckoutButton
                                        tier={plan.tier}
                                        interval={period === "y" ? "yearly" : "quarterly"}
                                        currency={currency}
                                        text={plan.cta.text}
                                        variant={plan.cta.variant}
                                        className={`w-fit justify-center ${plan.cta.variant === "outline" ? LIGHT_OUTLINE : ""}`}
                                    />
                                ) : (
                                    <Button
                                        href="/pricing#plans"
                                        text={plan.cta.text}
                                        variant={plan.cta.variant}
                                        className={`w-fit justify-center ${plan.cta.variant === "outline" ? LIGHT_OUTLINE : ""}`}
                                    />
                                )}
                            </div>
                            {/* Same line reserved in every card, so the buttons sit level */}
                            <p aria-hidden={!plan.yearlyNote} className="relative -mt-1 min-h-[1.5em] text-left type-small text-[#8a8a8a]">
                                {plan.yearlyNote ?? ""}
                            </p>
                        </article>
                    );
                })}
            </div>

            <ul className="mx-auto mt-[calc(var(--cvw)*2)] flex w-full max-w-[1536px] flex-wrap justify-center max-md:justify-start max-md:gap-[2.5vw] max-md:mt-[5vh] gap-x-[calc(var(--cvw)*2)] gap-y-[calc(var(--cvw)*0.8)] type-label text-[#6B6B6B]">
                {ASSURANCES.map((a) => (
                    <li key={a} className="flex items-center  gap-2"><Tick />{a}</li>
                ))}
            </ul>
        </section>
    );
}
