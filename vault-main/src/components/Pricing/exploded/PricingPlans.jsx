"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useLenis } from "lenis/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { clearScrollToPricingCardsIntent, hasScrollToPricingCardsIntent } from "@/lib/pricingScrollIntent";
import { useBilling } from "./billing";
import { BillingToggle, RollingNumber, Tick } from "./shared";

// Live plans (Free + Pro, monthly or yearly through Razorpay). Pricing, the tax
// note and the money helpers are exported for PricingCompare.
export const PRICING = {
  USD: { symbol: "$", locale: "en-US", monthly: 20, yearly: 179 },
  INR: { symbol: "₹", locale: "en-IN", monthly: 999, yearly: 8999 },
};

export const INDIA_TAX_NOTE = "+18% GST";

export const pricingFor = (isIndia) => PRICING[isIndia ? "INR" : "USD"];

export function formatMoney(value, pricing) {
  const digits = pricing.symbol === "$" && value % 1 ? 2 : 0;
  return value.toLocaleString(pricing.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const YEARLY_PERK = "3 months free";

const PLANS = {
  free: {
    name: "Free",
    tagline: "For trying real effects in real projects",
    features: [
      "50+ production-ready effects",
      "Copy-paste + CLI install",
      "Commercial-friendly usage",
      "Code you own",
    ],
    cta: { text: "Browse free effects", href: "/effects/free" },
  },
  pro: {
    name: "Pro",
    tagline: "For developers, founders and agencies shipping premium work",
    features: [
      "All 150+ effects",
      "New effects added regularly",
      "Priority access to upcoming packs",
      "Hyperiux CLI install + auth",
      "Dependency, performance & reduced-motion notes per effect",
      "Code you own, commercial-friendly",
    ],
  },
};

const ASSURANCES = [
  "Cancel anytime",
  "Everything you copy stays in your repo",
  "INR pricing for India",
  "Secure self-serve checkout",
];

// Per-month figure shown large on the Pro card: the monthly price, or the
// yearly price spread over twelve months.
const perMonth = (pricing, yearly) => (yearly ? pricing.yearly / 12 : pricing.monthly);

const yearlySavingPercent = (pricing) =>
  Math.round((1 - pricing.yearly / (pricing.monthly * 12)) * 100);

// Auth-aware Razorpay checkout (sign-up → checkout → "You're on Pro"),
// shared with the homepage's pricing cards.
const ProCta = dynamic(() => import("@/homepage-v3/sections/PricingV3Cta"), { ssr: false });

const HEADER_OFFSET = 96;
const DEEP_LINK_DELAY_MS = 400;

// Other pages link to /pricing#pricing-cards (header "Upgrade to Pro",
// dashboard, CLI token manager). Lenis owns scroll and resets it on init, so
// that jump has to be made by hand - same as PricingV3 did.
function useDeepLinkToCards() {
  const lenis = useLenis();
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current) return undefined;
    if (window.location.hash !== "#pricing-cards" && !hasScrollToPricingCardsIntent()) return undefined;
    const target = document.getElementById("pricing-cards");
    if (!target) return undefined;
    const timer = setTimeout(() => {
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      if (lenis) lenis.scrollTo(top, { force: true });
      else window.scrollTo({ top, behavior: "smooth" });
      doneRef.current = true;
      clearScrollToPricingCardsIntent();
    }, DEEP_LINK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [lenis]);
}

export default function PricingPlans({ isIndia = false, auth = true }) {
  const rootRef = useRef(null);
  const yearly = useBilling();
  const pricing = pricingFor(isIndia);
  const currency = isIndia ? "INR" : "USD";
  const format = useCallback((v) => formatMoney(v, pricing), [pricing]);
  const fullYear = pricing.monthly * 12;

  useFadeUp(rootRef);
  useDeepLinkToCards();

  return (
    <div ref={rootRef} className="sheet" id="plans">
      <div className="plans-head">
        <LineReveal as="h2" className="display d2 leading-[1.2]!">
          Two plans. <span className="gradient-text-animate">Every moment covered.</span>
        </LineReveal>
        <BillingToggle saving={`Save ${yearlySavingPercent(pricing)}%`} />
      </div>

      <div className="tiers" id="pricing-cards">
        <article className="tier fadeup">
          <div className="tier-top">
            <h3 className="tier-n">{PLANS.free.name}</h3>
            <span className="label tier-for">{PLANS.free.tagline}</span>
          </div>
          <div className="price">
            <span className="cur">{pricing.symbol}</span>
            <span className="amt">0</span>
            <span className="per">forever</span>
          </div>
          <p className="bill-line">No card, no account needed.</p>
          <ul className="feats">
            {PLANS.free.features.map((f) => (
              <li key={f}><Tick /><span>{f}</span></li>
            ))}
          </ul>
          <ButtonV3 variant="outline" href={PLANS.free.cta.href} text={PLANS.free.cta.text} className="tier-cta justify-center" />
        </article>

        <article className="tier tier--plus fadeup">
          {yearly && <span className="tier-badge label">{YEARLY_PERK}</span>}
          <div className="tier-top">
            <h3 className="tier-n">{PLANS.pro.name}</h3>
            <span className="label tier-for">{PLANS.pro.tagline}</span>
          </div>
          <div className="price">
            <span className="sr-only">
              {yearly ? `${pricing.symbol}${format(pricing.yearly)} a year` : `${pricing.symbol}${format(pricing.monthly)} a month`}
            </span>
            <span aria-hidden="true" className="cur">{pricing.symbol}</span>
            <span aria-hidden="true" className="amt"><RollingNumber value={perMonth(pricing, yearly)} format={format} /></span>
            <span aria-hidden="true" className="per">/mo</span>
          </div>
          <p className="bill-line">
            {yearly ? (
              <>Billed {pricing.symbol}{format(pricing.yearly)} yearly <s>{pricing.symbol}{format(fullYear)}</s></>
            ) : (
              <>Billed {pricing.symbol}{format(pricing.monthly)} every month</>
            )}
            {isIndia && <> · {INDIA_TAX_NOTE}</>}
          </p>
          <p className="save-chip label">
            {yearly ? `Save ${yearlySavingPercent(pricing)}% · ${YEARLY_PERK}` : `Go yearly for ${YEARLY_PERK}`}
          </p>
          <ul className="feats">
            {PLANS.pro.features.map((f) => (
              <li key={f}><Tick /><span>{f}</span></li>
            ))}
          </ul>
          <div className="tier-cta">
            {auth ? (
              <ProCta isYearly={yearly} currency={currency} />
            ) : (
              <ButtonV3 variant="orange" href="/sign-up" text="Upgrade to Pro" className="justify-center" />
            )}
          </div>
        </article>
      </div>

      <ul className="assure label">
        {ASSURANCES.map((a) => (
          <li key={a}><Tick />{a}</li>
        ))}
      </ul>
    </div>
  );
}
