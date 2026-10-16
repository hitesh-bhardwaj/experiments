import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserPlanInfo } from "@/lib/subscription";
import { isAdminUser } from "@/lib/admin";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { isCancelScheduled } from "@/lib/subscription-events";
import { razorpay } from "@/lib/razorpay";

// Payments with no Razorpay invoice to link to (older checkouts, or not found with these
// keys): remembered for this server's lifetime so they aren't looked up on every load
const NO_RECEIPT = new Set();

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, { plan, tier }] = await Promise.all([currentUser(), getUserPlanInfo(userId)]);

  // Admins have no personal billing to review - their Pro-equivalent access
  // (if any) isn't a paid subscription, so there's nothing to list here.
  if (isAdminUser(user)) {
    return NextResponse.json({
      isAdmin: true,
      plan,
      tier,
      subscription: null,
      invoices: [],
      templatePurchases: [],
    });
  }

  const [
    { data: subscriptionRow, error: subscriptionError },
    { data: invoiceRows, error: invoicesError },
    { data: templatePurchaseRows, error: templatePurchaseError },
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "plan,status,billing_interval,current_period_end,razorpay_subscription_id,razorpay_short_url"
      )
      .eq("clerk_user_id", userId)
      .maybeSingle(),

    supabase
      .from("invoices")
      .select(
        "id,amount,currency,status,billing_interval,plan_label,invoice_url,is_test,razorpay_payment_id,created_at"
      )
      .eq("clerk_user_id", userId)
      // Real purchases only - recordInvoice() in @/lib/pro-access marks payments
      // taken with Razorpay test keys (local / preview) as is_test, and the old
      // test-invoice generator's rows are flagged too.
      .eq("is_test", false)
      .order("created_at", { ascending: false }),

    // One-time template purchases - a separate table/checkout flow from
    // subscription invoices above (see lib/template-purchases.js), so this
    // page's "Previous Bills" alone would otherwise never show a template
    // someone bought. Test-mode purchases left out, like test invoices above.
    supabase
      .from("template_purchases")
      .select("id,template_slug,amount,currency,status,invoice_url,razorpay_payment_id,source,created_at")
      .eq("clerk_user_id", userId)
      .eq("is_test", false)
      .order("created_at", { ascending: false }),
  ]);

  if (subscriptionError || invoicesError || templatePurchaseError) {
    console.error(
      "DASHBOARD_INVOICES_ERROR:",
      subscriptionError || invoicesError || templatePurchaseError
    );

    return NextResponse.json(
      { error: "Failed to load invoices" },
      { status: 500 }
    );
  }

  // Paid template purchases recorded before their receipt link was kept: every one was
  // paid through a Razorpay invoice, so the link is looked up once (payment -> invoice)
  // and saved. A failed lookup just leaves it for next time.
  const missingReceipts = (templatePurchaseRows || [])
    .filter((row) => row.razorpay_payment_id && !row.invoice_url && !NO_RECEIPT.has(row.razorpay_payment_id))
    .slice(0, 10);
  await Promise.all(
    missingReceipts.map(async (row) => {
      try {
        const payment = await razorpay.payments.fetch(row.razorpay_payment_id);
        const invoice = payment?.invoice_id ? await razorpay.invoices.fetch(payment.invoice_id) : null;
        if (!invoice?.short_url) {
          NO_RECEIPT.add(row.razorpay_payment_id);
          return;
        }
        row.invoice_url = invoice.short_url;
        await supabase.from("template_purchases").update({ invoice_url: invoice.short_url }).eq("id", row.id);
      } catch (error) {
        // e.g. a payment made with the other key set (test vs live) - not looked up again
        NO_RECEIPT.add(row.razorpay_payment_id);
        console.error("DASHBOARD_RECEIPT_LOOKUP_ERROR:", row.razorpay_payment_id, error?.error?.description || error?.message);
      }
    }),
  );

  const templatePurchases = (templatePurchaseRows || []).map((row) => ({
    id: row.id,
    templateSlug: row.template_slug,
    templateTitle: getTemplateBySlug(row.template_slug)?.title || row.template_slug,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    invoiceUrl: row.invoice_url,
    paymentId: row.razorpay_payment_id,
    // Redeemed with a template credit: no payment, so no amount or receipt
    redeemedWithCredit: row.source === "credit" || !row.razorpay_payment_id,
    createdAt: row.created_at,
  }));

  return NextResponse.json({
    isAdmin: false,
    plan,
    tier,
    subscription: subscriptionRow || null,
    // Cancelled from the dashboard: active until the period ends, then Free
    cancelAtPeriodEnd: isCancelScheduled(user, subscriptionRow?.razorpay_subscription_id),
    invoices: invoiceRows || [],
    templatePurchases,
  });
}
