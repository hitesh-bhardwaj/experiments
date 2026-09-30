"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "../components/ButtonV3";
import CornerMarks from "../components/CornerMarks";
import { RollingPrice } from "../components/PriceDigit";
import { useInteraction } from "../components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

// Content from the "Exploded tiers" pricing concept, word for word.
// NOTE: display only - Pro+, quarterly billing and template credits don't
// exist in checkout yet, so both CTAs lead to /pricing.
const PLANS = [
    {
        id: "pro",
        name: "Pro",
        for: "For developers shipping polished interfaces",
        amount: { q: 9, y: 7.42 },
        billLine: { q: "Billed $27 every 3 months", y: <>Billed $89 yearly <s className="ml-1.5 opacity-60">$108</s></> },
        chip: { q: "Go yearly for 3 credits and 5 copies a day", y: "Save 18% + 3 template credits" },
        features: [
            { text: "Every component in the vault" },
            { q: <><b>3</b> component copies a day</>, y: <><b>5</b> component copies a day</> },
            { q: <><b>1</b> template credit a year · selected catalogue</>, y: <><b>3</b> template credits a year · selected catalogue</> },
            { text: "Hyperiux CLI install + auth" },
            { text: "Code you own · commercial use" },
        ],
        cta: { text: "Start Pro", variant: "outline" },
    },
    {
        id: "plus",
        name: <>Pro<span className="gradient-text-animate">+</span></>,
        badge: "Most complete",
        for: "For builders who ship whole sites",
        amount: { q: 19, y: 14.92 },
        billLine: { q: "Billed $57 every 3 months", y: <>Billed $179 yearly <s className="ml-1.5 opacity-60">$228</s></> },
        chip: { q: "1 template credit every quarter", y: "Save 21% + 5 template credits · worth ~$200" },
        features: [
            { text: <><b>Everything</b>: components, sections &amp; templates</> },
            { text: <><b>Unlimited</b> component copies</> },
            { q: <><b>1</b> template credit every quarter · full catalogue</>, y: <><b>5</b> template credits a year · full catalogue</> },
            { text: "Occasional freebies, on the house" },
            { text: "Priority access to new drops" },
            { text: "Code you own · commercial use" },
        ],
        cta: { text: "Get Pro+", variant: "orange" },
        yearlyNote: "Your credits are worth more than the plan.",
    },
];

const ASSURANCES = [
    "Cancel anytime",
    "Everything you copy stays in your repo",
    "INR pricing for India, GST included",
    "Secure self-serve checkout",
];

const BILLING = [
    { id: "q", label: "Quarterly" },
    { id: "y", label: "Yearly", save: "Save up to 21%" },
];

const EASE = "cubic-bezier(.16,1,.3,1)";
// ButtonV3's outline variant is built for dark sections; on this light sheet it's a line button
const LIGHT_OUTLINE = "border-[#1D1D1D]/40! bg-transparent! text-[#1D1D1D]!";

function Tick({ dark = false }) {
    return (
        <i className={`mt-px grid size-5 place-items-center ${dark ? "bg-primary/20" : "bg-primary/15"} text-primary`}>
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.2 4L19 7" />
            </svg>
        </i>
    );
}

// "Two plans. Every moment covered.": the pricing concept's plans block on a
// light sheet, in the homepage's edgy language - square corners, grey
// borders and orange corner marks. One Quarterly/Yearly toggle rolls every
// price and swaps the billing lines, chips and credit counts.
export default function PricingPlansHome() {
    const rootRef = useRef(null);
    const billRef = useRef(null);
    const pillRef = useRef(null);
    const { sound } = useInteraction();
    const [period, setPeriod] = useState("y");

    useFadeUp(rootRef);

    // Sliding pill under the chosen period
    useLayoutEffect(() => {
        const bill = billRef.current;
        const place = () => {
            const on = bill.querySelector('[aria-checked="true"]');
            if (!on) return;
            pillRef.current.style.width = `${on.offsetWidth}px`;
            pillRef.current.style.transform = `translateX(${on.offsetLeft}px)`;
        };
        place();
        const ro = new ResizeObserver(place);
        ro.observe(bill);
        return () => ro.disconnect();
    }, [period]);

    // Period-dependent copy fades back in when the period changes
    useGSAP(() => {
        if (prefersReducedMotion()) return;
        gsap.fromTo("[data-period-copy]", { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" });
    }, { scope: rootRef, dependencies: [period], revertOnUpdate: false });

    const choose = (id) => {
        if (id === period) return;
        setPeriod(id);
        sound?.note?.(id === "y" ? 3 : 1);
    };

    return (
        <section ref={rootRef} id="pricing" className="relative bg-white font-avenir text-[#1D1D1D]">
            <div className="mx-auto flex max-w-[1536px] flex-wrap items-end justify-between gap-8 px-[5vw] pt-[clamp(6rem,15vh,9rem)] pb-[clamp(2.5rem,6vh,4rem)]">
                <LineReveal as="h2" className="max-w-[60vw] text-[clamp(2.2rem,4.6vw,4.6rem)] leading-[1.02] font-normal tracking-[-.035em]">
                    Two Plans.<br/> <span className="gradient-text-animate gradient-text-single">Every Moment Covered.</span>
                </LineReveal>

                <div ref={billRef} role="radiogroup" aria-label="Billing period" className="fadeup relative isolate inline-flex border border-[#1D1D1D]/15 bg-[#ececec] p-1">
                    {/* <CornerMarks /> */}
                    <i
                        ref={pillRef}
                        aria-hidden="true"
                        className="absolute top-1 bottom-1 left-0 z-0 bg-[#1D1D1D] transition-[transform,width] duration-[800ms] motion-reduce:transition-none"
                        style={{ transitionTimingFunction: EASE }}
                    />
                    {BILLING.map((b) => {
                        const on = period === b.id;
                        return (
                            <button
                                key={b.id}
                                type="button"
                                role="radio"
                                aria-checked={on}
                                onClick={() => choose(b.id)}
                                className={`relative z-1 inline-flex h-10 items-center gap-2.5 px-[18px] text-[11px] font-semibold tracking-[.14em] uppercase transition-colors duration-700 ${on ? "text-[#F4F4F4]" : "text-[#6B6B6B]"}`}
                            >
                                {b.label}
                                {b.save && (
                                    <span className={`px-[7px] py-[3px] transition-colors duration-700 ${on ? "bg-primary text-[#141414]" : "bg-primary/20 text-[#B84A00]"}`}>{b.save}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mx-auto grid max-w-[1536px] grid-cols-2 gap-3.5 px-[8vw] max-[1000px]:grid-cols-1 pt-[3vw]">
                {PLANS.map((plan) => {
                    const dark = plan.id === "plus";
                    return (
                        <article
                            key={plan.id}
                            className={`fadeup relative flex flex-col gap-[18px] border p-[clamp(1.8rem,3vw,2.8rem)] ${dark ? "border-[#1D1D1D] bg-[#1D1D1D] text-[#F4F4F4]" : "border-[#1D1D1D]/15 bg-white"}`}
                        >
                            {/* <CornerMarks /> */}
                            {dark && <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(255,107,0,.4),transparent_60%)]" />}
                            {plan.badge && (
                                <span className="absolute top-[22px] right-[22px] z-1 bg-primary px-2.5 py-1.5 text-[11px] font-semibold tracking-[.14em] text-[#141414] uppercase max-sm:static max-sm:self-start">
                                    {plan.badge}
                                </span>
                            )}

                            <div className="relative grid gap-2">
                                <h3 className="text-[clamp(1.8rem,2.6vw,2.4rem)] font-medium tracking-[-.03em]">{plan.name}</h3>
                                <span className={`text-[11px] font-medium tracking-[.14em] uppercase ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>{plan.for}</span>
                            </div>

                            <div className="relative mt-2 flex items-baseline leading-none tracking-[-.05em]">
                                <span className="mt-[.35em] mr-1 self-start text-[clamp(1.8rem,2.6vw,2.4rem)]">$</span>
                                {/* Each digit rolls on its own reel when the period changes */}
                                <span className="inline-flex text-[clamp(4rem,7vw,6.2rem)] leading-none tabular-nums">
                                    <RollingPrice value={plan.amount[period]} values={[plan.amount.q, plan.amount.y]} plan={period} />
                                </span>
                                <span className={`ml-2 text-[15px] tracking-normal ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>/mo</span>
                            </div>

                            <p data-period-copy className={`relative min-h-[1.5em] text-[14.5px] ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>{plan.billLine[period]}</p>
                            <p data-period-copy className={`relative self-start px-[11px] py-[7px] text-[11px] font-semibold tracking-[.14em] uppercase ${dark ? "bg-primary/15 text-[#FFB27A]" : "bg-primary/10 text-[#B84A00]"}`}>
                                {plan.chip[period]}
                            </p>

                            <ul className="relative mt-1.5 grid flex-1 content-start gap-[13px] text-[15.5px]">
                                {plan.features.map((f, i) => (
                                    <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5">
                                        <Tick dark={dark} />
                                        <span data-period-copy={f.text ? undefined : ""} className="[&_b]:font-bold">{f.text ?? f[period]}</span>
                                    </li>
                                ))}
                            </ul>

                            <ButtonV3
                                href="/pricing"
                                text={plan.cta.text}
                                variant={plan.cta.variant}
                                className={`relative mt-2.5 w-fit self-start justify-center ${plan.cta.variant === "outline" ? LIGHT_OUTLINE : ""}`}
                            />
                            {plan.yearlyNote && period === "y" && (
                                <p className="relative -mt-1 text-left text-[9px] font-medium tracking-[.14em] text-[#FFB27A] uppercase">{plan.yearlyNote}</p>
                            )}
                        </article>
                    );
                })}
            </div>

            <ul className="mx-auto mt-7 flex max-w-[1536px] flex-wrap justify-center gap-x-7 gap-y-2.5 px-[clamp(1.25rem,3vw,3rem)] text-[11px] font-semibold tracking-[.14em] text-[#6B6B6B] uppercase">
                {ASSURANCES.map((a) => (
                    <li key={a} className="flex items-center gap-2"><Tick />{a}</li>
                ))}
            </ul>

            {/* <div className="fadeup relative  mt-[clamp(3rem,8vh,5rem)] flex  mx-auto flex-wrap items-center justify-between gap-4 border border-[#1D1D1D]/15 px-6 py-5 max-[1536px]:mx-[clamp(1.25rem,3vw,3rem)]">
                <CornerMarks />
                <p className="text-[#6B6B6B]"><b className="font-bold text-[#1D1D1D]">Just exploring?</b> The Free Core has 50+ production-ready effects, free forever. No account needed.</p>
                <ButtonV3 href="/effects/free" text="Browse Free Effects" variant="outline" className={LIGHT_OUTLINE} />
            </div> */}
            <div className="h-[clamp(6rem,14vh,9rem)]" aria-hidden="true" />
        </section>
    );
}
