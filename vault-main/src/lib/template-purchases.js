import "server-only";
import { supabase } from "@/lib/supabase";

// Records a one-time template purchase (Razorpay Orders API, not
// Subscriptions - see api/razorpay/create-order and verify-payment).
// onConflict + ignoreDuplicates mirrors recordInvoice()'s pattern in
// pro-access.js - safe against a client retrying verify-payment for the
// same payment_id.
export async function recordTemplatePurchase({
  clerkUserId,
  templateSlug,
  razorpayPaymentId,
  razorpayOrderId,
  amount,
  currency = "USD",
  invoiceUrl,
}) {
  if (!clerkUserId || !templateSlug || !razorpayPaymentId) return;

  const { error } = await supabase.from("template_purchases").upsert(
    {
      clerk_user_id: clerkUserId,
      template_slug: templateSlug,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId || null,
      amount: amount ?? null,
      currency,
      status: "paid",
      invoice_url: invoiceUrl || null,
      // Taken with Razorpay test keys (local / preview): kept for testing access,
      // left out of every revenue and sales number - same rule as invoices
      is_test: (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_"),
    },
    { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("RECORD_TEMPLATE_PURCHASE_ERROR:", error);
  }
}

// Used by getTemplateAccessDecision() - true if this user owns this
// template: bought it, or redeemed a template credit on it. Paid rows only,
// so a purchase markTemplatePurchaseRefunded() flipped to "refunded" stops
// granting access.
export async function hasTemplatePurchase(clerkUserId, templateSlug) {
  const { data, error } = await supabase
    .from("template_purchases")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("template_slug", templateSlug)
    .eq("status", "paid")
    // A template can be both bought and redeemed with a credit - any row
    // means owned, and maybeSingle() would error on two.
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("TEMPLATE_PURCHASE_LOOKUP_ERROR:", error);
    return false;
  }

  return Boolean(data);
}

// Called from the refund webhook branch - flips this purchase's status so
// hasTemplatePurchase() above stops granting access. Matched by
// razorpay_payment_id (recordTemplatePurchase()'s natural key), since that's
// all the refund payload reliably carries.
export async function markTemplatePurchaseRefunded(razorpayPaymentId) {
  if (!razorpayPaymentId) return;

  const { error } = await supabase
    .from("template_purchases")
    .update({ status: "refunded" })
    .eq("razorpay_payment_id", razorpayPaymentId);

  if (error) {
    console.error("MARK_TEMPLATE_PURCHASE_REFUNDED_ERROR:", error);
    throw error;
  }
}
