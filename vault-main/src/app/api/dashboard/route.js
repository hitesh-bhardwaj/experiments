import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchInstalls } from "@/lib/admin-data";
import { isCancelScheduled } from "@/lib/subscription-events";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getRegistryIndex, getFreeEffectsCount, getEffectMetadata } from "@/lib/registry";
import { getUserPlanInfo } from "@/lib/subscription";
import { getCreditBalance } from "@/lib/template-credits";
import { getLimitForTier } from "@/lib/install-limit";
import { isAdminUser } from "@/lib/admin";
import { getCreditsPerYear } from "@/lib/plans";


export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const [user, { plan, tier }, registry, templateCredits] = await Promise.all([
    currentUser(),
    getUserPlanInfo(userId),
    Promise.resolve(getRegistryIndex()),
    getCreditBalance(userId),
  ]);

  const [
    { data: wishlist, error: wishlistError },
    { data: subscription, error: subscriptionError },
    { data: unlockRows, error: unlockError },
  ] = await Promise.all([
    supabase
      .from("wishlisted_effects")
      .select("*")
      .eq("clerk_user_id", userId),

    supabase
      .from("subscriptions")
      .select(
        "plan,status,billing_interval,current_period_end,razorpay_subscription_id,razorpay_plan_id,razorpay_short_url,cli_token_hash,cli_token_revoked_at"
      )
      .eq("clerk_user_id", userId)
      .maybeSingle(),

    // Their installs: one effect, one day, from the website, the CLI or MCP - the same
    // count as every admin page (lib/admin-data fetchInstalls; admins included)
    fetchInstalls({ clerkUserId: userId })
      .then((rows) => ({ data: rows.map((row) => ({ effect_slug: row.effectSlug, source: row.source, usage_date: row.day, first_unlocked_at: row.at })), error: null }))
      .catch((error) => ({ data: null, error })),
  ]);

  // Fallback: if no subscription row exists (webhook missed), provision one now
  if (!subscriptionError && !subscription) {
    await supabase
      .from("subscriptions")
      .upsert(
        {
          clerk_user_id: userId,
          plan: "free",
          status: "inactive",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" }
      );
  }

  if (wishlistError) {
    return NextResponse.json(
      { error: wishlistError.message },
      { status: 500 }
    );
  }

  if (subscriptionError) {
    return NextResponse.json(
      { error: subscriptionError.message },
      { status: 500 }
    );
  }

  if (unlockError) {
    return NextResponse.json(
      { error: unlockError.message },
      { status: 500 }
    );
  }

  const totalEffects = registry.items?.length || 0;
  const totalFreeEffects = getFreeEffectsCount();
  const totalEffectsAccess =
    plan === "pro"
      ? totalEffects
      : Math.min(totalFreeEffects, totalEffects);

  // Installs through each surface
  const bySource = { web: 0, cli: 0, mcp: 0 };

  const todaySlugs = new Set();
  const todayUTC = new Date().toISOString().slice(0, 10);

  for (const row of unlockRows || []) {
    if (row.source in bySource) bySource[row.source] += 1;
    if (String(row.usage_date).slice(0, 10) === todayUTC) todaySlugs.add(row.effect_slug);
  }

  const titleOf = (slug, fallback) => getEffectMetadata(slug)?.title || fallback || slug;
  const savedNewestFirst = [...(wishlist || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return NextResponse.json({
    savedCount: wishlist?.length || 0,
    savedEffects: wishlist || [],
    // Installs from the website, the CLI and MCP
    webCount: bySource.web,
    cliCount: bySource.cli,
    mcpCount: bySource.mcp,
    // Unique effects taken today, against dailyInstallLimit
    todayCount: todaySlugs.size,
    recentActivity: (unlockRows || []).slice(0, 6).map((row) => ({
      name: row.effect_slug,
      title: titleOf(row.effect_slug),
      source: row.source,
      at: row.first_unlocked_at || row.usage_date,
    })),
    recentlySaved: savedNewestFirst.slice(0, 4).map((row) => ({
      name: row.effect_slug,
      title: titleOf(row.effect_slug, row.title),
      coverImage: row.cover_image,
      tier: row.tier || "free",
      savedAt: row.created_at,
    })),
    joinedAt: user?.createdAt || null,
    plan,
    tier,
    templateCredits,
    dailyInstallLimit: getLimitForTier(tier, { isAdmin: isAdminUser(user) }),
    totalEffects,
    totalEffectsAccess,
    totalFreeEffects,

    subscriptionStatus: subscription?.status || "inactive",
    // Cancelled from the dashboard: still active until the period ends, then Free
    cancelAtPeriodEnd: isCancelScheduled(user, subscription?.razorpay_subscription_id),
    billingInterval: subscription?.billing_interval || null,
    planValidUntil: subscription?.current_period_end || null,
    creditsPerYear: plan === "pro" ? getCreditsPerYear(tier, subscription?.billing_interval) : 0,
    razorpaySubscriptionId: subscription?.razorpay_subscription_id || null,
    razorpayPlanId: subscription?.razorpay_plan_id || null,
    manageSubscriptionUrl: subscription?.razorpay_short_url || null,
    // Whether a CLI token is live (the button says "Regenerate"); the hash never leaves here
    hasCliToken: Boolean(subscription?.cli_token_hash && !subscription?.cli_token_revoked_at),
  });
}