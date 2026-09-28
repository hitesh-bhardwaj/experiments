import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { assertSuperAdmin } from "@/lib/admin";
import { getTemplateBySlug } from "@/lib/mock-templates";
import { resolveDateBounds } from "@/lib/admin-activity";

// Sibling to api/admin/invoices/route.js - same super-admin gate, same
// Clerk-enrichment pattern - but for one-time template purchases
// (template_purchases, written by recordTemplatePurchase() in
// lib/template-purchases.js) rather than Pro subscription invoices.
//
// template_purchases.amount is stored in whole currency units already
// (verify-payment/route.js divides Razorpay's paise/cents amount by 100
// before calling recordTemplatePurchase), unlike invoices.amount which is
// the raw Razorpay amount - callers must not divide this by 100 again.
//
// No is_test column on this table (template purchases don't have an
// admin-seeded "sample invoice" concept the way subscription invoices do -
// see api/dashboard/invoices/test/route.js), so there's no real/test filter
// here, only an optional template slug filter.

export async function GET(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const templateFilter = searchParams.get("template") || "all";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    // range/from/to are all optional - omitted entirely by
    // dashboard/admin/invoicing (which wants "every purchase, ever"),
    // passed by dashboard/admin/activity's TemplatePurchasesPanel so this
    // table stays in step with that page's date-range picker instead of
    // always showing all-time totals regardless of what's selected.
    const { startISO, endISO } = resolveDateBounds({
      range: searchParams.get("range"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    function scoped(q) {
      let query = q;
      if (startISO) query = query.gte("created_at", startISO);
      if (endISO) query = query.lt("created_at", endISO);
      return query;
    }

    let query = scoped(
      supabase
        .from("template_purchases")
        .select(
          "id,clerk_user_id,template_slug,razorpay_payment_id,amount,currency,status,invoice_url,created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
    );

    if (templateFilter !== "all") query = query.eq("template_slug", templateFilter);

    const [{ data: pageRows, error: pageError, count }, { data: allRows, error: statsError }] =
      await Promise.all([
        query.range(offset, offset + limit - 1),
        // Stats always reflect every purchase in the same window,
        // independent of the current page/template filter, so the top-line
        // numbers don't shift while paging.
        scoped(supabase.from("template_purchases").select("amount, currency")),
      ]);

    if (pageError || statsError) {
      console.error("ADMIN_TEMPLATE_PURCHASES_ERROR:", pageError || statsError);
      return NextResponse.json({ error: (pageError || statsError).message }, { status: 500 });
    }

    const rows = pageRows || [];
    const clerkUserIds = [...new Set(rows.map((r) => r.clerk_user_id).filter(Boolean))];
    let clerkMap = {};
    if (clerkUserIds.length > 0) {
      const clerk = await clerkClient();
      const results = await clerk.users.getUserList({
        userId: clerkUserIds,
        limit: clerkUserIds.length,
      });
      clerkMap = Object.fromEntries((results.data || []).map((u) => [u.id, u]));
    }

    const purchases = rows.map((row) => {
      const clerkUser = row.clerk_user_id ? clerkMap[row.clerk_user_id] : null;
      const template = getTemplateBySlug(row.template_slug);

      return {
        id: row.id,
        userId: row.clerk_user_id,
        userName: clerkUser?.fullName || clerkUser?.firstName || null,
        userEmail: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
        userImageUrl: clerkUser?.imageUrl || null,
        templateSlug: row.template_slug,
        templateTitle: template?.title || row.template_slug,
        paymentId: row.razorpay_payment_id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        invoiceUrl: row.invoice_url,
        createdAt: row.created_at,
      };
    });

    // Grouped by currency, never summed across them (template_purchases
    // mixes USD and INR - see create-order/route.js's currency handling -
    // so a single blended total would add unlike units, same reasoning
    // activity/overview/route.js already documents for this same table).
    const revenueByCurrency = {};
    for (const row of allRows || []) {
      const currency = row.currency || "USD";
      revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + (row.amount || 0);
    }

    return NextResponse.json({
      purchases,
      total: count || 0,
      stats: {
        totalPurchases: (allRows || []).length,
        revenueByCurrency: Object.entries(revenueByCurrency).map(([currency, amount]) => ({
          currency,
          amount,
        })),
      },
    });
  } catch (error) {
    console.error("ADMIN_TEMPLATE_PURCHASES_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
