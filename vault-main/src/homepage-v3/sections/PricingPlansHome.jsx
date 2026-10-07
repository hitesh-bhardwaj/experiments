"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "../components/ButtonV3";
import { RollingPrice } from "../components/PriceDigit";
import { useInteraction } from "../components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { createFluidField } from "../lib/fluid-field";

gsap.registerPlugin(useGSAP);

const CARD_FLUID = { cell: 18, iterations: 8, scrollDrift: false, dyeDecay: 0.985, pointerForce: 0.2, pointerInk: 0.006 };

function CardFluid() {
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

function Tick({ tone = "primary" }) {
    return (
        <i className={`mt-px grid size-5 place-items-center text-white ${tone === "ink" ? "bg-[#1D1D1D]" : "bg-primary"}`}>
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.2 4L19 7" />
            </svg>
        </i>
    );
}


export default function PricingPlansHome() {
    const rootRef = useRef(null);
    const billRef = useRef(null);
    const pillRef = useRef(null);
    const { sound } = useInteraction();
    const [period, setPeriod] = useState("y");

    useFadeUp(rootRef);

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
        bill.querySelectorAll('[role="radio"]').forEach((b) => ro.observe(b)); // the pill follows a button that changes width
        return () => ro.disconnect();
    }, [period]);

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
        <section ref={rootRef} id="pricing" data-sound-flow="off" data-sound-hover="off" className="relative bg-white px-[calc(var(--cvw)*4.5)] py-[7%] max-md:py-[15%] font-avenir text-[#1D1D1D] max-md:px-[calc(var(--cvw)*7)]">
            <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-end justify-between gap-[calc(var(--cvw)*2)] max-md:gap-[calc(var(--cvw)*5)]">
                <LineReveal as="h2" className="type-h1">
                    Two Plans.<br/> <span className="gradient-text-animate gradient-text-single">Every Moment Covered.</span>
                </LineReveal>

                <div ref={billRef} role="radiogroup" aria-label="Billing period" className="fadeup relative isolate inline-flex border border-[#1D1D1D]/15 bg-[#ececec] p-1.5 max-md:flex max-md:w-full">
                    {/* <CornerMarks /> */}
                    <i
                        ref={pillRef}
                        aria-hidden="true"
                        className="absolute top-1.5 bottom-1.5 left-0 z-0 bg-[#1D1D1D] transition-[transform,width] duration-[800ms] motion-reduce:transition-none"
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
                                className={`relative z-1 inline-flex h-10 items-center gap-2.5 px-[2vw] text-[11px] whitespace-nowrap max-md:h-[12vw] max-md:grow max-md:justify-center max-md:gap-[2vw] max-md:px-[3vw] max-md:text-[2.8vw] font-medium tracking-[.14em] uppercase transition-colors duration-700 ${on ? "text-[#F4F4F4]" : "text-[#6B6B6B]"}`}
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

            <div className={`mx-auto grid w-full max-w-[1536px] grid-cols-2 gap-[calc(var(--cvw)*1)] pt-[calc(var(--cvw)*3)] max-md:grid-cols-1 max-md:gap-[calc(var(--cvw)*4)] max-md:pt-[calc(var(--cvw)*6)]`}>
                {PLANS.map((plan, planIndex) => {
                    const dark = plan.id === "plus";
                    return (
                        <article
                            key={plan.id}
                            data-fadeup-delay={planIndex * 0.12}
                            className={`fadeup relative flex flex-col gap-[18px] p-[calc(var(--cvw)*3)] max-md:p-[calc(var(--cvw)*6)] ${dark ? "isolate overflow-hidden bg-black/90 text-[#F4F4F4]" : "border border-[#999999]/30 bg-white text-[#1D1D1D]"}`}
                        >
                            {/* <CornerMarks /> */}
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
                                <span className="mt-[.35em] mr-1 self-start text-[calc(var(--cvw)*2.6)] max-md:text-[calc(var(--cvw)*6.6)]">$</span>
                                {/* Each digit rolls on its own reel when the period changes */}
                                <span className="inline-flex text-[calc(var(--cvw)*6.4)] leading-none max-md:text-[calc(var(--cvw)*16)] tabular-nums">
                                    <RollingPrice value={plan.amount[period]} values={[plan.amount.q, plan.amount.y]} plan={period} />
                                </span>
                                <span className={`ml-2 text-[calc(var(--cvw)*1.1)] max-md:text-[calc(var(--cvw)*4.1)] tracking-normal ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>/mo</span>
                            </div>

                            {/* Billing + savings, closed off by a thin rule */}
                            <div className={`relative grid gap-1 border-b pb-[calc(var(--cvw)*1.4)] type-body ${dark ? "border-[#F4F4F4]/12" : "border-[#1D1D1D]/12"}`}>
                                <p data-period-copy className={`min-h-[1.5em] ${dark ? "text-[#a9a9a9]" : "text-[#6B6B6B]"}`}>{plan.billLine[period]}</p>
                                <p data-period-copy className={dark ? "text-primary" : "text-[#8a8a8a]"}>{plan.chip[period]}</p>
                            </div>

                            <ul className={`relative mt-[calc(var(--cvw)*0.4)] grid flex-1 content-start gap-[calc(var(--cvw)*1.2)] max-md:gap-[calc(var(--cvw)*4)] type-body`}>
                                {plan.features.map((f, i) => (
                                    <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-2.5">
                                        <Tick tone={dark ? "primary" : "ink"} />
                                        <span data-period-copy={f.text ? undefined : ""} className="[&_b]:font-medium">{f.text ?? f[period]}</span>
                                    </li>
                                ))}
                            </ul>

                            <ButtonV3
                                href="/pricing"
                                text={plan.cta.text}
                                variant={plan.cta.variant}
                                className={`relative mt-2.5 w-fit self-start justify-center ${plan.cta.variant === "outline" ? LIGHT_OUTLINE : ""}`}
                            />
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
