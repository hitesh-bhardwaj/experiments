import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertSuperAdmin } from "@/lib/admin";

// invoices.amount is in the smallest currency unit (paise for INR, matching
// the /dashboard/invoicing formatAmount() convention) - only real, captured
// charges get a row (see recordInvoice() in lib/pro-access.js), so summing
// status:"paid" is the actual revenue rather than an estimate. is_test rows
// come from Razorpay test-mode payments and are excluded everywhere.
function sumAmount(rows) {
  return rows.reduce((total, row) => total + (row.amount || 0), 0);
}

export async function GET() {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      { data: allInvoices, error: invoicesError },
      { data: activeSubscriptions, error: subscriptionsError },
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("amount, currency, created_at")
        .eq("status", "paid")
        .eq("is_test", false),
      supabase
        .from("subscriptions")
        .select("billing_interval")
        .eq("plan", "pro")
        .eq("status", "active"),
    ]);

    if (invoicesError || subscriptionsError) {
      console.error("ADMIN_REVENUE_OVERVIEW_ERROR:", invoicesError || subscriptionsError);
      return NextResponse.json(
        { error: (invoicesError || subscriptionsError).message },
        { status: 500 }
      );
    }

    const invoices = allInvoices || [];
    const subscriptions = activeSubscriptions || [];

    const revenueThisMonth = sumAmount(
      invoices.filter((inv) => new Date(inv.created_at) >= startOfMonth)
    );
    const revenueLast30Days = sumAmount(
      invoices.filter((inv) => new Date(inv.created_at) >= last30Days)
    );

    const monthlySubscribers = subscriptions.filter((s) => s.billing_interval === "monthly").length;
    const yearlySubscribers = subscriptions.filter((s) => s.billing_interval === "yearly").length;

    return NextResponse.json({
      currency: invoices[0]?.currency || "INR",
      totalRevenue: sumAmount(invoices),
      revenueThisMonth,
      revenueLast30Days,
      activeProCount: subscriptions.length,
      monthlySubscribers,
      yearlySubscribers,
      totalInvoices: invoices.length,
    });
  } catch (error) {
    console.error("ADMIN_REVENUE_OVERVIEW_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
