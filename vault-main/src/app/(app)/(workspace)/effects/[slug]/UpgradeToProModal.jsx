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
} from "@/homepage-v3/sections/PricingV3";
import { ScrambleText } from "@/homepage-v3/components/HoverLinkV3";

// The pricing page's Pro card, in a modal - opened from the effect page when a
// signed-in free user hits something only Pro unlocks (a Pro effect, or the
// daily copy limit). Same prices, toggle, features and checkout button
// (PricingV3Cta -> Razorpay) as /pricing, so the purchase behaves identically.

const ProCta = dynamic(() => import("@/homepage-v3/sections/PricingV3Cta"), { ssr: false });

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
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-300 ${
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
        className={`relative flex max-h-[90vh] w-[38vw] flex-col overflow-y-auto border border-white/20 bg-[#0e0e0e] p-10 text-foreground shadow-2xl transition-transform duration-300 max-[1025px]:w-[75%] max-[1025px]:p-7 max-md:w-full max-md:p-6 ${
          open ? "scale-100" : "scale-95"
        }`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group absolute top-5 right-5 z-10 flex h-10 w-10 items-center justify-center border border-white/20 bg-white/10 text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white"
        >
          <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-white" />
            <span className="absolute h-px w-4 -rotate-45 bg-white" />
          </div>
        </button>

        <div className="pr-12">
          <h2 id="upgrade-to-pro-title" className="text64 font-neue-haas max-md:text-[5vw] max-sm:text-[8vw]">
            Pro
          </h2>
          <p className="mt-2 text-sm text-white/70">{REASON_COPY[shownReason] ?? REASON_COPY["pro-effect"]}</p>
        </div>

        <div className="mt-6 flex justify-start max-sm:justify-center">
          <BillingToggle isYearly={isYearly} onChange={setIsYearly} />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="flex items-center font-aeonik text-[4.5vw] leading-none max-[1025px]:text-[8vw] max-sm:text-[12vw]">
            <span className="sr-only">{`${symbol}${planPrice} ${planLabel.toLowerCase()}`}</span>
            <span aria-hidden="true" className="flex items-center leading-none">
              <span>{symbol}</span>
              <PriceDigits monthlyAmount={monthlyAmount} yearlyAmount={yearlyAmount} isYearly={isYearly} />
            </span>
          </p>
          <p className="text22 mb-[0.4vw] max-md:text-[2.2vw] max-sm:text-[4vw]">{planLabel}</p>
          <p
            aria-hidden={!isYearly}
            className={`text22 mb-[0.4vw] text-primary transition-opacity max-md:text-[2.2vw] max-sm:text-[4vw] [--link-flash:var(--primary)] [--link-pre:var(--primary)] ${
              isYearly ? "opacity-100 duration-0" : "opacity-0 duration-300"
            }`}
          >
            <ScrambleText text="3 months free" run={perkRun} />
          </p>
        </div>

        {isIndia && (
          <p className="mt-1 font-geist-mono text-[0.9vw] text-[#c5c5c5] max-[1025px]:text-[1.7vw] max-sm:text-[3.2vw]">
            +18% GST
          </p>
        )}

        <div className="mt-7 border-t border-white/10 pt-7">
          <FeatureList features={getProFeatures(isYearly)} onDark />
        </div>

        <div className="mt-8 w-fit max-sm:w-full">
          {/* Always rendered - unmounting it on close shrank the modal mid-fade. */}
          <ProCta isYearly={isYearly} currency={currency} />
        </div>

        <p className="mt-4 font-geist-mono text-[0.85vw] text-light-grey max-[1025px]:text-[1.7vw] max-sm:text-[3.2vw]">
          Instant access · npx hyperiux login · Cancel anytime
        </p>
      </div>
    </div>,
    document.body
  );
}
