import { auth, currentUser } from "@clerk/nextjs/server";
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
        "plan,status,billing_interval,current_period_end,razorpay_subscription_id,razorpay_plan_id,razorpay_short_url"
      )
      .eq("clerk_user_id", userId)
      .maybeSingle(),

    // install_unlocks has one row per (day, effect) an effect was newly unlocked, with
    // the surface it came through: web (copied on the site), cli or mcp - counted per
    // surface, the same split as the admin Users table's Copies / CLI / MCP. Admins are
    // never metered, so their installs are in install_events instead (lib/install-limit),
    // read in the same shape.
    isAdminUser(user)
      ? supabase
          .from("install_events")
          .select("effect_slug, source, usage_date:occurred_at, first_unlocked_at:occurred_at")
          .eq("clerk_user_id", userId)
          .eq("plan", "admin")
          .order("occurred_at", { ascending: false })
      : supabase
          .from("install_unlocks")
          .select("effect_slug, source, usage_date, first_unlocked_at")
          .eq("clerk_user_id", userId)
          .order("first_unlocked_at", { ascending: false }),
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

  // Distinct effects taken through each surface
  const bySource = { web: new Set(), cli: new Set(), mcp: new Set() };

  const todaySlugs = new Set();
  const todayUTC = new Date().toISOString().slice(0, 10);

  for (const row of unlockRows || []) {
    bySource[row.source]?.add(row.effect_slug);
    if (String(row.usage_date).slice(0, 10) === todayUTC) todaySlugs.add(row.effect_slug);
  }

  const titleOf = (slug, fallback) => getEffectMetadata(slug)?.title || fallback || slug;
  const savedNewestFirst = [...(wishlist || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return NextResponse.json({
    savedCount: wishlist?.length || 0,
    savedEffects: wishlist || [],
    // Distinct effects copied from the website, and installed with the CLI / MCP
    copiedCount: bySource.web.size,
    cliCount: bySource.cli.size,
    mcpCount: bySource.mcp.size,
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
    billingInterval: subscription?.billing_interval || null,
    planValidUntil: subscription?.current_period_end || null,
    creditsPerYear: plan === "pro" ? getCreditsPerYear(tier, subscription?.billing_interval) : 0,
    razorpaySubscriptionId: subscription?.razorpay_subscription_id || null,
    razorpayPlanId: subscription?.razorpay_plan_id || null,
    manageSubscriptionUrl: subscription?.razorpay_short_url || null,
  });
}