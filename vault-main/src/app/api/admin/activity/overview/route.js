import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { buildDailyBucketsForRange, fillDailyBuckets, resolveDateBounds } from "@/lib/admin-activity";
import { TEMPLATES } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";
import { currentPlanOf, fetchAllRows, getAudience, parseAudience } from "@/lib/admin-data";

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

    // Every row in the window (not the first 1000), for this audience
    function scoped(table, columns, column = "created_at", extra = (q) => q) {
      return fetchAllRows(() => {
        let q = extra(supabase.from(table).select(columns));
        if (startISO) q = q.gte(column, startISO);
        if (endISO) q = q.lt(column, endISO);
        return q;
      }).then(mine);
    }

    const [
      subscriptionRows,
      unlockRows,
      savedRows,
      savedTemplateRows,
      revenueRows,
      templatePurchaseRows,
      sanityEntries,
      templateViewCounts,
    ] = await Promise.all([
      fetchAllRows(() => supabase.from("subscriptions").select("clerk_user_id, plan, tier, status, current_period_end")),
      // install_unlocks is the shared ledger across web/CLI/MCP. "Copies" means
      // the website's copy button (source='web'), as everywhere else on the
      // admin pages; "installs" covers all three.
      scoped("install_unlocks", "clerk_user_id, effect_slug, source, usage_date", "usage_date"),
      scoped("wishlisted_effects", "clerk_user_id, effect_slug"),
      scoped("wishlisted_templates", "clerk_user_id, template_slug"),
      // Real payments only: test-mode invoices are left out
      scoped("invoices", "clerk_user_id, amount, currency, created_at", "created_at", (q) =>
        q.eq("status", "paid").eq("is_test", false)
      ),
      scoped("template_purchases", "clerk_user_id, created_at, template_slug, status, source", "created_at", (q) =>
        q.eq("is_test", false)
      ),
      getAllSanityEffectEntries(),
      // Views in the same window and audience
      getTemplateViewCounts(
        TEMPLATES.map((template) => template.slug),
        { startISO, endISO, includesIdentity: audience.includesIdentity }
      ),
    ]);

    const copyRows = unlockRows.filter((row) => row.source === "web");
    const allCopyRows = copyRows;
    const allInstallRows = unlockRows;
    const allSavedRows = savedRows;

    // People: real accounts (Clerk), not subscriptions rows (which outlive deleted accounts)
    const inWindow = (time) =>
      (!startISO || time >= new Date(startISO).getTime()) && (!endISO || time < new Date(endISO).getTime());
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

    const copyTrend = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      copyRows || [],
      (row) => row.usage_date
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

    const totalViews = Object.values(templateViewCounts).reduce((sum, count) => sum + count, 0);

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

    const topCopiedEffects = topSlugCounts(allCopyRows || [], TOP_EFFECTS_LIMIT).map(
      ({ slug, count }) => ({ ...resolveEffectSummary(slug), count })
    );

    const topInstalledEffects = topSlugCounts(allInstallRows || [], TOP_EFFECTS_LIMIT).map(
      ({ slug, count }) => ({ ...resolveEffectSummary(slug), count })
    );

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
        // Same web-only copies count either way (install_unlocks, source=web,
        // in the selected window) - only the label on the frontend changes
        // when the window itself is "Today", so this doubles as both "Total
        // Copies" and "Copies Today" without two separate queries.
        totalCopies: (copyRows || []).length,
        totalSaved: (allSavedRows || []).length,
        totalSavedTemplates: (savedTemplateRows || []).length,
        revenueByCurrency,
        totalViews,
      },
      signupTrend,
      copyTrend,
      revenueTrendINR,
      revenueTrendUSD,
      templatePurchaseTrend,
      planDistribution,
      topSavedEffects,
      topCopiedEffects,
      topInstalledEffects,
      topViewedTemplates,
      templateStats,
    });
  } catch (error) {
    console.error("ADMIN_ACTIVITY_OVERVIEW_ERROR:", error);
    return NextResponse.json({ error: "Failed to load activity overview" }, { status: 500 });
  }
}
