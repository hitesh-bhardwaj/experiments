import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import { invalidatePlanCache, ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { createSubscriptionInvoiceEmail } from "@/lib/emails/subscription-invoice-email";
import { confirmFoundingSlot } from "@/lib/founding-slots";
import {
  renderProUnlockedEmail,
  proUnlockedSubject,
  proUnlockedText,
} from "@/lib/emails/pro-unlocked-email";

const PLAN_INTERVALS = {
  [process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID]: "monthly",
  [process.env.RAZORPAY_PRO_YEARLY_PLAN_ID]: "yearly",
  [process.env.RAZORPAY_PRO_FOUNDING_YEARLY_PLAN_ID]: "yearly",
  [process.env.RAZORPAY_PRO_MONTHLY_INR_PLAN_ID]: "monthly",
  [process.env.RAZORPAY_PRO_YEARLY_INR_PLAN_ID]: "yearly",
  [process.env.RAZORPAY_PRO_FOUNDING_YEARLY_INR_PLAN_ID]: "yearly",
};

// Separate from PLAN_INTERVALS because founding vs. regular yearly share the
// same "yearly" billing interval but need different copy in the pro-unlocked
// email ("Vault Pro Annual" vs. "Vault Pro Founding Annual").
const PLAN_LABELS = {
  [process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID]: "Vault Pro Monthly",
  [process.env.RAZORPAY_PRO_YEARLY_PLAN_ID]: "Vault Pro Annual",
  [process.env.RAZORPAY_PRO_FOUNDING_YEARLY_PLAN_ID]: "Vault Pro Founding Annual",
  [process.env.RAZORPAY_PRO_MONTHLY_INR_PLAN_ID]: "Vault Pro Monthly",
  [process.env.RAZORPAY_PRO_YEARLY_INR_PLAN_ID]: "Vault Pro Annual",
  [process.env.RAZORPAY_PRO_FOUNDING_YEARLY_INR_PLAN_ID]: "Vault Pro Founding Annual",
};

export function getBillingInterval(planId) {
  return PLAN_INTERVALS[planId] || null;
}

export function getPlanLabel(planId) {
  return PLAN_LABELS[planId] || "Vault Pro";
}

function getPeriodEnd(subscription) {
  return subscription?.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : null;
}

async function updateClerkPlan(clerkUserId, publicMetadataPatch) {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkUserId);

  await client.users.updateUser(clerkUserId, {
    publicMetadata: { ...user.publicMetadata, ...publicMetadataPatch },
  });
}

export async function markUserProFromSubscription({ clerkUserId, subscription }) {
  if (!clerkUserId) {
    throw new Error("Missing clerkUserId in markUserProFromSubscription.");
  }

  if (!subscription?.id) {
    throw new Error("Missing Razorpay subscription in markUserProFromSubscription.");
  }

  const billingInterval = getBillingInterval(subscription.plan_id);
  const currentPeriodEnd = getPeriodEnd(subscription);
  const status = subscription.status || "active";

  const { error } = await supabase.from("subscriptions").upsert(
    {
      clerk_user_id: clerkUserId,
      razorpay_customer_id: subscription.customer_id || null,
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: subscription.plan_id,
      razorpay_short_url: subscription.short_url || null,
      billing_interval: billingInterval,
      plan: "pro",
      status,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_user_id" }
  );

  if (error) {
    console.error("SUPABASE_MARK_PRO_ERROR:", error);
    throw error;
  }

  // Covers both the webhook path and the verify-payment path, since both
  // call this function - the reservation itself is never blocking here,
  // pro access is already granted by the upsert above regardless.
  const foundingReservationId = subscription?.notes?.founding_reservation_id || null;

  if (foundingReservationId) {
    try {
      await confirmFoundingSlot({
        reservationId: foundingReservationId,
        razorpaySubscriptionId: subscription.id,
      });
    } catch (confirmError) {
      console.error("CONFIRM_FOUNDING_SLOT_ERROR:", foundingReservationId, confirmError);
    }
  }

  await updateClerkPlan(clerkUserId, {
    plan: "pro",
    proAccess: true,
    billingInterval,
    subscriptionStatus: status,
    razorpaySubscriptionId: subscription.id,
    razorpayPlanId: subscription.plan_id,
    currentPeriodEnd,
  });

  invalidatePlanCache(clerkUserId);

  return { plan: "pro", status, billingInterval, currentPeriodEnd };
}

export async function markUserFree({ clerkUserId, status = "inactive" }) {
  if (!clerkUserId) {
    throw new Error("Missing clerkUserId in markUserFree.");
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: "free",
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", clerkUserId);

  if (error) {
    console.error("SUPABASE_MARK_FREE_ERROR:", error);
    throw error;
  }

  await updateClerkPlan(clerkUserId, {
    plan: "free",
    proAccess: false,
    billingInterval: null,
    subscriptionStatus: status,
    razorpaySubscriptionId: null,
    razorpayPlanId: null,
    currentPeriodEnd: null,
  });

  invalidatePlanCache(clerkUserId);
}

// Fires once per real charge - called only from the subscription.charged
// webhook (see api/razorpay/webhooks/route.js), never from verify-payment,
// so a renewal never sends two receipts for the same charge.
//
// First payment gets the branded "Vault Pro is now unlocked" welcome email
// (no amount/invoice details, just the unlock moment). Renewals get the
// receipt-style invoice email, since that's the one with amount/invoice link.
export async function sendInvoiceEmail({ clerkUserId, subscription, payment }) {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const email = user?.emailAddresses?.[0]?.emailAddress;

    if (!email) return;

    const isFirstPayment = subscription?.paid_count === 1;

    if (isFirstPayment) {
      const planLabel = getPlanLabel(subscription.plan_id);

      await sendEmail({
        to: email,
        subject: proUnlockedSubject,
        react: renderProUnlockedEmail({ planLabel }),
        text: proUnlockedText({ planLabel }),
        emailType: "pro_unlocked",
      });
      return;
    }

    const emailContent = createSubscriptionInvoiceEmail({
      name: user?.firstName || user?.fullName || "there",
      billingInterval: getBillingInterval(subscription.plan_id),
      amount: payment?.amount,
      currency: payment?.currency,
      paymentId: payment?.id,
      periodEnd: getPeriodEnd(subscription),
      invoiceUrl: subscription?.short_url,
      isFirstPayment: false,
    });

    await sendEmail({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      emailType: "subscription_invoice",
    });
  } catch (error) {
    console.error("SEND_INVOICE_EMAIL_ERROR:", error);
  }
}

// Fires from the same subscription.charged gate as sendInvoiceEmail (see
// api/razorpay/webhooks/route.js) - one row per real charge, including the
// first one, so the Invoicing tab has full billing history even though the
// first-payment email itself is the welcome email rather than a receipt.
// Also called directly from verify-payment/route.js right after checkout,
// racing the webhook for the same payment - whichever arrives first creates
// the row, whichever arrives second must not silently no-op (that's how one
// customer's invoice_url stayed null forever: verify-payment's subscription
// fetch happened to land before Razorpay had generated the subscription's
// short_url yet, and the later webhook's already-populated one was then
// ignored). onConflict without ignoreDuplicates lets the second call update
// the row instead - invoice_url is only included in the payload when this
// call actually has one, so a still-missing short_url never overwrites a
// good value the other call already wrote.
export async function recordInvoice({ clerkUserId, subscription, payment }) {
  if (!clerkUserId || !payment?.id) return;

  const row = {
    clerk_user_id: clerkUserId,
    razorpay_payment_id: payment.id,
    razorpay_subscription_id: subscription?.id || null,
    amount: payment.amount,
    currency: payment.currency || "INR",
    status: "paid",
    billing_interval: getBillingInterval(subscription?.plan_id),
    plan_label: getPlanLabel(subscription?.plan_id),
    is_test: false,
  };

  if (subscription?.short_url) {
    row.invoice_url = subscription.short_url;
  }

  const { error } = await supabase
    .from("invoices")
    .upsert(row, { onConflict: "razorpay_payment_id" });

  if (error) {
    console.error("RECORD_INVOICE_ERROR:", error);
  }
}

export async function countPaidUsers() {
  const { count, error } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan", "pro")
    .in("status", ACTIVE_PRO_STATUSES)
    // Excludes admin-comped/legacy rows with no real Razorpay subscription
    // behind them - only actual paying customers count toward the 100 slots.
    .not("razorpay_subscription_id", "is", null);

  if (error) {
    console.error("COUNT_PAID_USERS_ERROR:", error);
    throw error;
  }

  return count || 0;
}
