"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Button from "@/homepage/components/Button";
import RazorpayButtonV3 from "./RazorpayButtonV3";
import { PLANS } from "@/lib/plans";

// The one "buy a plan" button: Pro or Pro+, quarterly or yearly, used by the
// pricing cards, the plan finder and the upgrade modal.
//   - Signed out: signs in, then comes back here and opens checkout itself
//     (the ?checkout=<tier>.<interval> param below).
//   - Already subscribed: points at the dashboard - a second subscription
//     can't be started until the current one ends (create-subscription 409s).
//   - Otherwise: Razorpay checkout, then the dashboard.
const RESUME_PARAM = "checkout";

export default function PlanCheckoutButton({
  tier,
  interval,
  currency = "USD",
  text,
  variant = "orange",
  className = "",
}) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const [autoOpen, setAutoOpen] = useState(false);
  const planKey = `${tier}.${interval}`;

  // Read once on mount (not useSearchParams, which would need a Suspense
  // boundary around every page this sits on)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(RESUME_PARAM) !== planKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoOpen(true);
    params.delete(RESUME_PARAM);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [planKey]);

  const label = text || `Get ${PLANS[tier]?.name || "Pro"}`;

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

  const meta = user?.publicMetadata || {};
  if (meta.plan === "pro") {
    // Subscribers from before Pro+ have no tier and count as Pro+
    const currentTier = meta.tier || "pro_plus";
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
      label={label}
      tier={tier}
      interval={interval}
      currency={currency}
      autoOpen={autoOpen}
      onSuccess={() => {
        window.location.href = "/dashboard";
      }}
      className={className}
    />
  );
}
