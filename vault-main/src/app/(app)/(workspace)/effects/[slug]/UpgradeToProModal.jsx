"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  PRICING,
  getProFeatures,
  BillingToggle,
  FeatureList,
  PriceDigits,
} from "@/homepage/sections/Pricing";
import { ScrambleText } from "@/homepage/components/HoverLink";

// The pricing page's Pro card, in a modal - opened from the effect page when a
// signed-in free user hits something only Pro unlocks (a Pro effect, or the
// daily copy limit). Same prices, toggle, features and checkout button
// (PricingCta -> Razorpay) as /pricing, so the purchase behaves identically.

const ProCta = dynamic(() => import("@/homepage/sections/PricingCta"), { ssr: false });

const REASON_COPY = {
  "pro-effect": "This is a Pro effect. Upgrade to copy, install and use every effect in the vault.",
  limit: "You've used today's free copies. Pro raises your daily limit and unlocks every effect.",
};

export default function UpgradeToProModal({ open, onClose, reason = "pro-effect", isIndia = false }) {
  const [mounted, setMounted] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
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

  const currency = isIndia ? "INR" : "USD";
  const { symbol, monthly: monthlyAmount, yearly: yearlyAmount } = PRICING[currency];
  const planLabel = isYearly ? "Yearly" : "Monthly";
  const planPrice = isYearly ? yearlyAmount : monthlyAmount;
  // A fresh object restarts the "3 months free" write-on each time yearly is picked.
  const perkRun = useMemo(() => ({ active: open && isYearly }), [open, isYearly]);

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
        className={`relative flex max-h-[90vh] w-[38vw] flex-col gap-[1.6vw] overflow-y-auto border border-foreground/20 bg-background p-10 text-foreground shadow-2xl transition-transform duration-300 max-lg:w-[75%] max-lg:p-7 max-md:w-full max-md:gap-[6vw] max-md:p-6 ${
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
          <h2 id="upgrade-to-pro-title" className="text64 font-aeonik">
            Pro
          </h2>
          <p className="text18 text-foreground/70">{REASON_COPY[shownReason] ?? REASON_COPY["pro-effect"]}</p>
        </div>

        <div className="flex justify-start max-md:justify-center">
          <BillingToggle isYearly={isYearly} onChange={setIsYearly} />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text80 flex items-center font-aeonik leading-none">
              <span className="sr-only">{`${symbol}${planPrice} ${planLabel.toLowerCase()}`}</span>
              <span aria-hidden="true" className="flex items-center leading-none">
                <span>{symbol}</span>
                <PriceDigits monthlyAmount={monthlyAmount} yearlyAmount={yearlyAmount} isYearly={isYearly} />
              </span>
            </p>
            <p className="text22">{planLabel}</p>
            <p
              aria-hidden={!isYearly}
              className={`text22 text-primary transition-opacity [--link-flash:var(--primary)] [--link-pre:var(--primary)] ${
                isYearly ? "opacity-100 duration-0" : "opacity-0 duration-300"
              }`}
            >
              <ScrambleText text="3 months free" run={perkRun} />
            </p>
          </div>

          {isIndia && (
            <p className="font-mono text-[0.9vw] max-lg:text-[1.7vw] max-md:text-[3.2vw] text-foreground/80">
              +18% GST
            </p>
          )}
        </div>

        <div className="border-t border-foreground/10 pt-7">
          <FeatureList features={getProFeatures(isYearly)} onDark />
        </div>

        <div className="w-fit max-md:w-full">
          {/* Always rendered - unmounting it on close shrank the modal mid-fade. */}
          <ProCta isYearly={isYearly} currency={currency} />
        </div>

        <p className="font-mono text-[0.9vw] max-lg:text-[1.7vw] max-md:text-[3.2vw] text-light-grey">
          Instant access · npx hyperiux login · Cancel anytime
        </p>
      </div>
    </div>,
    document.body
  );
}
