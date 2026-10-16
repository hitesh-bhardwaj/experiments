import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { buildDailyBucketsForRange, compareStat, comparisonWindows, fillDailyBuckets, resolveDateBounds } from "@/lib/admin-activity";
import { TEMPLATES } from "@/lib/mock-templates";
import { INSTALL_SOURCES, currentPlanOf, fetchAllRows, fetchInstalls, getAudience, parseAudience } from "@/lib/admin-data";

const TOP_TEMPLATES_LIMIT = 10;

const TOP_EFFECTS_LIMIT = 10;

function topSlugCounts(rows, limit) {
  const counts = new Map();

  for (const row of rows) {
    if (!row.effect_slug) continue;
    counts.set(row.effect_slug, (counts.get(row.effect_slug) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug, count]) => ({ slug, count }));
}

export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const { startISO, endISO, startDateString, endDateString } = resolveDateBounds({
      range,
      from,
      to,
    });

    const audience = await getAudience(parseAudience(searchParams));
    const mine = (rows) => rows.filter((row) => audience.includes(row.clerk_user_id));

    // The stat cards compare the window with the one before it, so rows are read from
    // the start of that earlier window (everything for all time) and split here
    const windows = comparisonWindows({ startISO, endISO, range });
    const fetchFromISO = startISO ? new Date(windows.previous[0]).toISOString() : null;
    const startMs = startISO ? new Date(startISO).getTime() : -Infinity;
    const endMs = endISO ? new Date(endISO).getTime() : Infinity;
    const inWindow = (time) => time >= startMs && time < endMs;
    const timeOf = (value) => new Date(value).getTime();

    // Every row from fetchFromISO on (not the first 1000), for this audience
    function scoped(table, columns, column = "created_at", extra = (q) => q) {
      return fetchAllRows(() => {
        let q = extra(supabase.from(table).select(columns));
        if (fetchFromISO) q = q.gte(column, fetchFromISO);
        if (endISO) q = q.lt(column, endISO);
        return q;
      }).then(mine);
    }

    const [
      subscriptionRows,
      installRows,
      savedRowsAll,
      savedTemplateRowsAll,
      revenueRowsAll,
      templatePurchaseRowsAll,
      viewRowsAll,
      sanityEntries,
    ] = await Promise.all([
      fetchAllRows(() => supabase.from("subscriptions").select("clerk_user_id, plan, tier, status, current_period_end")),
      // Installs: one effect, one account, one day - web, CLI or MCP (lib/admin-data)
      fetchInstalls({ startISO: fetchFromISO, endISO, audience }),
      scoped("wishlisted_effects", "clerk_user_id, effect_slug, created_at"),
      scoped("wishlisted_templates", "clerk_user_id, template_slug, created_at"),
      // Real payments only: test-mode invoices are left out
      scoped("invoices", "clerk_user_id, amount, currency, created_at", "created_at", (q) => q.eq("status", "paid").eq("is_test", false)),
      scoped("template_purchases", "clerk_user_id, created_at, template_slug, status, source, amount, currency", "created_at", (q) => q.eq("is_test", false)),
      // Template views, by viewer identity (user:<id> or ip:<hash>)
      fetchAllRows(() => {
        let q = supabase.from("template_views").select("template_slug, identity_key, created_at").in("template_slug", TEMPLATES.map((template) => template.slug));
        if (fetchFromISO) q = q.gte("created_at", fetchFromISO);
        if (endISO) q = q.lt("created_at", endISO);
        return q;
      }).then((rows) => rows.filter((row) => audience.includesIdentity(row.identity_key))),
      getAllSanityEffectEntries(),
    ]);

    // The selected window's rows, for everything that isn't a comparison
    const within = (rows, column = "created_at") => rows.filter((row) => inWindow(timeOf(row[column])));
    const windowInstalls = installRows.filter((row) => inWindow(timeOf(row.at)));
    const savedRows = within(savedRowsAll);
    const savedTemplateRows = within(savedTemplateRowsAll);
    const revenueRows = within(revenueRowsAll);
    const templatePurchaseRows = within(templatePurchaseRowsAll);
    const viewRows = within(viewRowsAll);
    const allSavedRows = savedRows;

    // People: real accounts (Clerk), not subscriptions rows (which outlive deleted accounts)
    const signupRows = audience.users
      .filter((user) => inWindow(user.createdAt))
      .map((user) => ({ created_at: new Date(user.createdAt).toISOString() }));

    // Plans right now (not just this window's signups): Pro / Pro+ only while
    // the paid or granted period is live
    const planById = new Map(subscriptionRows.map((row) => [row.clerk_user_id, currentPlanOf(row)]));
    const planCounts = { pro: 0, pro_plus: 0, free: 0 };
    for (const user of audience.users) planCounts[planById.get(user.id) || "free"] += 1;
    const proUsers = audience.users.filter(
      (user) => inWindow(user.createdAt) && (planById.get(user.id) || "free") !== "free"
    ).length;

    // One Sanity call, reused for both top-saved and top-copied title lookups
    // (mirrors the pattern in /api/dashboard/usage/route.js).
    const sanityEffectsBySlug = new Map(
      buildEffectsFromSanity(sanityEntries).map((effect) => [effect.name, effect])
    );

    // Full effect summary (not just a title) - the "Top saved/copied
    // effects" sliders render an actual effect card, so they need a cover
    // image, tier badge, and a real route, not just a display name. Sanity
    // is preferred (its coverImage/tier are what the live site itself
    // renders), falling back to the registry entry for effects with no
    // Sanity content yet.
    function resolveEffectSummary(slug) {
      const sanityEntry = sanityEffectsBySlug.get(slug);
      const registryEntry = getEffectMetadata(slug);

      return {
        slug,
        name: slug,
        title: sanityEntry?.title || registryEntry?.title || slug,
        coverImage: sanityEntry?.coverImage || registryEntry?.coverImage || slug,
        videoUrl: sanityEntry?.videoUrl || registryEntry?.videoUrl || null,
        tier: sanityEntry?.tier || registryEntry?.tier || "free",
        categorySlug: sanityEntry?.categorySlug || registryEntry?.categories?.[0] || null,
      };
    }

    const signupTrend = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      signupRows || [],
      (row) => new Date(row.created_at).toISOString().slice(0, 10)
    );

    // Split the same way as revenueByCurrency below, and for the same
    // reason - one blended line would silently add INR and USD amounts.
    const revenueTrendINR = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      (revenueRows || []).filter((row) => (row.currency || "INR") === "INR"),
      (row) => new Date(row.created_at).toISOString().slice(0, 10),
      (row) => row.amount / 100
    );

    const revenueTrendUSD = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      (revenueRows || []).filter((row) => row.currency === "USD"),
      (row) => new Date(row.created_at).toISOString().slice(0, 10),
      (row) => row.amount / 100
    );

    // Sales: paid, not refunded, not credit redemptions (no money moves)
    const templateSaleRows = templatePurchaseRows.filter((row) => row.status === "paid" && row.source !== "credit");
    const templatePurchaseTrend = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      templateSaleRows,
      (row) => new Date(row.created_at).toISOString().slice(0, 10)
    );

    // Grouped by currency, never summed across them - invoices mix INR and USD.
    const revenueByCurrencyMap = {};
    for (const row of revenueRows || []) {
      const currency = row.currency || "INR";
      revenueByCurrencyMap[currency] = (revenueByCurrencyMap[currency] || 0) + row.amount / 100;
    }
    const revenueByCurrency = Object.entries(revenueByCurrencyMap).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    const templateViewCounts = Object.fromEntries(TEMPLATES.map((template) => [template.slug, 0]));
    for (const row of viewRows) templateViewCounts[row.template_slug] = (templateViewCounts[row.template_slug] || 0) + 1;
    const totalViews = viewRows.length;

    const templateSales = {};
    for (const row of templatePurchaseRows || []) {
      if (row.status !== "paid" || row.source === "credit") continue;
      templateSales[row.template_slug] = (templateSales[row.template_slug] || 0) + 1;
    }

    // Every template: views and sales in the window
    const templateStats = TEMPLATES.map((template) => ({
      slug: template.slug,
      title: template.title,
      category: template.category,
      views: templateViewCounts[template.slug] || 0,
      sales: templateSales[template.slug] || 0,
    })).sort((a, b) => b.views - a.views || b.sales - a.sales);

    const topViewedTemplates = TEMPLATES.map((template) => ({
      ...template,
      viewCount: templateViewCounts[template.slug] || 0,
    }))
      .filter((template) => template.viewCount > 0)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, TOP_TEMPLATES_LIMIT);

    const topSavedEffects = topSlugCounts(allSavedRows || [], TOP_EFFECTS_LIMIT).map(
      ({ slug, count }) => ({ ...resolveEffectSummary(slug), count })
    );

    const topInstalledEffects = topSlugCounts(
      windowInstalls.map((row) => ({ effect_slug: row.effectSlug })),
      TOP_EFFECTS_LIMIT
    ).map(({ slug, count }) => ({ ...resolveEffectSummary(slug), count }));

    // ---- the stat cards: total in the window, change against the window before, a line
    // All time: the line runs from the first record of each stat
    const earliest = (times) => (times.length ? Math.min(...times) : windows.current[0]);
    const card = (items) => compareStat(items, windows, { inWindow, seriesStartMs: startISO ? startMs : earliest(items.map((item) => item.at)) });

    const signupItems = audience.users.map((user) => ({ at: user.createdAt }));
    const viewItems = viewRowsAll.map((row) => ({ at: timeOf(row.created_at) }));
    const installItems = installRows.map((row) => ({ at: timeOf(row.at), source: row.source }));
    const saveItems = savedRowsAll.map((row) => ({ at: timeOf(row.created_at) }));

    // Revenue: subscription payments (smallest unit) and template sales (whole units),
    // per currency - never added across currencies. The card's line and change follow
    // the currency with the most money in the window (USD normally); the rest is listed.
    const moneyItems = [
      ...revenueRowsAll.map((row) => ({ at: timeOf(row.created_at), currency: row.currency || "INR", value: row.amount / 100 })),
      ...templatePurchaseRowsAll
        .filter((row) => row.status === "paid" && row.source !== "credit" && typeof row.amount === "number")
        .map((row) => ({ at: timeOf(row.created_at), currency: row.currency || "USD", value: row.amount })),
    ];
    const revenueTotals = {};
    for (const item of moneyItems) if (inWindow(item.at)) revenueTotals[item.currency] = (revenueTotals[item.currency] || 0) + item.value;
    const currencies = Object.keys(revenueTotals).sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : revenueTotals[b] - revenueTotals[a]));
    const primaryCurrency = currencies[0] || "USD";

    const installCard = card(installItems);
    const kpis = {
      comparison: windows.label,
      signups: card(signupItems),
      templateViews: card(viewItems),
      revenue: {
        ...card(moneyItems.filter((item) => item.currency === primaryCurrency)),
        currency: primaryCurrency,
        byCurrency: currencies.map((currency) => ({ currency, amount: revenueTotals[currency] })),
      },
      installs: {
        ...installCard,
        bySource: Object.fromEntries(INSTALL_SOURCES.map((source) => [source, installItems.filter((item) => item.source === source && inWindow(item.at)).length])),
      },
      saves: card(saveItems),
    };

    const planDistribution = [
      { name: "Pro+", value: planCounts.pro_plus },
      { name: "Pro", value: planCounts.pro },
      { name: "Free", value: planCounts.free },
    ];

    return NextResponse.json({
      range,
      audience: audience.audience,
      stats: {
        totalUsers: signupRows.length,
        proUsers,
        totalInstalls: windowInstalls.length,
        totalSaved: (allSavedRows || []).length,
        totalSavedTemplates: (savedTemplateRows || []).length,
        revenueByCurrency,
        totalViews,
      },
      kpis,
      signupTrend,
      revenueTrendINR,
      revenueTrendUSD,
      templatePurchaseTrend,
      planDistribution,
      topSavedEffects,
      topInstalledEffects,
      topViewedTemplates,
      templateStats,
    });
  } catch (error) {
    console.error("ADMIN_ACTIVITY_OVERVIEW_ERROR:", error);
    return NextResponse.json({ error: "Failed to load activity overview" }, { status: 500 });
  }
}
