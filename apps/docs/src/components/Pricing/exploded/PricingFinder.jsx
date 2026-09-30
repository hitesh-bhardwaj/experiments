"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { setYearly } from "./billing";
import { PLANS, formatMoney, perMonth, pricingFor } from "./plans";

const HEADER_OFFSET = 96;
const MAX_MONTHS = 12;

const NEEDS = [
  { id: "advanced", label: "WebGL, cursor or advanced transitions", why: "WebGL scenes, cursor effects and advanced page transitions are Pro-only." },
  { id: "drops", label: "New effects as they drop", why: "New effects are added to Pro every month." },
  { id: "support", label: "Email support", why: "Pro includes email support. Free is supported through GitHub and the community." },
];

// Plan + billing for the answers, with the reasons shown to the visitor
function recommend({ months, needs }, pricing) {
  const s = pricing.symbol, fmt = (v) => `${s}${formatMoney(v, pricing)}`;
  const picked = NEEDS.filter((n) => needs[n.id]);
  if (!picked.length) {
    return {
      plan: "free",
      why: ["Free Core's 50+ effects cover scroll and text work, with CLI install and code you own.", "Upgrade later without losing anything you've copied."],
    };
  }
  // Break-even: yearly wins once monthly would cost more than a year's price
  const yearly = pricing.monthly * months >= pricing.yearly;
  const monthlyTotal = fmt(pricing.monthly * months);
  const billingWhy = yearly
    ? `Over ${months} months, monthly would cost ${monthlyTotal}. Yearly is ${fmt(pricing.yearly)} flat.`
    : `For ${months} month${months > 1 ? "s" : ""}, monthly (${monthlyTotal}) costs less than yearly (${fmt(pricing.yearly)}). Switch any time.`;
  return { plan: "pro", yearly, why: [...picked.map((n) => n.why), billingWhy] };
}

export default function PricingFinder({ isIndia = false }) {
  const rootRef = useRef(null);
  const outRef = useRef(null);
  const { sound } = useInteraction() ?? {};
  const pricing = pricingFor(isIndia);
  const [months, setMonths] = useState(6);
  const [needs, setNeeds] = useState({ advanced: true, drops: false, support: false });
  const rec = recommend({ months, needs }, pricing);
  const key = rec.plan + (rec.yearly ? "y" : "m");

  useFadeUp(rootRef);

  // Only a changed recommendation animates, not every slider tick
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(outRef.current.querySelectorAll(".fd-plan,.fd-price"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" });
  }, { dependencies: [key], scope: outRef, revertOnUpdate: true });

  const toggleNeed = (id) => {
    setNeeds((n) => ({ ...n, [id]: !n[id] }));
    sound?.note?.(NEEDS.findIndex((n) => n.id === id));
  };

  const billingLabel = rec.yearly ? "Yearly" : "Monthly";
  const price = rec.plan === "pro" ? perMonth(pricing, rec.yearly) : 0;

  return (
    <section ref={rootRef} className="finder" id="finder">
      <div className="fd-copy">
        <p className="eyebrow label fadeup">Plan finder</p>
        <LineReveal as="h2" className="display d2 fd-title">
          Not sure? <span className="gradient-text-animate">Let’s size it.</span>
        </LineReveal>
        <p className="body fadeup">Tell us how you build. We’ll point you to the plan that fits, and show you exactly why.</p>
      </div>

      <div className="fd-box fadeup">
        <div className="fd-ctl">
          <div className="ctl">
            <label className="label" htmlFor="fd-months">
              Months you’ll be building <output htmlFor="fd-months">{months}</output>
            </label>
            <input id="fd-months" type="range" min="1" max={MAX_MONTHS} step="1" value={months} onChange={(e) => setMonths(+e.target.value)} />
          </div>
          <div className="fd-needs">
            <span className="label fd-k">I need</span>
            {NEEDS.map((n) => (
              <button key={n.id} type="button" className="chip label" aria-pressed={!!needs[n.id]} onClick={() => toggleNeed(n.id)}>
                {n.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={outRef} className="fd-out" aria-live="polite">
          <p className="label fd-k">We’d pick</p>
          <p className="fd-plan">
            <span>{PLANS[rec.plan].name}</span>
            {rec.plan === "pro" && <span className="fd-bill label">{billingLabel}</span>}
          </p>
          <p className="fd-price">
            {pricing.symbol}{formatMoney(price, pricing)}
            <span className="per">
              {rec.plan === "pro"
                ? `/mo · ${pricing.symbol}${formatMoney(rec.yearly ? pricing.yearly : pricing.monthly, pricing)} billed ${billingLabel.toLowerCase()}`
                : " forever"}
            </span>
          </p>
          <ul className="fd-why">
            {rec.why.map((w) => <li key={w}><span>{w}</span></li>)}
          </ul>
          {rec.plan === "pro" ? (
            <ButtonV3
              variant="orange"
              href="#pricing-cards"
              scrollOffset={HEADER_OFFSET}
              text={`See Pro ${billingLabel.toLowerCase()}`}
              onClick={() => setYearly(rec.yearly)}
              className="fd-cta"
            />
          ) : (
            <ButtonV3 variant="orange" href={PLANS.free.cta.href} text={PLANS.free.cta.text} className="fd-cta" />
          )}
        </div>
      </div>
    </section>
  );
}
