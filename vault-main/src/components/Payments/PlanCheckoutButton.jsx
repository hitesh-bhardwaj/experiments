"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Button from "@/homepage/components/Button";
import RazorpayButtonV3 from "./RazorpayButtonV3";
import { PLANS, formatPrice } from "@/lib/plans";

// The one "buy a plan" button: Pro or Pro+, quarterly or yearly, used by the
// pricing cards, the plan finder and the upgrade modal.
//   - Signed out: signs in, then comes back here with ?checkout=<tier>.<interval>,
//     which the pricing page cards (resumeCheckout) pick up to open checkout.
//   - Already subscribed: Pro subscribers looking at Pro+ get "Upgrade to
//     Pro+ · <amount> today", prorated (lib/upgrade.js): the unused part of Pro
//     is taken off, and the server cancels the Pro subscription once Pro+ is
//     paid. Pro yearly can only move to Pro+ yearly. Anything else points at
//     the dashboard - a second subscription can't be started while one is live.
//   - Otherwise: Razorpay checkout, then `successHref`.
const RESUME_PARAM = "checkout";

export default function PlanCheckoutButton({
  tier,
  interval,
  currency = "USD",
  text,
  variant = "orange",
  className = "",
  // Where a successful payment lands
  successHref = "/dashboard",
  // Open checkout by itself when the URL carries ?checkout=<this plan>
  resumeCheckout = false,
}) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const [autoOpen, setAutoOpen] = useState(false);
  const planKey = `${tier}.${interval}`;

  // Read once on mount (not useSearchParams, which would need a Suspense
  // boundary around every page this sits on)
  useEffect(() => {
    if (!resumeCheckout) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get(RESUME_PARAM) !== planKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoOpen(true);
    params.delete(RESUME_PARAM);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [planKey, resumeCheckout]);

  const label = text || `Get ${PLANS[tier]?.name || "Pro"}`;

  // What the upgrade costs today, after crediting unused Pro
  const meta = user?.publicMetadata || {};
  const canQuote = isSignedIn && meta.plan === "pro" && meta.tier === "pro" && tier === "pro_plus";
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!canQuote) return undefined;
    let live = true;
    fetch(`/api/razorpay/upgrade-quote?tier=${tier}&interval=${interval}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => live && setQuote(data?.eligible ? data : null));
    return () => {
      live = false;
    };
  }, [canQuote, tier, interval]);
  const upgradeLabel = quote
    ? `Upgrade to ${PLANS[tier].name} · ${formatPrice(quote.charge / 100, quote.currency)} today`
    : `Upgrade to ${PLANS[tier].name}`;

  if (!isLoaded || !isSignedIn) {
    const back = `${pathname}?${RESUME_PARAM}=${planKey}`;
    return (
      <Button
        variant={variant}
        href={`/sign-in?redirect_url=${encodeURIComponent(back)}`}
        text={label}
        className={className}
      />
    );
  }

  // Subscribers from before Pro+ have no tier and count as Pro+
  const currentTier = meta.plan === "pro" ? meta.tier || "pro_plus" : null;
  const upgradesTier = currentTier === "pro" && tier === "pro_plus";
  // Pro yearly -> Pro+ quarterly isn't offered: it would leave Pro credit unused
  const needsYearly = upgradesTier && meta.billingInterval === "yearly" && interval === "quarterly";
  const isUpgrade = upgradesTier && !needsYearly;

  if (needsYearly) {
    return (
      <Button
        variant={variant}
        href={`/pricing?${RESUME_PARAM}=${tier}.yearly#plans`}
        text={`Upgrade to ${PLANS[tier].name} yearly`}
        className={className}
      />
    );
  }

  if (currentTier && !isUpgrade) {
    return (
      <Button
        variant={variant}
        href="/dashboard"
        text={currentTier === tier ? `You're on ${PLANS[tier].name}` : "Manage your plan"}
        className={className}
      />
    );
  }

  return (
    <RazorpayButtonV3
      variant={variant}
      label={isUpgrade ? upgradeLabel : label}
      tier={tier}
      interval={interval}
      currency={currency}
      autoOpen={autoOpen}
      onSuccess={() => {
        window.location.href = successHref;
      }}
      className={className}
    />
  );
}
