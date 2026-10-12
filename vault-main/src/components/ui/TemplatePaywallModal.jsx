"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import RazorpayCheckoutButton from "@/components/Payments/RazorpayCheckoutButton";
import PlanCheckoutButton from "@/components/Payments/PlanCheckoutButton";
import { buttonClassName, ButtonChrome } from "@/homepage/components/Button";
import { PLANS, canRedeemCatalogue, formatPrice, getCreditsPerYear, getPrice } from "@/lib/plans";
import { useCurrency } from "@/lib/useCurrency";

// RazorpayCheckoutButton renders a real <button> with its own payment/
// loading logic (Razorpay script load, order/subscription creation, the
// checkout modal itself) - it isn't a navigation <Link> like Button, so
// it can't just be swapped for one. This wraps it in Button's exact
// visual chrome (buttonClassName + ButtonChrome, the same pieces the
// real Button is built from) while leaving RazorpayCheckoutButton's own
// click handling, disabled/loading state, and props completely untouched.
// The wrapping div only exists to catch pointer enter/leave for the
// scramble-text hover (RazorpayCheckoutButton doesn't forward those props)
// - `contents` keeps it out of layout entirely.
function RazorpayButtonV3({ variant = "orange", label, className = "", ...razorpayProps }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="contents"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <RazorpayCheckoutButton
        {...razorpayProps}
        data-sound-kind={variant === "outline" ? "secondary" : "primary"}
        className={buttonClassName({
          variant,
          className: `disabled:pointer-events-none disabled:opacity-60 ${className}`,
        })}
      >
        <ButtonChrome label={label} hovered={hovered} />
      </RazorpayCheckoutButton>
    </div>
  );
}

// Reached from TemplateDetail's "Buy"/"Download" button whenever the
// signed-in visitor doesn't already have access to this template - see
// getTemplateAccessDecision() in lib/template-access.js for the reasons.
// Offers the one-time purchase, and the yearly plans whose template credits
// can redeem it (Pro+ only, for a full-catalogue template). Subscribers
// redeem a credit from the "Get this template" popup instead.
export function TemplatePaywallModal({
  template,
  open,
  onClose,
  onPurchased,
  autoOpenCheckout = false,
}) {
  const [mounted, setMounted] = useState(false);
  const currency = useCurrency();

  // SSR-safe mounted flag - gates the createPortal() call below, which
  // needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const price = template.pricing?.standaloneOneTime;
  const tiers = ["pro", "pro_plus"].filter((tier) => canRedeemCatalogue(tier, template.catalogue));

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 max-md:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-paywall-title"
      onClick={onClose}
    >
      <div
        className="relative w-[40vw] max-h-[90vh] overflow-y-auto border border-white/15 bg-[#111111] px-9 py-9 max-lg:w-[85%] max-lg:px-7 max-lg:py-8 max-md:h-[80vh] max-md:max-h-none  max-md:border-x-0 max-md:border-b-0 max-md:px-5 max-md:py-12"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="group absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/20 group bg-white/10 text-white/70 transition-all duration-300 hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white max-md:right-3 max-md:top-3 max-md:h-8 max-md:w-8"
        >
          <X className="h-4 w-4 group-hover:rotate-90 duration-500 ease-in-out" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center max-md:gap-3">
          <div className="flex flex-col items-center gap-2.5 max-md:gap-2">
            <h3
              id="template-paywall-title"
              className="text-4xl font-semibold text-white max-lg:text-3xl max-md:text-2xl"
            >
              Unlock {template.title}
            </h3>
            <p className="text-sm text-white/70">
              Buy it outright, or redeem a template credit from a yearly plan.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 w-[80%] mx-auto max-lg:w-full max-md:mt-5 max-md:w-full">
          {tiers.map((tier) => {
            const credits = getCreditsPerYear(tier, "yearly");
            return (
              <div key={tier} className="border border-white/15 px-6 py-5 max-md:px-4 max-md:py-4">
                <p className="text-xs tracking-wide text-primary">{PLANS[tier].name} · yearly</p>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-3xl text-white max-md:text-2xl">
                    {formatPrice(getPrice(tier, "yearly", currency), currency)}
                  </span>
                  <span className="text-sm text-white/50">/ year{currency === "INR" ? " + GST" : ""}</span>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                  {[
                    `${credits} template credits a year · ${PLANS[tier].catalogue === "full" ? "full" : "selected"} catalogue`,
                    `${PLANS[tier].installsPerDay} component installs a day`,
                    "Redeemed templates stay yours, even if you cancel",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 shrink-0 text-white/70" />
                      <span className="text-sm text-white/70">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <PlanCheckoutButton
                    tier={tier}
                    interval="yearly"
                    currency={currency}
                    variant={tier === "pro_plus" ? "orange" : "outline"}
                    className="w-full justify-center"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-white/10 pt-5 max-md:mt-5 max-md:pt-4 text-center">
          <p className="text-sm text-white/70">Just want this template?</p>
          <div className="mt-3 flex justify-center max-md:mt-2.5">
            <RazorpayButtonV3
              variant="outline"
              label={`Buy ${template.title} for $${price}`}
              amount={price}
              currency="USD"
              templateSlug={template.slug}
              onSuccess={() => onPurchased?.()}
              autoOpen={autoOpenCheckout}
              className="max-md:w-full max-md:justify-center"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
