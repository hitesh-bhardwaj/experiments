import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { getRegistryIndex, getFreeEffectsCount } from "@/lib/registry";
import { getUserPlan } from "@/lib/subscription";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const [user, plan, registry] = await Promise.all([
    currentUser(),
    getUserPlan(userId),
    Promise.resolve(getRegistryIndex()),
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

    // install_unlocks has one row per (day, effect, source) an effect was
    // newly unlocked - "Copied Effects" is distinct effects unlocked via the
    // website specifically (source='web'), "Installed Effects" is distinct
    // effects unlocked via any of the three surfaces (web/CLI/MCP), same
    // web-vs-all distinction as the admin Activity page's copies/installs.
    supabase
      .from("install_unlocks")
      .select("effect_slug, source")
      .eq("clerk_user_id", userId),
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

  const installedSlugs = new Set();
  const copiedSlugs = new Set();

  for (const row of unlockRows || []) {
    installedSlugs.add(row.effect_slug);
    if (row.source === "web") copiedSlugs.add(row.effect_slug);
  }

  return NextResponse.json({
    savedCount: wishlist?.length || 0,
    savedEffects: wishlist || [],
    copiedCount: copiedSlugs.size,
    installedCount: installedSlugs.size,
    joinedAt: user?.createdAt || null,
    plan,
    totalEffects,
    totalEffectsAccess,
    totalFreeEffects,

    subscriptionStatus: subscription?.status || "inactive",
    billingInterval: subscription?.billing_interval || null,
    planValidUntil: subscription?.current_period_end || null,
    razorpaySubscriptionId: subscription?.razorpay_subscription_id || null,
    razorpayPlanId: subscription?.razorpay_plan_id || null,
    manageSubscriptionUrl: subscription?.razorpay_short_url || null,
  });
}