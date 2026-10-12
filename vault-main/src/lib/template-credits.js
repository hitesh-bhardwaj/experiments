import "server-only";
import { supabase } from "@/lib/supabase";
import { getCreditsForCharge } from "@/lib/plans";
import { describeRazorpayPlan } from "@/lib/plans.server";

// Template credits: a ledger in template_credits (see sql/pro_plus_plans.sql),
// +N when a subscription charge earns credits, -1 per template redeemed.

// Adds the credits one subscription charge earns, per the plan's rule in
// plans.js (e.g. quarterly Pro: 1 credit on charges 1, 5, 9...). Called from
// both the subscription.charged webhook and verify-payment - whichever lands
// second is a no-op, since a payment ID can only add credits once.
// Legacy plans earn no credits; they keep annual-plan template access instead.
export async function grantCreditsForCharge({ clerkUserId, subscription, payment }) {
  if (!clerkUserId || !payment?.id) return 0;

  const plan = describeRazorpayPlan(subscription?.plan_id);
  if (!plan || plan.legacy) return 0;

  const credits = getCreditsForCharge(plan.tier, plan.interval, subscription?.paid_count);
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
