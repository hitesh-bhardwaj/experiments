"use client";

import { useUser } from "@clerk/nextjs";
import ButtonV3 from "../components/ButtonV3";
import RazorpayButtonV3 from "@/components/Payments/RazorpayButtonV3";

export default function PricingV3Cta({ isYearly, currency }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const userPlan = isSignedIn ? user?.publicMetadata?.plan || "free" : null;
  const billingInterval = isSignedIn
    ? user?.publicMetadata?.billingInterval || null
    : null;

  if (!isLoaded || !isSignedIn) {
    return (
      <ButtonV3
        variant="orange"
        href="/sign-up"
        text="Upgrade to Pro"
        className="max-sm:w-full max-sm:justify-center"
      />
    );
  }

  if (userPlan === "pro") {
    // A monthly Pro subscriber toggling the card to Yearly is looking at a
    // plan they don't have yet - "You're on Pro" reads as "nothing to do
    // here" when there plainly is. Only actually nothing-to-do when the
    // toggle matches (or exceeds) their real billing interval: monthly
    // subscriber viewing Monthly, or a yearly subscriber viewing either.
    const isUpsellOpportunity = isYearly && billingInterval === "monthly";

    return (
      <ButtonV3
        variant="orange"
        href="/dashboard"
        text={isUpsellOpportunity ? "Upgrade your plan" : "You're on Pro"}
        className="max-sm:w-full max-sm:justify-center"
      />
    );
  }

  return (
    <RazorpayButtonV3
      variant="orange"
      label="Upgrade to Pro"
      plan={isYearly ? "yearly" : "monthly"}
      currency={currency}
      className="max-sm:w-full max-sm:justify-center"
    />
  );
}
