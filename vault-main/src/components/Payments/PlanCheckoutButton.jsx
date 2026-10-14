"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Button from "@/homepage/components/Button";
import RazorpayButtonV3 from "./RazorpayButtonV3";
import { SignInRequiredModal } from "@/components/ui/SignInRequiredModal";
import { PLANS, formatPrice, getUpgradeKind } from "@/lib/plans";
import { savePendingCheckout } from "@/lib/pendingCheckout";

// The one "buy a plan" button: Pro or Pro+, quarterly or yearly, used by the
// pricing cards, the plan finder and the upgrade modal.
//   - Signed out: signs in, then lands on /checkout/<plan>, which opens Razorpay
//     (the plan is also remembered, for sign-up routes that drop redirect_url).
//   - Subscribed, and this plan is an upgrade (getUpgradeKind): Pro -> Pro+ on
//     the same billing period, quarterly -> yearly on the same plan, or Pro
//     quarterly -> Pro+ yearly. "Upgrade for <amount>" or "Go yearly for
//     <amount>", prorated (lib/upgrade.js) - unused time is
//     credited, and the old subscription is cancelled once this one is paid.
//     Nothing goes down a plan or from yearly to quarterly.
//   - Subscribed, anything else, labelled for what it is and disabled:
//     "You're on Pro" (or "… yearly" on the quarterly card) and "Included in
//     Pro+" on a lower plan. "Upgrade on Yearly" (Pro yearly on the Pro+
//     quarterly card) stays clickable: it flips the toggle (onSwitchToYearly).
//   - Otherwise: Razorpay checkout, then `successHref`.
export default function PlanCheckoutButton({
  tier,
  interval,
  currency = "USD",
  text,
  variant = "orange",
  className = "",
  // Where a successful payment lands
  successHref = "/dashboard",
  // Open checkout straight away (the pricing page resuming a plan picked before sign-in)
  autoOpen = false,
  // Shows the yearly version of the plans (the card's or modal's toggle)
  onSwitchToYearly,
}) {
  const { isLoaded, isSignedIn, user } = useUser();
  // Signed out: the sign-in modal, which lands on /checkout/<plan> once signed in
  const [signInOpen, setSignInOpen] = useState(false);

  const meta = user?.publicMetadata || {};
  // Subscribers from before Pro+ have no tier and count as Pro+
  const currentTier = isSignedIn && meta.plan === "pro" ? meta.tier || "pro_plus" : null;
  const currentInterval = meta.billingInterval || null;
  const upgradeKind = currentTier
    ? getUpgradeKind({ fromTier: currentTier, fromInterval: currentInterval, toTier: tier, toInterval: interval })
    : null;

  // What the upgrade costs today, after crediting unused time
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!upgradeKind) return undefined;
    let live = true;
    fetch(`/api/razorpay/upgrade-quote?tier=${tier}&interval=${interval}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => live && setQuote(data?.eligible ? data : null));
    return () => {
      live = false;
    };
  }, [upgradeKind, tier, interval]);

  const label = text || `Get ${PLANS[tier]?.name || "Pro"}`;

  if (!isLoaded || !isSignedIn) {
    const planKey = `${tier}.${interval}`;
    return (
      <>
        <Button
          variant={variant}
          href={`/checkout/${planKey}`}
          preventDefault
          onClick={() => {
            savePendingCheckout(planKey);
            setSignInOpen(true);
          }}
          text={label}
          className={className}
        />
        <SignInRequiredModal
          open={signInOpen}
          onClose={() => setSignInOpen(false)}
          redirect={`/checkout/${planKey}`}
          action={`get ${PLANS[tier]?.name || "Pro"}`}
        />
      </>
    );
  }

  if (currentTier && !upgradeKind) {
    // Pro yearly looking at Pro+ quarterly: the upgrade exists, on yearly
    const yearlyUpgrade =
      currentInterval === "yearly" && interval === "quarterly" &&
      getUpgradeKind({ fromTier: currentTier, fromInterval: "yearly", toTier: tier, toInterval: "yearly" });
    if (yearlyUpgrade) {
      return (
        <Button
          variant={variant}
          href="/pricing#plans"
          preventDefault={Boolean(onSwitchToYearly)}
          onClick={onSwitchToYearly}
          text="Upgrade on Yearly"
          className={className}
        />
      );
    }

    let status = `Included in ${PLANS[currentTier]?.name || "your plan"}`;
    if (currentTier === tier) {
      status = currentInterval === "yearly" && interval === "quarterly"
        ? `You're on ${PLANS[tier].name} yearly`
        : `You're on ${PLANS[tier].name}`;
    }
    // A status, not an action: shown disabled
    return <Button variant={variant} href="/dashboard" text={status} disabled className={className} />;
  }

  let buttonLabel = label;
  if (upgradeKind) {
    // Short, so it fits every card and phones: "Upgrade for $100.22" /
    // "Go yearly for $52.10" (the plan it's for is on the card around it)
    const amount = quote ? formatPrice(quote.charge / 100, quote.currency) : null;
    const verb = upgradeKind === "interval" ? "Go yearly" : "Upgrade";
    buttonLabel = amount ? `${verb} for ${amount}` : upgradeKind === "interval" ? "Go yearly" : `Upgrade to ${PLANS[tier].name}`;
  }

  return (
    <RazorpayButtonV3
      variant={variant}
      label={buttonLabel}
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
