"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PlanCheckoutButton from "@/components/Payments/PlanCheckoutButton";
import { useCurrency } from "@/lib/useCurrency";
import {
  PLANS,
  formatPrice,
  getCreditsPerYear,
  getMonthlyEquivalent,
  getPrice,
} from "@/lib/plans";

// Pro and Pro+, side by side, in a modal - opened from the effect page when a
// signed-in user hits something their plan doesn't cover (a Pro effect, or
// the daily install limit). Same prices and checkout as /pricing (lib/plans.js,
// PlanCheckoutButton -> Razorpay).

const REASON_COPY = {
  "pro-effect": "This is a Pro effect. Pick a plan to copy, install and use every effect in the vault.",
  limit: "You've used today's free installs. Pro gives you 5 a day, Pro+ 10.",
  "limit-pro": `You've used today's ${PLANS.pro.installsPerDay} Pro installs. Pro+ gives you ${PLANS.pro_plus.installsPerDay} a day.`,
};

const INTERVAL_OPTIONS = [
  { id: "quarterly", label: "Quarterly" },
  { id: "yearly", label: "Yearly" },
];

function PlanColumn({ tier, interval, currency, onSwitchToYearly }) {
  const plan = PLANS[tier];
  const credits = getCreditsPerYear(tier, interval);
  const billed = formatPrice(getPrice(tier, interval, currency), currency);
  const gst = currency === "INR" ? " + GST" : "";
  const dark = tier === "pro_plus";

  return (
    <div className={`flex w-1/2 flex-col gap-4 p-6 max-md:w-full ${dark ? "bg-dark-card" : "border border-foreground/15"}`}>
      <p className="type-h3">{plan.name}</p>
      <div className="flex flex-col gap-1">
        <p className="type-h2 leading-none">
          {formatPrice(getMonthlyEquivalent(tier, interval, currency), currency)}
          <span className="type-small text-foreground/60">/mo</span>
        </p>
        <p className="type-small text-foreground/60">
          {billed} {interval === "yearly" ? "yearly" : "every 3 months"}
          {gst}
        </p>
      </div>
      <ul className="flex flex-col gap-2 type-small text-foreground/80">
        <li>{tier === "pro_plus" ? "Every component & the full template catalogue" : "Every component in the vault"}</li>
        <li>{plan.installsPerDay} installs a day</li>
        <li>
          {credits === 0
            ? "Template credits on yearly billing only"
            : tier === "pro_plus" && interval === "quarterly"
              ? "1 template credit every quarter"
              : `${credits} template credit${credits === 1 ? "" : "s"} a year`}
          {credits > 0 && (plan.catalogue === "full" ? " · full catalogue" : " · selected catalogue")}
        </li>
      </ul>
      <PlanCheckoutButton
        tier={tier}
        interval={interval}
        currency={currency}
        variant={dark ? "orange" : "outline"}
        onSwitchToYearly={onSwitchToYearly}
        className="w-fit max-md:w-full max-md:justify-center"
      />
    </div>
  );
}

export default function UpgradeToProModal({ open, onClose, reason = "pro-effect", isIndia }) {
  const [mounted, setMounted] = useState(false);
  const [interval, setBillingInterval] = useState("yearly");
  const currency = useCurrency(isIndia === undefined ? undefined : isIndia ? "INR" : "USD");
  // Keeps the reason text steady while the modal fades out (the parent
  // resets it the moment it closes).
  const [shownReason, setShownReason] = useState(reason);
  if (open && reason !== shownReason) setShownReason(reason);

  // SSR-safe mounted flag - gates the createPortal() below.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-lg transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={onClose}
      aria-hidden={!open}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-to-pro-title"
        onClick={(event) => event.stopPropagation()}
        className={`relative flex max-h-[90vh] w-[52vw] flex-col gap-[1.6vw] overflow-y-auto border border-foreground/20 bg-background p-10 text-foreground shadow-2xl transition-transform duration-300 max-lg:w-[85%] max-lg:p-7 max-md:w-full max-md:gap-[6vw] max-md:p-6 ${
          open ? "scale-100" : "scale-95"
        }`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center border border-foreground/20 bg-foreground/10 text-foreground/70 transition-all duration-500 ease-in-out hover:border-primary hover:bg-primary hover:text-foreground"
        >
          <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-foreground" />
            <span className="absolute h-px w-4 -rotate-45 bg-foreground" />
          </div>
        </button>

        <div className="flex flex-col gap-2 pr-12">
          <h2 id="upgrade-to-pro-title" className="type-h1">
            Pick a plan
          </h2>
          <p className="type-small text-foreground/70">{REASON_COPY[shownReason] ?? REASON_COPY["pro-effect"]}</p>
        </div>

        <div role="radiogroup" aria-label="Billing period" className="flex w-fit border border-foreground/15 p-1">
          {INTERVAL_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={interval === option.id}
              onClick={() => setBillingInterval(option.id)}
              className={`type-label px-4 py-2 transition-colors duration-300 ${
                interval === option.id ? "bg-foreground text-background" : "text-foreground/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Always rendered - unmounting it on close shrank the modal mid-fade. */}
        <div className="flex gap-4 max-md:flex-col">
          <PlanColumn tier="pro" interval={interval} currency={currency} onSwitchToYearly={() => setBillingInterval("yearly")} />
          <PlanColumn tier="pro_plus" interval={interval} currency={currency} onSwitchToYearly={() => setBillingInterval("yearly")} />
        </div>

        <p className="type-small text-light-grey">
          Instant access · npx hyperiux login · Cancel anytime
        </p>
      </div>
    </div>,
    document.body
  );
}
