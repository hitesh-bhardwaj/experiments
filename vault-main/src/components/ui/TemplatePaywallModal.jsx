"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, User, X } from "lucide-react";
import RazorpayCheckoutButton from "@/components/Payments/RazorpayCheckoutButton";
import { buttonClassName, ButtonChrome } from "@/homepage/components/Button";

// Same USD figures Pricing.jsx displays for Vault Pro - kept local since
// that component doesn't export its PRICING map. Templates checkout only
// ever runs in USD today (RazorpayCheckoutButton's default), same as this
// modal's one-time-purchase button already assumed before this change.
const MONTHLY_PRICE = 20;
const YEARLY_PRICE = 179;
const YEARLY_MONTHLY_EQUIVALENT = (YEARLY_PRICE / 12).toFixed(2);
const YEARLY_SAVINGS = MONTHLY_PRICE * 12 - YEARLY_PRICE;

const ANNUAL_FEATURES = [
  "Full template library",
  "All Pro features",
  "Download projects and use in any IDE",
];

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
// Monthly Pro doesn't include templates (annual-only), so a Pro Monthly
// subscriber gets an upsell to Annual alongside the one-time purchase; a
// free/no-subscription visitor gets the same card minus the "you're
// currently on Pro Monthly" framing, which wouldn't apply to them.
export function TemplatePaywallModal({
  template,
  open,
  onClose,
  onPurchased,
  autoOpenCheckout = false,
  templateAccess = null,
}) {
  const [mounted, setMounted] = useState(false);

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
  const isMonthlyPro = templateAccess?.reason === "monthly-pro-not-included";

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
            <p className="text-sm text-white/70">Templates are included with Pro Annual.</p>

            {isMonthlyPro && (
              <p className="max-w-sm text-sm leading-relaxed text-white/45">
                You&apos;re currently on Pro Monthly at ${MONTHLY_PRICE}/month. Upgrade to
                Annual to unlock this template and the entire template library.
              </p>
            )}
          </div>
        </div>

        <div className="mt-7 border border-white/15 px-6 py-6 w-[80%] mx-auto max-lg:w-full max-md:mt-5 max-md:w-full max-md:px-4 max-md:py-5">
          <p className="text-xs font-medium tracking-wide text-primary">PRO ANNUAL</p>

          <div className="mt-2 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start max-md:gap-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-medium text-white max-md:text-2xl">${YEARLY_PRICE}</span>
              <span className="text-sm text-white/50">/ year</span>
            </div>

            <div className="text-right max-md:text-left">
              <p className="text-sm font-medium text-primary">Save ${YEARLY_SAVINGS}/year</p>
              <p className="text-xs text-white/40">vs Pro Monthly</p>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-white/40">
            ${YEARLY_MONTHLY_EQUIVALENT} / month
          </p>

          <div className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-5 max-md:mt-4 max-md:pt-4">
            {ANNUAL_FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-white/70" />
                <span className="text-sm text-white/70">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 w-[80%] mx-auto max-lg:w-full max-md:mt-4 max-md:w-full">
          <RazorpayButtonV3
            variant="orange"
            label="Upgrade to Pro Annual"
            plan="yearly"
            currency="USD"
            className="w-full justify-center"
            onSuccess={() => onPurchased?.()}
          />
        </div>

        {isMonthlyPro && (
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-xs text-white/50 w-[80%] mx-auto max-lg:w-full max-md:w-full">
            <User className="h-3.5 w-3.5" />
            <span>
              You&apos;re currently on Pro Monthly &middot; ${MONTHLY_PRICE}/month
            </span>
          </div>
        )}

        <div
          className={
            isMonthlyPro
              ? "mt-4 max-md:mt-3 text-center"
              : "mt-6 border-t border-white/10 pt-5 max-md:mt-5 max-md:pt-4 text-center"
          }
        >
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
