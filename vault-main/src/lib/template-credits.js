import "server-only";
import { supabase } from "@/lib/supabase";
import { getCreditsForCharge } from "@/lib/plans";
import { describeRazorpayPlan } from "@/lib/plans.server";

// Template credits: a ledger in template_credits (see sql/pro_plus_plans.sql),
// +N when a subscription charge earns credits, -1 per template redeemed.

// Credits the subscription an upgrade replaced already added for its current
// period (its latest grant) - the upgrade tops up to the new plan's amount
// instead of adding the full amount again.
async function getReplacedPeriodGrant(oldSubscriptionId) {
  const { data, error } = await supabase
    .from("template_credits")
    .select("delta")
    .eq("razorpay_subscription_id", oldSubscriptionId)
    .eq("reason", "grant")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.delta || 0;
}

// Adds the credits one subscription charge earns, per the plan's rule in
// plans.js (e.g. yearly Pro: 3 per charge, quarterly Pro: none). Called from
// both the subscription.charged webhook and verify-payment - whichever lands
// second is a no-op, since a payment ID can only add credits once.
// `isUpgradePayment`: the upfront payment of an upgrade (lib/upgrade.js),
// which tops up to the new plan's credits: Pro yearly (3) -> Pro+ yearly adds
// 2, for 5 this year. Later renewals of the upgrade add the full amount.
// Legacy plans earn no credits; they keep annual-plan template access instead.
export async function grantCreditsForCharge({ clerkUserId, subscription, payment, isUpgradePayment = false }) {
  if (!clerkUserId || !payment?.id) return 0;

  const plan = describeRazorpayPlan(subscription?.plan_id);
  if (!plan || plan.legacy) return 0;

  let credits = getCreditsForCharge(plan.tier, plan.interval, subscription?.paid_count);
  const replacedId = subscription?.notes?.replaces_subscription_id;
  if (isUpgradePayment && replacedId && credits > 0) {
    credits = Math.max(credits - (await getReplacedPeriodGrant(replacedId)), 0);
  }
  if (credits < 1) return 0;

  const { error } = await supabase.from("template_credits").upsert(
    {
      clerk_user_id: clerkUserId,
      delta: credits,
      reason: "grant",
      razorpay_payment_id: payment.id,
      razorpay_subscription_id: subscription?.id || null,
    },
    { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("GRANT_TEMPLATE_CREDITS_ERROR:", error);
    throw error;
  }

  return credits;
}

export async function getCreditBalance(clerkUserId) {
  if (!clerkUserId) return 0;

  const { data, error } = await supabase
    .from("template_credits")
    .select("delta")
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    console.error("TEMPLATE_CREDIT_BALANCE_ERROR:", error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.delta || 0), 0);
}

// { status: "redeemed" | "already-owned" | "no-credits" | "error", balance }
export async function redeemTemplateCredit({ clerkUserId, templateSlug }) {
  const { data, error } = await supabase.rpc("redeem_template_credit", {
    p_clerk_user_id: clerkUserId,
    p_template_slug: templateSlug,
  });

  if (error) {
    console.error("REDEEM_TEMPLATE_CREDIT_ERROR:", error);
    return { status: "error", balance: null };
  }

  const row = data?.[0];
  return row ? { status: row.status, balance: row.balance } : { status: "error", balance: null };
}

// Clears the balance when a plan ends (cancelled, halted, expired, or an
// admin moving the user to Free): credits only last while a plan is active.
// Templates already redeemed stay owned. Returns the credits removed.
export async function expireCredits(clerkUserId) {
  if (!clerkUserId) return 0;

  const balance = await getCreditBalance(clerkUserId);
  if (balance <= 0) return 0;

  const { error } = await supabase
    .from("template_credits")
    .insert({ clerk_user_id: clerkUserId, delta: -balance, reason: "adjust" });

  if (error) {
    console.error("EXPIRE_TEMPLATE_CREDITS_ERROR:", error);
    return 0;
  }

  return balance;
}
