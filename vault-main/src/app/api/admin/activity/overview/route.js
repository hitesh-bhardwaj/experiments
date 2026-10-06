import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { buildDailyBucketsForRange, fillDailyBuckets, resolveDateBounds } from "@/lib/admin-activity";
import { TEMPLATES } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";

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

    function scoped(query, column = "created_at") {
      let q = query;
      if (startISO) q = q.gte(column, startISO);
      if (endISO) q = q.lt(column, endISO);
      return q;
    }

    const [
      { count: totalUsers, error: totalUsersError },
      { count: proUsers, error: proUsersError },
      // Plan distribution is "what does the whole site look like right now,"
      // not "what does the site look like among people who joined in this
      // window" - deliberately unscoped, so picking "Last 7 days" doesn't
      // quietly turn this into a donut of one week's signups.
      { count: siteTotalUsers, error: siteTotalUsersError },
      { count: siteProUsers, error: siteProUsersError },
      { data: signupRows, error: signupError },
      { data: copyRows, error: copyError },
      { data: allCopyRows, error: allCopyError },
      { data: allInstallRows, error: allInstallError },
      { data: allSavedRows, error: allSavedError },
      { data: savedTemplateRows, error: savedTemplateError },
      { data: revenueRows, error: revenueError },
      { data: templatePurchaseRows, error: templatePurchaseError },
      sanityEntries,
      templateViewCounts,
    ] = await Promise.all([
      scoped(supabase.from("subscriptions").select("clerk_user_id", { count: "exact", head: true })),
      scoped(
        supabase
          .from("subscriptions")
          .select("clerk_user_id", { count: "exact", head: true })
          .eq("plan", "pro")
      ),
      supabase.from("subscriptions").select("clerk_user_id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("clerk_user_id", { count: "exact", head: true })
        .eq("plan", "pro"),
      scoped(supabase.from("subscriptions").select("created_at")),
      // install_unlocks supersedes copy_usage_effects (Installation-SyncUp.md
      // Stage 1.5) and is the shared ledger across web/CLI/MCP - but "copies"
      // specifically means the website's copy button, same as everywhere
      // else this word is used (Top saved/copied effects, the per-user
      // detail page), so it's scoped to source='web' here rather than
      // counting CLI/MCP installs under a "copies" label. "Installs"
      // elsewhere on this page (AggregatePanels, via /api/admin/installs)
      // stays unscoped - that one's deliberately meant to cover all three.
      scoped(supabase.from("install_unlocks").select("usage_date").eq("source", "web"), "usage_date"),
      scoped(supabase.from("install_unlocks").select("effect_slug").eq("source", "web"), "usage_date"),
      // Unscoped by source, unlike allCopyRows above - "Top installed
      // effects" means every surface (web/CLI/MCP), same as everywhere else
      // "installs" is used on this page.
      scoped(supabase.from("install_unlocks").select("effect_slug"), "usage_date"),
      scoped(supabase.from("wishlisted_effects").select("effect_slug")),
      scoped(supabase.from("wishlisted_templates").select("template_slug")),
      // is_test excluded - those are admin-generated sample bills, not real revenue.
      scoped(
        supabase
          .from("invoices")
          .select("amount, currency, created_at")
          .eq("status", "paid")
          .eq("is_test", false)
      ),
      // Counted, not summed by amount: template_purchases mixes currencies
      // (USD and INR orders both land here - see create-order/route.js),
      // so summing raw amounts across rows would add unlike units. A
      // purchase count avoids that without needing currency conversion.
      scoped(supabase.from("template_purchases").select("created_at")),
      getAllSanityEffectEntries(),
      // Scoped to the same window as everything else on this page (view
      // rows carry their own created_at) - unlike /templates' own all-time
      // card counts, which call this with no range at all.
      getTemplateViewCounts(
        TEMPLATES.map((template) => template.slug),
        { startISO, endISO }
      ),
    ]);

    const firstError =
      totalUsersError ||
      proUsersError ||
      siteTotalUsersError ||
      siteProUsersError ||
      signupError ||
      copyError ||
      allCopyError ||
      allInstallError ||
      allSavedError ||
      savedTemplateError ||
      revenueError ||
      templatePurchaseError;

    if (firstError) {
      console.error("ADMIN_ACTIVITY_OVERVIEW_ERROR:", firstError);
      return NextResponse.json({ error: "Failed to load activity overview" }, { status: 500 });
    }

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

    const templatePurchaseTrend = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      templatePurchaseRows || [],
      (row) => new Date(row.created_at).toISOString().slice(0, 10)
    );

    // Grouped by currency, never summed across them - invoices mixes INR and
    // USD (Razorpay lets a customer's billing region pick either), so a
    // single blended total would add unlike units. Same reasoning
    // api/admin/template-purchases/route.js already documents for that
    // table's own revenueByCurrency.
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
      { name: "Pro", value: siteProUsers || 0 },
      { name: "Free", value: Math.max(0, (siteTotalUsers || 0) - (siteProUsers || 0)) },
    ];

    return NextResponse.json({
      range,
      stats: {
        totalUsers: totalUsers || 0,
        proUsers: proUsers || 0,
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
    });
  } catch (error) {
    console.error("ADMIN_ACTIVITY_OVERVIEW_ERROR:", error);
    return NextResponse.json({ error: "Failed to load activity overview" }, { status: 500 });
  }
}
