"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { prefersReducedMotion } from "@/lib/motion";
import CreditTiles from "./CreditTiles";
import ReasonList from "./ReasonList";
import RollNumber from "./RollNumber";
import RollText from "./RollText";
import PlanCheckoutButton from "@/components/Payments/PlanCheckoutButton";
import { useCurrencyState } from "@/lib/useCurrency";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  CURRENCY_SYMBOLS,
  PLANS as PLANS_TABLE,
  formatPrice,
  getCreditsPerYear,
  getMonthlyEquivalent,
  getPrice,
  getYearlySaving,
} from "@/lib/plans";

// Same plans and prices as PricingPlansHome, from lib/plans.js
function buildPlans(currency) {
  const fmt = (n) => formatPrice(n, currency);
  const gst = currency === "INR" ? " + GST" : "";
  const tierFor = (tier, interval) => ({
    month: getMonthlyEquivalent(tier, interval, currency),
    billed: `${fmt(getPrice(tier, interval, currency))} billed ${interval === "yearly" ? "yearly" : "every 3 months"}${gst}`,
    installs: PLANS_TABLE[tier].installsPerDay,
    credits: getCreditsPerYear(tier, interval),
    catalogue: PLANS_TABLE[tier].catalogue === "full" ? "full catalogue" : "selected catalogue",
  });
  return {
    pro: {
      tier: "pro",
      name: "Pro",
      y: tierFor("pro", "yearly"),
      q: tierFor("pro", "quarterly"),
      yearlySaving: getYearlySaving("pro", currency).amount,
    },
    plus: {
      tier: "pro_plus",
      name: "Pro+",
      y: tierFor("pro_plus", "yearly"),
      q: tierFor("pro_plus", "quarterly"),
      yearlySaving: getYearlySaving("pro_plus", currency).amount,
    },
  };
}

// Plan + billing for the answers, with the reasons shown to the visitor
function recommend(plans, currency, { templates, installs }) {
  const needsPlus = installs > plans.pro.y.installs || templates > plans.pro.y.credits;
  const key = needsPlus ? "plus" : "pro";
  // Light use can start quarterly; anyone launching templates gets more credits yearly
  const period = !needsPlus && templates === 0 ? "q" : "y";
  const plan = plans[key], tier = plan[period];
  const label = `${plan.name} ${period === "y" ? "Yearly" : "Quarterly"}`;
  const savings = [plans.pro.yearlySaving, plans.plus.yearlySaving];

  const why = [];
  const num = (n, values) => ({ n, values });
  // One wording for every count, so the row doesn't reword while the sliders glide past Pro's limit
  why.push({
    id: "installs",
    parts: [num(installs, [1, 10]), ` installs a day fits inside ${plan.name}'s `, num(tier.installs, [plans.pro.y.installs, plans.plus.y.installs]), "-a-day limit."],
  });
  if (templates > 0) {
    why.push({
      id: "templates",
      parts:
        templates <= tier.credits
          ? ["Your ", num(templates, [1, 6]), templates > 1 ? " templates" : " template", ` fit inside ${label}'s `, num(tier.credits, [1, 5]), tier.credits > 1 ? " credits" : " credit", ` (${tier.catalogue}).`]
          : ["Your ", num(templates, [1, 6]), ` templates are more than ${label}'s `, num(tier.credits, [1, 5]), " credits, so extra ones are on you."],
    });
  }
  why.push({
    id: "saving",
    parts:
      period === "y"
        ? [`Yearly saves ${CURRENCY_SYMBOLS[currency]}`, num(plan.yearlySaving, savings), " against quarterly and adds those ", num(tier.credits, [1, 5]), " template credits."]
        : ["Quarterly keeps it light. Go yearly any time for more template credits."],
  });

  return { key, period, plan, tier, label, why };
}

const LABEL = "type-label";
// The homepage's tune slider: a thin track that fills with the brand colour up to the thumb
const RANGE =
  "h-[calc(var(--cvw)*1.4)] w-full cursor-pointer appearance-none bg-transparent max-lg:h-[4vw] max-md:h-[6vw] " +
  "[&::-webkit-slider-runnable-track]:h-[calc(var(--cvw)*0.2)] [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--primary)_var(--fill),color-mix(in_srgb,var(--foreground)_20%,transparent)_var(--fill))] max-lg:[&::-webkit-slider-runnable-track]:h-[0.4vw] max-md:[&::-webkit-slider-runnable-track]:h-[0.5vw] " +
  "[&::-webkit-slider-thumb]:-mt-[calc(var(--cvw)*0.5)] [&::-webkit-slider-thumb]:h-[calc(var(--cvw)*1.2)] [&::-webkit-slider-thumb]:w-[calc(var(--cvw)*0.5)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-primary max-lg:[&::-webkit-slider-thumb]:-mt-[1.3vw] max-lg:[&::-webkit-slider-thumb]:h-[3vw] max-lg:[&::-webkit-slider-thumb]:w-[1vw] max-md:[&::-webkit-slider-thumb]:-mt-[2.3vw] max-md:[&::-webkit-slider-thumb]:h-[5vw] max-md:[&::-webkit-slider-thumb]:w-[2vw] " +
  "[&::-moz-range-track]:h-[calc(var(--cvw)*0.2)] [&::-moz-range-track]:bg-foreground/20 max-lg:[&::-moz-range-track]:h-[0.4vw] max-md:[&::-moz-range-track]:h-[0.5vw] " +
  "[&::-moz-range-progress]:h-[calc(var(--cvw)*0.2)] [&::-moz-range-progress]:bg-primary max-lg:[&::-moz-range-progress]:h-[0.4vw] max-md:[&::-moz-range-progress]:h-[0.5vw] " +
  "[&::-moz-range-thumb]:h-[calc(var(--cvw)*1.2)] [&::-moz-range-thumb]:w-[calc(var(--cvw)*0.5)] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary max-lg:[&::-moz-range-thumb]:h-[3vw] max-lg:[&::-moz-range-thumb]:w-[1vw] max-md:[&::-moz-range-thumb]:h-[5vw] max-md:[&::-moz-range-thumb]:w-[2vw]";
const fill = (v, min, max) => ({ "--fill": `${((v - min) / (max - min)) * 100}%` });

export default function PricingFinder({ currency: initialCurrency }) {
  const { currency, ready: currencyReady } = useCurrencyState(initialCurrency);
  const plans = useMemo(() => buildPlans(currency), [currency]);
  const rootRef = useRef(null);
  const outRef = useRef(null);
  // The thumbs sit at a continuous position (so they can glide); the answers are the whole step nearest to it
  const [pos, setPos] = useState({ templates: 2, installs: 4 });
  const templates = Math.round(pos.templates);
  const installs = Math.round(pos.installs);
  const posRef = useRef(pos);
  useLayoutEffect(() => { posRef.current = pos; });
  const tweens = useRef({});
  const glideTo = (name, to, duration = 0.9) => {
    tweens.current[name]?.kill();
    if (prefersReducedMotion()) { setPos((p) => ({ ...p, [name]: to })); return; }
    const proxy = { v: posRef.current[name] };
    tweens.current[name] = gsap.to(proxy, {
      v: to,
      duration,
      ease: "power3.inOut",
      onUpdate: () => setPos((p) => ({ ...p, [name]: proxy.v })),
    });
  };
  // Dragging follows the pointer freely, then settles on the nearest step on release
  const dragProps = (name) => ({
    onChange: (e) => {
      tweens.current[name]?.kill(); setPos((p) => ({ ...p, [name]: +e.target.value }));
    },
    onPointerUp: () => glideTo(name, Math.round(posRef.current[name]), 0.3),
    onKeyUp: () => glideTo(name, Math.round(posRef.current[name]), 0.3),
  });
  const rec = recommend(plans, currency, { templates, installs });
  const key = rec.key + rec.period;

  useFadeUp(rootRef);

  // The plan name changes width (Pro / Pro+), so the tag beside it slides to its
  // new spot instead of jumping: watch the name resize, tween the difference.
  const tagRef = useRef(null);
  useLayoutEffect(() => {
    const tag = tagRef.current;
    const name = tag?.previousElementSibling;
    if (!tag || !name || typeof ResizeObserver === "undefined") return undefined;
    // Tween by how much the name itself grew or shrank. The observer also fires once on
    // observe and when fonts finish loading, which must not slide the tag in from afar.
    let width = name.offsetWidth;
    let started = false;
    const ro = new ResizeObserver(() => {
      const next = name.offsetWidth;
      const delta = next - width;
      width = next;
      if (!started) { started = true; return; }
      if (delta && !prefersReducedMotion()) {
        const from = (gsap.getProperty(tag, "x") || 0) - delta;
        gsap.fromTo(tag, { x: from }, { x: 0, duration: 0.9, ease: "expo.out", overwrite: "auto" });
      }
    });
    ro.observe(name);
    return () => ro.disconnect();
  }, []);

  // Only a changed recommendation animates, not every slider tick
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(outRef.current.querySelectorAll("[data-pick]"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" });
  }, { dependencies: [key], scope: outRef, revertOnUpdate: true });

  return (
    <section ref={rootRef} id="finder" className="section-x relative py-[7%] text-foreground">
      <div className="site-container flex items-center justify-between gap-[calc(var(--cvw)*3)] max-lg:flex-col max-lg:items-stretch max-lg:gap-[7vw] max-md:gap-[10vw]">
        <div className="flex w-[40%] flex-col gap-[calc(var(--cvw)*1.8)] max-lg:w-full max-lg:gap-[3vw] max-md:gap-[10vw]">
          <LineReveal as="h2" className="type-h1 w-[70%] text-foreground max-lg:w-[80%]">
            Not Sure? <span className="gradient-text-animate">Let’s Size It.</span>
          </LineReveal>
          <p className="fadeup type-body-lg w-[80%] text-foreground/60 max-lg:w-[70%] max-md:w-full">
            Tell us how you build. We’ll point you to the plan that fits, and show you exactly why.
          </p>
        </div>

        <div className="fadeup flex w-[55%] items-stretch border border-foreground/10 bg-dark-card/60 max-lg:w-full max-md:flex-col">
          <div className="flex w-[50%] flex-col justify-between gap-[calc(var(--cvw)*2.4)] p-[calc(var(--cvw)*2.4)] max-lg:gap-[5vw] max-lg:p-[6vw] max-md:w-full max-md:gap-[8vw]">
            <div className="flex flex-col gap-[calc(var(--cvw)*2.4)] max-lg:gap-[5vw] max-md:gap-[8vw]">
              <div className="flex flex-col gap-[calc(var(--cvw)*0.6)] max-lg:gap-[1.5vw] max-md:gap-[2vw]">
                <label htmlFor="fd-templates" className={`flex items-center justify-between gap-[calc(var(--cvw)*1)] text-foreground/60 ${LABEL}`}>
                  <span>Templates you’ll launch this year</span>
                  <output htmlFor="fd-templates" className="flex shrink-0 justify-end text-foreground"><RollNumber value={templates} values={[0, 6]} /></output>
                </label>
                <input id="fd-templates" type="range" min="0" max="6" step="any" value={pos.templates} {...dragProps("templates")} style={fill(pos.templates, 0, 6)} className={RANGE} />
              </div>
              <div className="flex flex-col gap-[calc(var(--cvw)*0.6)] max-lg:gap-[1.5vw] max-md:gap-[2vw]">
                <label htmlFor="fd-installs" className={`flex items-center justify-between gap-[calc(var(--cvw)*1)] text-foreground/60 ${LABEL}`}>
                  <span>Components you install on a busy day</span>
                  <output htmlFor="fd-installs" className="flex shrink-0 justify-end text-foreground"><RollNumber value={installs} values={[1, 10]} /></output>
                </label>
                <input id="fd-installs" type="range" min="1" max="10" step="any" value={pos.installs} {...dragProps("installs")} style={fill(pos.installs, 1, 10)} className={RANGE} />
              </div>
            </div>
          </div>

          <div ref={outRef} aria-live="polite" className="flex w-[50%] flex-col gap-[calc(var(--cvw)*1.2)] border-l border-foreground/10 p-[calc(var(--cvw)*2.4)] max-lg:gap-[3.5vw] max-lg:p-[6vw] max-md:w-full max-md:gap-[4vw] max-md:border-t max-md:border-l-0">
            <p data-pick className={`text-foreground/60 ${LABEL}`}>We’d pick</p>
            <div className="type-h1 flex items-center gap-[calc(var(--cvw)*1)] text-foreground max-lg:gap-[2vw] max-md:gap-[5vw]">
              <RollText text={rec.plan.name} dir={rec.key === "plus" ? 1 : -1} className="pb-[0.1em]" />
              <span ref={tagRef} className={`bg-primary/20 px-[calc(var(--cvw)*0.7)] py-[calc(var(--cvw)*0.4)] text-primary-hover max-lg:px-[1.4vw] max-lg:py-[0.8vw] max-md:px-[2vw] max-md:py-[1vw] ${LABEL}`}>
                {rec.period === "y" ? "Yearly" : "Quarterly"}
              </span>
            </div>
            <p className="type-body-lg flex items-baseline text-foreground">
              {currencyReady ? (
                <>
                  <span className="flex items-baseline">{CURRENCY_SYMBOLS[currency]}<span className="relative top-[0.1em]"><RollNumber value={rec.tier.month} values={[plans.pro.y.month, plans.pro.q.month, plans.plus.y.month, plans.plus.q.month]} /></span></span>
                  <span data-pick className="text-foreground/60">/mo · {rec.tier.billed}</span>
                </>
              ) : (
                <Skeleton className="h-[1em] w-48" />
              )}
            </p>
            <CreditTiles count={rec.tier.credits} used={templates} sizeClass="size-[calc(var(--cvw)*1.8)] max-lg:size-[4vw] max-md:size-[7vw]" />
            {/* The reasons quote yearly savings in the visitor's currency */}
            {currencyReady ? <ReasonList items={rec.why} /> : <Skeleton className="h-16 w-full" />}
            <div className="max-md:pb-8">
              <PlanCheckoutButton
                tier={rec.plan.tier}
                interval={rec.period === "y" ? "yearly" : "quarterly"}
                currency={currency}
                text={`Start ${rec.label}`}
                className="max-w-full max-md:w-full max-md:justify-center"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
