import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import {
  buildDailyBucketsForRange,
  fillDailyBucketsBySeries,
  resolveDateBounds,
} from "@/lib/admin-activity";
import { buildUserActivitySlug } from "@/lib/user-slug";
import { getTemplateBySlug } from "@/lib/mock-templates";

const INSTALL_SOURCES = ["web", "cli", "mcp"];

// Matches the bounded-fetch approach already used for the signups trend in
// /api/admin/activity/overview - fine at this product's current scale;
// would need real pagination past this many registered users.
const MAX_USERS_FOR_SLUG_LOOKUP = 500;

// The slug carries no id (by design - readable name/email only), so it has
// to be resolved by computing every candidate's slug and matching, rather
// than looked up directly. clerk_user_id list comes from Supabase since
// that's the same source /api/admin/users already treats as the user list.
async function findUserBySlug(clerk, slug) {
  const { data: subscriptionRows } = await supabase
    .from("subscriptions")
    .select("clerk_user_id")
    .limit(MAX_USERS_FOR_SLUG_LOOKUP);

  const clerkUserIds = (subscriptionRows || [])
    .map((row) => row.clerk_user_id)
    .filter(Boolean);

  if (!clerkUserIds.length) return null;

  const { data: clerkUsers } = await clerk.users.getUserList({
    userId: clerkUserIds,
    limit: clerkUserIds.length,
  });

  return (
    (clerkUsers || []).find(
      (user) =>
        buildUserActivitySlug({
          name: user.fullName || user.firstName || null,
          email: user.emailAddresses?.[0]?.emailAddress || null,
        }) === slug
    ) || null
  );
}

export async function GET(request, { params }) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userSlug } = await params;

  try {
    const clerk = await clerkClient();
    const clerkUser = await findUserBySlug(clerk, userSlug);

    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = clerkUser.id;

    // Best-effort device/location enrichment - Clerk only retains recent
    // sessions, and a user with no active session (expired/signed out
    // everywhere) is a normal, non-error state, not something to fail on.
    let sessions = [];
    try {
      const sessionList = await clerk.sessions.getSessionList({ userId });
      sessions = sessionList?.data || [];
    } catch (sessionError) {
      console.error("ADMIN_ACTIVITY_SESSIONS_ERROR:", userId, sessionError);
    }

    const latestSession = sessions
      .slice()
      .sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0))[0] || null;

    const { searchParams } = new URL(request.url);
    const { startISO, endISO, startDateString, endDateString } = resolveDateBounds({
      range: searchParams.get("range"),
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });

    function scoped(query, column = "created_at") {
      let q = query;
      if (startISO) q = q.gte(column, startISO);
      if (endISO) q = q.lt(column, endISO);
      return q;
    }

    // usage_date is a DATE column (install_unlocks), not a timestamptz -
    // "the whole day" is the unit, so this uses the inclusive
    // startDateString/endDateString form resolveDateBounds returns
    // specifically for that case, not the exclusive-end ISO timestamps
    // scoped() above uses for created_at columns.
    function scopedByUsageDate(query) {
      let q = query;
      if (startDateString) q = q.gte("usage_date", startDateString);
      if (endDateString) q = q.lte("usage_date", endDateString);
      return q;
    }

    const [
      { data: subscriptionRow, error: subscriptionError },
      { data: invoiceRows, error: invoicesError },
      { data: templatePurchaseRows, error: templatePurchasesError },
      { data: savedRows, error: savedError },
      { data: copyRows, error: copyError },
      { data: installRows, error: installError },
      sanityEntries,
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "plan,status,billing_interval,current_period_end,razorpay_subscription_id,cli_token_hash,cli_token_revoked_at,cli_token_last_used_at,created_at"
        )
        .eq("clerk_user_id", userId)
        .maybeSingle(),

      scoped(
        supabase
          .from("invoices")
          .select("id,amount,currency,status,plan_label,invoice_url,razorpay_payment_id,is_test,created_at")
          .eq("clerk_user_id", userId)
          // Real payments only - matches api/admin/invoices/route.js. Test
          // invoices (admin-seeded sample bills) don't belong in a user's
          // real billing history.
          .eq("is_test", false)
          .order("created_at", { ascending: false })
      ),

      scoped(
        supabase
          .from("template_purchases")
          .select("id,template_slug,razorpay_payment_id,amount,currency,status,invoice_url,created_at")
          .eq("clerk_user_id", userId)
          .order("created_at", { ascending: false })
      ),

      scoped(
        supabase
          .from("wishlisted_effects")
          .select("id,effect_slug,title,category,cover_image,tier,created_at")
          .eq("clerk_user_id", userId)
          .order("created_at", { ascending: false })
      ),

      // install_unlocks supersedes copy_usage_effects (Installation-SyncUp.md
      // Stage 1.5) and is the shared ledger across web/CLI/MCP - but
      // "copies" here specifically means the website's copy button (same as
      // the Overview page's Total Copies/Copy activity), so it's scoped to
      // source='web' rather than folding CLI/MCP installs into a "copies"
      // label.
      scopedByUsageDate(
        supabase
          .from("install_unlocks")
          .select("effect_slug, usage_date")
          .eq("clerk_user_id", userId)
          .eq("source", "web")
          .order("usage_date", { ascending: false })
      ),

      // Unscoped by source, unlike copyRows above - "installed" means every
      // surface (web/CLI/MCP), same as "Top installed effects" on the
      // Overview page. Copies are always a subset of this (every web copy
      // is also an install_unlocks row), which is exactly what lets the
      // page below hide this slider when it'd just be a duplicate of
      // "Copied Effects". `source` is also what the Installs chart below
      // splits its three lines by.
      scopedByUsageDate(
        supabase
          .from("install_unlocks")
          .select("effect_slug, usage_date, source")
          .eq("clerk_user_id", userId)
          .order("usage_date", { ascending: false })
      ),

      getAllSanityEffectEntries(),
    ]);

    const firstError =
      subscriptionError || invoicesError || templatePurchasesError || savedError || copyError || installError;

    if (firstError) {
      console.error("ADMIN_ACTIVITY_USER_ERROR:", userId, firstError);
      return NextResponse.json({ error: "Failed to load user activity" }, { status: 500 });
    }

    const sanityEffectsBySlug = new Map(
      buildEffectsFromSanity(sanityEntries).map((effect) => [effect.name, effect])
    );

    function resolveEffect(slug) {
      const metadata = sanityEffectsBySlug.get(slug) || getEffectMetadata(slug);
      return {
        slug,
        name: slug,
        title: metadata?.title || slug,
        coverImage: metadata?.coverImage || slug,
        videoUrl: metadata?.videoUrl || null,
        tier: metadata?.tier || "free",
        // metadata is either a Sanity entry (categorySlug) or a registry
        // entry (categories[]) - checking both covers whichever shape it
        // actually is, same as resolveEffectSummary() in the overview
        // route. Needed so EffectRankSlider's card links (getEffectHref)
        // land on the right category instead of silently defaulting to
        // "components".
        categorySlug: metadata?.categorySlug || metadata?.categories?.[0] || null,
      };
    }

    // Dedupe to most-recent-per-effect - same as /api/dashboard/usage/route.js
    // - rows are already newest-first. Shared by both copiedEffects and
    // installedEffects below, since it's the same "one row per effect,
    // most recent date wins" reduction either way.
    function dedupeMostRecent(rows, dateField) {
      const seenSlugs = new Set();
      const effects = [];

      for (const row of rows || []) {
        if (seenSlugs.has(row.effect_slug)) continue;
        seenSlugs.add(row.effect_slug);

        effects.push({ ...resolveEffect(row.effect_slug), [dateField]: row.usage_date });
      }

      return effects;
    }

    const copiedEffects = dedupeMostRecent(copyRows, "lastCopiedAt");
    const installedEffects = dedupeMostRecent(installRows, "lastInstalledAt");

    // Installs, not just web copies - one line per source (web/CLI/MCP)
    // instead of the single web-only line this used to be, so it actually
    // shows where this user's installs come from rather than only the
    // subset that happens to be copies.
    const installTrend = fillDailyBucketsBySeries(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      installRows || [],
      (row) => row.usage_date,
      (row) => row.source,
      INSTALL_SOURCES
    );

    const savedEffects = (savedRows || []).map((row) => ({
      id: row.id,
      slug: row.effect_slug,
      name: row.effect_slug,
      title: row.title || resolveEffect(row.effect_slug).title,
      category: row.category,
      coverImage: row.cover_image || resolveEffect(row.effect_slug).coverImage,
      videoUrl: resolveEffect(row.effect_slug).videoUrl,
      tier: row.tier || "free",
      savedAt: row.created_at,
    }));

    // Grouped by currency, never summed across them or reduced to "whichever
    // currency the first row happened to be" - a user can genuinely have
    // both a USD subscription and an INR one (or vice versa) on file, and
    // picking just paidInvoices[0]'s currency for the whole total is exactly
    // what previously mislabeled a real $179 spend as "₹179". Combines both
    // subscription invoices AND one-time template purchases, since both are
    // real money this user actually spent - "Lifetime Spend" excluding
    // template purchases entirely was the other half of that same report.
    const paidInvoices = (invoiceRows || []).filter((row) => row.status === "paid" && !row.is_test);
    const paidTemplatePurchases = (templatePurchaseRows || []).filter((row) => row.status === "paid");

    const lifetimeSpendByCurrencyMap = {};
    for (const row of paidInvoices) {
      const currency = row.currency || "INR";
      lifetimeSpendByCurrencyMap[currency] = (lifetimeSpendByCurrencyMap[currency] || 0) + row.amount / 100;
    }
    // template_purchases.amount is already whole currency units (see
    // comment below), unlike invoices.amount above - do not divide by 100.
    for (const row of paidTemplatePurchases) {
      const currency = row.currency || "USD";
      lifetimeSpendByCurrencyMap[currency] = (lifetimeSpendByCurrencyMap[currency] || 0) + row.amount;
    }
    const lifetimeSpendByCurrency = Object.entries(lifetimeSpendByCurrencyMap).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    // amount is already whole currency units here (verify-payment/route.js
    // divides Razorpay's paise/cents amount by 100 before recording), unlike
    // invoices.amount above - do not divide this by 100 again.
    const templatePurchases = (templatePurchaseRows || []).map((row) => ({
      id: row.id,
      templateSlug: row.template_slug,
      templateTitle: getTemplateBySlug(row.template_slug)?.title || row.template_slug,
      paymentId: row.razorpay_payment_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      invoiceUrl: row.invoice_url,
      createdAt: row.created_at,
    }));

    // Full template objects (title, screenshots, tier, href, etc.), not
    // just the slug/title pair templatePurchases carries - the "Purchased
    // Templates" slider below renders these as real TemplateCards, same as
    // the Saved/Copied/Installed Effects sliders above it do for effects.
    const purchasedTemplates = (templatePurchaseRows || [])
      .map((row) => getTemplateBySlug(row.template_slug))
      .filter(Boolean);

    return NextResponse.json({
      profile: {
        id: clerkUser.id,
        // Name is never blank in the UI: falls back to the email's
        // local-part, capitalized - same convention as displayName() in
        // dashboard/admin/page.js and resolveDisplayName() in
        // InstallActivityTab.js - rather than a generic "Unnamed user"
        // placeholder when Clerk has no first/last name on file (invited
        // accounts that completed sign-up through Clerk's own hosted widget
        // without ever being asked for one, mainly).
        name:
          clerkUser.fullName ||
          clerkUser.firstName ||
          (() => {
            const local = clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0];
            return local ? local.charAt(0).toUpperCase() + local.slice(1) : null;
          })(),
        email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
        imageUrl: clerkUser.imageUrl || null,
        joinedAt: clerkUser.createdAt,
        lastSignInAt: clerkUser.lastSignInAt,
        isAdmin: clerkUser.publicMetadata?.role === "admin",
      },
      session: latestSession
        ? {
            status: latestSession.status,
            lastActiveAt: latestSession.lastActiveAt,
            browserName: latestSession.latestActivity?.browserName || null,
            deviceType: latestSession.latestActivity?.deviceType || null,
            city: latestSession.latestActivity?.city || null,
            country: latestSession.latestActivity?.country || null,
          }
        : null,
      subscription: subscriptionRow || null,
      stats: {
        savedCount: (savedRows || []).length,
        copiedCount: copiedEffects.length,
        installedCount: installedEffects.length,
        lifetimeSpendByCurrency,
      },
      installTrend,
      savedEffects,
      copiedEffects,
      installedEffects,
      invoices: invoiceRows || [],
      templatePurchases,
      purchasedTemplates,
    });
  } catch (error) {
    // userId may not be assigned yet if the error happened before the slug
    // resolved to a user - log the slug instead, which is always in scope.
    console.error("ADMIN_ACTIVITY_USER_ERROR:", userSlug, error);

    if (error?.status === 404 || error?.clerkError) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to load user activity" }, { status: 500 });
  }
}
