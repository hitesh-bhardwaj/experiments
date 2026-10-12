"use client";

import { useEffect } from "react";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { PLANS, getCreditsPerYear, isValidInterval, isValidTier } from "@/lib/plans";

// The "you're in" nudge after buying a plan on the pricing page, which sends
// the buyer here with ?upgraded=<tier>.<interval>. Shown once, then the param
// is dropped from the URL so a reload doesn't show it again.
export default function UpgradeWelcome() {
  const { toast, showToast, dismissToast } = useToastQueue(8000);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const [tier, interval] = (params.get("upgraded") || "").split(".");
    if (!isValidTier(tier) || !isValidInterval(interval)) return;

    params.delete("upgraded");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);

    const plan = PLANS[tier];
    const credits = getCreditsPerYear(tier, interval);
    showToast({
      title: `You're on ${plan.name}`,
      description: `Every effect is unlocked, with ${plan.installsPerDay} installs a day${
        credits ? ` and ${credits} template credit${credits === 1 ? "" : "s"} to spend` : ""
      }.`,
      ...(credits ? { ctaHref: "/templates", ctaLabel: "Use a template credit" } : {}),
    });
  }, [showToast]);

  return <ToastViewport toast={toast} onDismiss={dismissToast} />;
}
