import "server-only";
import { supabase } from "@/lib/supabase";
import { hasTemplatePurchase } from "@/lib/template-purchases";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { isValidTier } from "@/lib/plans";

// Sibling to effect-access.js's getEffectAccessDecision() - same
// decision()/reason-string shape, same active/expired/revoked logic - but
// templates aren't CLI-installable (no cliToken branch), and access can
// additionally come from a standalone one-time purchase of this specific
// template rather than only an active Pro subscription. See
// md/template-download-purchase-plan.md.

export const POLICY_VERSION = "2";

function decision(reason, allowed = false) {
  return { allowed, reason, policyVersion: POLICY_VERSION, source: "supabase" };
}

// Same subscription-row shape effect-access.js's evaluateSubscriptionRow()
// checks, plus billing_interval and tier. Only subscribers from before Pro
// and Pro+ (no tier on their row) on a yearly plan get templates included -
// Pro and Pro+ subscribers own a template by buying it or redeeming one of
// their template credits, which both land in template_purchases.
function evaluateAnnualProRow(row, includedInAnnualPro) {
  if (!includedInAnnualPro) return decision("not-included-in-annual-pro");
  if (!row) return decision("no-subscription");

  if (row.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(row.status)) {
    return decision("no-subscription");
  }

  if (row.current_period_end) {
    const periodEnd = new Date(row.current_period_end).getTime();

    if (!Number.isNaN(periodEnd) && periodEnd <= Date.now()) {
      return decision("expired");
    }
  }

  if (isValidTier(row.tier)) {
    return decision("credit-or-purchase-required");
  }

  if (row.billing_interval !== "yearly") {
    return decision("monthly-pro-not-included");
  }

  return decision("annual-pro-included", true);
}

/**
 * Decide whether a request may download a template's project zip.
 *
 * Two independent paths grant access, checked in this order:
 *   1. An active ANNUAL subscription from before Pro and Pro+ (no tier on
 *      the row), when the template itself is marked `includedInAnnualPro`.
 *   2. A row in template_purchases for this template slug, regardless of
 *      plan - a one-time Razorpay purchase (api/razorpay/create-order and
 *      verify-payment) or a redeemed template credit
 *      (api/templates/[slug]/redeem).
 *
 * No CLI-token branch: templates aren't CLI-installable (only a browser
 * download route exists), so this only ever resolves by Clerk session.
 */
export async function getTemplateAccessDecision({
  clerkUserId,
  templateSlug,
  includedInAnnualPro = false,
}) {
  if (!clerkUserId) {
    return decision("anonymous");
  }

  const { data: subscriptionRow, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan, tier, status, current_period_end, billing_interval")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (subscriptionError) {
    console.error("TEMPLATE_ACCESS_SUPABASE_ERROR:", subscriptionError);
    return decision("error");
  }

  const annualProDecision = evaluateAnnualProRow(subscriptionRow, includedInAnnualPro);
  if (annualProDecision.allowed) return annualProDecision;

  const purchased = await hasTemplatePurchase(clerkUserId, templateSlug);
  if (purchased) return decision("standalone-purchase", true);

  return annualProDecision;
}
