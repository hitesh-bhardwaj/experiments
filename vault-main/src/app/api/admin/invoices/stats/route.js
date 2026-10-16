import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertSuperAdmin } from "@/lib/admin";
import { compareStat, comparisonWindows, resolveDateBounds } from "@/lib/admin-activity";
import { fetchAllRows, filterToAudience, getAudience, parseAudience } from "@/lib/admin-data";

// The admin Invoicing tab's stat cards, for one audience and window: revenue in USD and in
// INR (each currency on its own - they're never added together; subscriptions and template
// sales both counted), paid subscriptions and template sales. Each card (lib/admin-activity
// compareStat): the window's total, its change against the window before (all time: last
// 30 days against the 30 before) and its line. The same rows as the ledger: real payments
// only (no test-mode rows), template sales without credit redemptions. Super admins only.
export async function GET(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";
    const { startISO, endISO } = resolveDateBounds({ range, from: searchParams.get("from"), to: searchParams.get("to") });
    const audience = await getAudience(parseAudience(searchParams));

    const windows = comparisonWindows({ startISO, endISO, range });
    const fetchFromISO = startISO ? new Date(windows.previous[0]).toISOString() : null;
    const startMs = startISO ? new Date(startISO).getTime() : -Infinity;
    const endMs = endISO ? new Date(endISO).getTime() : Infinity;
    const inWindow = (at) => at >= startMs && at < endMs;

    const scoped = (table, columns, extra = (q) => q) =>
      fetchAllRows(() => {
        let q = filterToAudience(extra(supabase.from(table).select(columns).eq("is_test", false)), audience);
        if (fetchFromISO) q = q.gte("created_at", fetchFromISO);
        if (endISO) q = q.lt("created_at", endISO);
        return q;
      });

    const [invoices, templateSales] = await Promise.all([
      scoped("invoices", "amount, currency, created_at"),
      scoped("template_purchases", "amount, currency, created_at", (q) => q.eq("status", "paid").or("source.is.null,source.neq.credit")),
    ]);

    const at = (row) => new Date(row.created_at).getTime();
    // Money items: invoices are in the smallest unit (cents / paise), template sales in whole units
    const money = [
      ...invoices.map((row) => ({ at: at(row), currency: row.currency || "INR", value: (row.amount || 0) / 100, kind: "subscriptions" })),
      ...templateSales.filter((row) => typeof row.amount === "number").map((row) => ({ at: at(row), currency: row.currency || "USD", value: row.amount, kind: "templates" })),
    ];

    const earliest = (items) => (items.length ? Math.min(...items.map((item) => item.at)) : windows.current[0]);
    const card = (items) => compareStat(items, windows, { inWindow, seriesStartMs: startISO ? startMs : earliest(items) });
    const revenue = (currency) => {
      const items = money.filter((item) => item.currency === currency);
      const split = (kind) => items.filter((item) => item.kind === kind && inWindow(item.at)).reduce((sum, item) => sum + item.value, 0);
      return { ...card(items), currency, subscriptions: split("subscriptions"), templates: split("templates") };
    };

    return NextResponse.json({
      range,
      kpis: {
        comparison: windows.label,
        usd: revenue("USD"),
        inr: revenue("INR"),
        subscriptions: card(invoices.map((row) => ({ at: at(row) }))),
        templateSales: card(templateSales.map((row) => ({ at: at(row) }))),
      },
    });
  } catch (error) {
    console.error("ADMIN_INVOICES_STATS_ERROR:", error);
    return NextResponse.json({ error: "Failed to load revenue" }, { status: 500 });
  }
}
