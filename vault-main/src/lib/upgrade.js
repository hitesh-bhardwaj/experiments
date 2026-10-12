import "server-only";
import { supabase } from "@/lib/supabase";
import { razorpay } from "@/lib/razorpay";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { isValidTier } from "@/lib/plans";
import { describeRazorpayPlan, getRazorpayPlanId } from "@/lib/plans.server";

// Pro -> Pro+ upgrades, prorated. The unused part of the current Pro period
// is credited against Pro+:
//
//   credit    = Pro price x (days left in the Pro period / days in it)
//   pay today = Pro+ price - credit
//
// Pro+ starts today and runs a full quarter or year from today: the new
// Razorpay subscription is created with start_at one period from now (its
// first full charge) and "pay today" as an upfront addon, which Razorpay
// collects with the authorisation payment. The old Pro subscription is then
// cancelled (see subscription-events.js). All amounts are in the currency's
// smallest unit (cents / paise), as Razorpay stores them.

const DAY = 24 * 60 * 60;
// Razorpay won't take a payment below 1 unit (₹1 / $1)
const MIN_CHARGE = 100;

// The same calendar day one quarter or one year after `fromSeconds`
export function addPeriod(fromSeconds, interval) {
  const date = new Date(fromSeconds * 1000);
  if (interval === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
  else date.setUTCMonth(date.getUTCMonth() + 3);
  return Math.floor(date.getTime() / 1000);
}

export function computeUpgradeCharge({ oldAmount, periodStart, periodEnd, newAmount, now }) {
  const total = Math.max(periodEnd - periodStart, 1);
  const remaining = Math.min(Math.max(periodEnd - now, 0), total);
  const credit = Math.floor((oldAmount * remaining) / total);
  return {
    credit,
    charge: Math.max(newAmount - credit, MIN_CHARGE),
    daysLeft: Math.round(remaining / DAY),
  };
}

// Which upgrades are offered: Pro -> Pro+ only, and never to a shorter
// billing period (Pro yearly -> Pro+ quarterly would leave Pro credit unused)
export function isUpgradeAllowed({ fromTier, fromInterval, toTier, toInterval }) {
  if (fromTier !== "pro" || toTier !== "pro_plus") return false;
  return !(fromInterval === "yearly" && toInterval === "quarterly");
}

/**
 * Everything needed to price and start a Pro -> Pro+ upgrade for this user,
 * or { eligible: false, reason } when there's nothing to upgrade.
 * The currency is always the current subscription's: Razorpay can't apply a
 * credit across currencies.
 */
export async function getUpgradeQuote({ clerkUserId, tier, interval, now = Math.floor(Date.now() / 1000) }) {
  const { data: row, error } = await supabase
    .from("subscriptions")
    .select("plan, tier, status, billing_interval, current_period_end, razorpay_subscription_id, razorpay_plan_id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) throw error;

  const live =
    row?.razorpay_subscription_id &&
    row.plan === "pro" &&
    ACTIVE_PRO_STATUSES.includes(row.status) &&
    (!row.current_period_end || new Date(row.current_period_end).getTime() > now * 1000);
  if (!live) return { eligible: false, reason: "no-subscription" };

  const fromTier = isValidTier(row.tier) ? row.tier : "pro_plus";
  const oldPlan = describeRazorpayPlan(row.razorpay_plan_id);
  const fromInterval = oldPlan?.interval || row.billing_interval;
  if (!isUpgradeAllowed({ fromTier, fromInterval, toTier: tier, toInterval: interval })) {
    return { eligible: false, reason: fromTier === "pro" ? "interval-not-allowed" : "not-an-upgrade" };
  }

  const currency = oldPlan?.currency || "USD";
  const newPlanId = getRazorpayPlanId(tier, interval, currency);
  if (!newPlanId) return { eligible: false, reason: "plan-not-configured" };

  const [oldSubscription, oldPlanEntity, newPlanEntity] = await Promise.all([
    razorpay.subscriptions.fetch(row.razorpay_subscription_id),
    razorpay.plans.fetch(row.razorpay_plan_id),
    razorpay.plans.fetch(newPlanId),
  ]);

  // The paid period, from Razorpay; falls back to our stored end date
  const periodEnd =
    oldSubscription?.current_end ||
    (row.current_period_end ? Math.floor(new Date(row.current_period_end).getTime() / 1000) : now);
  const periodStart = oldSubscription?.current_start || periodEnd - (addPeriod(periodEnd, fromInterval) - periodEnd);

  const fullPrice = newPlanEntity.item.amount;
  const { credit, charge, daysLeft } = computeUpgradeCharge({
    oldAmount: oldPlanEntity.item.amount,
    periodStart,
    periodEnd,
    newAmount: fullPrice,
    now,
  });

  return {
    eligible: true,
    currency,
    fullPrice,
    credit,
    charge,
    daysLeft,
    newPlanId,
    replacesSubscriptionId: row.razorpay_subscription_id,
    // Pro+ is paid up to here; its first full charge happens on this date
    renewsAt: addPeriod(now, interval),
  };
}
