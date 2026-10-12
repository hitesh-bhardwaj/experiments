import "server-only";
import { getPlanLabel } from "@/lib/plans";

// Razorpay plan ID <-> { tier, interval, currency }. Read at call time, not
// module load, so tests can set process.env per case.
//
// The current plans are named RAZORPAY_PLAN_<PRO|PLUS>_<QUARTERLY|YEARLY>_<USD|INR>.
// Quarterly plans are Razorpay plans with period "monthly" and interval 3.
// Legacy plans ($20 monthly, $179 yearly, Founding Annual and their INR
// twins) stay mapped so existing subscribers keep working: they count as
// Pro+ (the closest match to what they pay) and keep their price.
function newPlanEnv() {
  return [
    { tier: "pro", interval: "quarterly", currency: "USD", env: "RAZORPAY_PLAN_PRO_QUARTERLY_USD" },
    { tier: "pro", interval: "quarterly", currency: "INR", env: "RAZORPAY_PLAN_PRO_QUARTERLY_INR" },
    { tier: "pro", interval: "yearly", currency: "USD", env: "RAZORPAY_PLAN_PRO_YEARLY_USD" },
    { tier: "pro", interval: "yearly", currency: "INR", env: "RAZORPAY_PLAN_PRO_YEARLY_INR" },
    { tier: "pro_plus", interval: "quarterly", currency: "USD", env: "RAZORPAY_PLAN_PLUS_QUARTERLY_USD" },
    { tier: "pro_plus", interval: "quarterly", currency: "INR", env: "RAZORPAY_PLAN_PLUS_QUARTERLY_INR" },
    { tier: "pro_plus", interval: "yearly", currency: "USD", env: "RAZORPAY_PLAN_PLUS_YEARLY_USD" },
    { tier: "pro_plus", interval: "yearly", currency: "INR", env: "RAZORPAY_PLAN_PLUS_YEARLY_INR" },
  ];
}

function legacyPlanEnv() {
  return [
    { interval: "monthly", currency: "USD", env: "RAZORPAY_PRO_MONTHLY_PLAN_ID", label: "Vault Pro Monthly" },
    { interval: "yearly", currency: "USD", env: "RAZORPAY_PRO_YEARLY_PLAN_ID", label: "Vault Pro Annual" },
    { interval: "yearly", currency: "USD", env: "RAZORPAY_PRO_FOUNDING_YEARLY_PLAN_ID", label: "Vault Pro Founding Annual" },
    { interval: "monthly", currency: "INR", env: "RAZORPAY_PRO_MONTHLY_INR_PLAN_ID", label: "Vault Pro Monthly" },
    { interval: "yearly", currency: "INR", env: "RAZORPAY_PRO_YEARLY_INR_PLAN_ID", label: "Vault Pro Annual" },
    { interval: "yearly", currency: "INR", env: "RAZORPAY_PRO_FOUNDING_YEARLY_INR_PLAN_ID", label: "Vault Pro Founding Annual" },
  ];
}

// The Razorpay plan ID to subscribe a new customer to, or null if that
// plan isn't configured in env
export function getRazorpayPlanId(tier, interval, currency) {
  const row = newPlanEnv().find(
    (p) => p.tier === tier && p.interval === interval && p.currency === currency
  );
  return (row && process.env[row.env]) || null;
}

// { tier, interval, currency, label, legacy } for a Razorpay plan ID, or
// null for an unknown one
export function describeRazorpayPlan(planId) {
  if (!planId) return null;

  const current = newPlanEnv().find((p) => process.env[p.env] === planId);
  if (current) {
    return {
      tier: current.tier,
      interval: current.interval,
      currency: current.currency,
      label: getPlanLabel(current.tier, current.interval),
      legacy: false,
    };
  }

  const legacy = legacyPlanEnv().find((p) => process.env[p.env] === planId);
  if (legacy) {
    return {
      tier: "pro_plus",
      interval: legacy.interval,
      currency: legacy.currency,
      label: legacy.label,
      legacy: true,
    };
  }

  return null;
}
