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
    },
    { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("RECORD_TEMPLATE_PURCHASE_ERROR:", error);
  }
}

// Used by getTemplateAccessDecision() - true if this user already owns a
// standalone purchase of this specific template.
export async function hasTemplatePurchase(clerkUserId, templateSlug) {
  const { data, error } = await supabase
    .from("template_purchases")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .eq("template_slug", templateSlug)
    .maybeSingle();

  if (error) {
    console.error("TEMPLATE_PURCHASE_LOOKUP_ERROR:", error);
    return false;
  }

  return Boolean(data);
}
