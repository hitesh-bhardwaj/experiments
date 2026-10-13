import { PLANS } from "@/lib/plans";

// The "daily install limit reached" message, everywhere it shows (effect
// page code blocks and Get code menu, effects listing): the next plan up, or
// for Pro+ - already the highest limit - just "come back tomorrow".
//   usage: { plan: "free" | "pro", tier: "free" | "pro" | "pro_plus", isAdmin }
export function getLimitNudge(usage) {
  const tier = usage?.plan === "pro" ? usage?.tier || "pro_plus" : "free";
  if (usage?.isAdmin || tier === "pro_plus") {
    return {
      title: "Daily install limit reached",
      description: `Pro+ includes ${PLANS.pro_plus.installsPerDay} installs a day. Come back tomorrow for more.`,
      ctaHref: null,
      ctaLabel: null,
    };
  }
  if (tier === "pro") {
    return {
      title: "Daily install limit reached",
      description: `Pro includes ${PLANS.pro.installsPerDay} installs a day. Upgrade to Pro+ for ${PLANS.pro_plus.installsPerDay}, or come back tomorrow.`,
      ctaHref: "/pricing#plans",
      ctaLabel: "Upgrade to Pro+",
    };
  }
  return {
    title: "Daily install limit reached",
    description: `Free accounts get 3 installs a day. Upgrade to Pro for ${PLANS.pro.installsPerDay}, or come back tomorrow.`,
    ctaHref: "/pricing#plans",
    ctaLabel: "Upgrade to Pro",
  };
}
