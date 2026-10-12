import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { supabase } from "@/lib/supabase";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { isValidInterval, isValidTier } from "@/lib/plans";
import { getRazorpayPlanId } from "@/lib/plans.server";
import { getUpgradeQuote } from "@/lib/upgrade";

// Starts a Pro or Pro+ subscription, billed quarterly or yearly, in USD or
// INR - or upgrades a Pro subscriber to Pro+ (see below). Plan IDs come from plans.server.js. The old monthly/yearly Pro plans
// (and Founding Annual) are closed to new checkouts - plans.server.js still
// maps them so existing subscribers keep working.

// Number of billing cycles Razorpay runs the mandate for (max ~100).
const TOTAL_COUNTS = {
  quarterly: 40, // 10 years
  yearly: 20,
};

// The user's live Razorpay subscription, as { id, tier }, or null. Admin
// grants (no Razorpay subscription behind them) and ended subscriptions
// don't count. Rows from before Pro+ have no tier and count as Pro+.
async function getActiveSubscription(userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, tier, status, current_period_end, razorpay_subscription_id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("CREATE_SUBSCRIPTION_LOOKUP_ERROR:", error);
    return null;
  }

  if (!data?.razorpay_subscription_id) return null;
  if (data.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(data.status)) return null;
  if (data.current_period_end && new Date(data.current_period_end).getTime() <= Date.now()) return null;
  return { id: data.razorpay_subscription_id, tier: isValidTier(data.tier) ? data.tier : "pro_plus" };
}

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tier = body?.tier;
    const interval = body?.interval;
    const currency = body?.currency === "INR" ? "INR" : "USD";

    if (!isValidTier(tier) || !isValidInterval(interval)) {
      return NextResponse.json(
        { error: "Invalid plan. Use tier pro or pro_plus, interval quarterly or yearly." },
        { status: 400 }
      );
    }

    // A second subscription would overwrite the first in our one-row-per-user
    // table while Razorpay kept charging both. The one exception is Pro ->
    // Pro+, prorated (lib/upgrade.js): the new subscription notes the one it
    // replaces, and verify-payment and the webhook cancel that old one as
    // soon as Pro+ is paid.
    const active = await getActiveSubscription(userId);
    let upgrade = null;

    if (active) {
      upgrade = active.tier === "pro" && tier === "pro_plus"
        ? await getUpgradeQuote({ clerkUserId: userId, tier, interval })
        : null;

      if (upgrade?.reason === "plan-not-configured") {
        console.error("RAZORPAY_PLAN_NOT_CONFIGURED:", tier, interval, "(upgrade)");
        return NextResponse.json(
          { error: "This plan isn't available right now.", reason: "plan_not_configured" },
          { status: 503 }
        );
      }

      if (!upgrade?.eligible) {
        const intervalBlocked = upgrade?.reason === "interval-not-allowed";
        return NextResponse.json(
          {
            error: intervalBlocked
              ? "You're on Pro yearly, so upgrade to Pro+ yearly."
              : "You already have an active subscription. Switching plans is available once it ends.",
            reason: intervalBlocked ? "upgrade_interval" : "already_subscribed",
          },
          { status: 409 }
        );
      }
    }

    // An upgrade bills in the current subscription's currency (its quote has the plan)
    const planId = upgrade ? upgrade.newPlanId : getRazorpayPlanId(tier, interval, currency);

    if (!planId) {
      console.error("RAZORPAY_PLAN_NOT_CONFIGURED:", tier, interval, currency);
      return NextResponse.json(
        { error: "This plan isn't available right now.", reason: "plan_not_configured" },
        { status: 503 }
      );
    }

    let subscription;

    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: TOTAL_COUNTS[interval],
        customer_notify: 1,
        ...(upgrade
          ? {
              // Pro+ is paid now (the addon), so its first full charge is one period away
              start_at: upgrade.renewsAt,
              addons: [
                {
                  item: {
                    name: "Upgrade to Pro+ (unused Pro credited)",
                    amount: upgrade.charge,
                    currency: upgrade.currency,
                  },
                },
              ],
            }
          : {}),
        notes: {
          clerk_user_id: userId,
          tier,
          plan_key: interval,
          currency: upgrade ? upgrade.currency : currency,
          ...(upgrade
            ? {
                replaces_subscription_id: upgrade.replacesSubscriptionId,
                upgrade_credit: String(upgrade.credit),
              }
            : {}),
        },
      });
    } catch (razorpayError) {
      console.error("RAZORPAY_CREATE_SUBSCRIPTION_ERROR:", razorpayError);

      return NextResponse.json(
        {
          error: "Could not start checkout with the payment provider. Please try again.",
          reason: "razorpay_error",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      planId,
      keyId: process.env.RAZORPAY_KEY_ID,
      founding: false,
      upgrade: upgrade
        ? { charge: upgrade.charge, credit: upgrade.credit, currency: upgrade.currency, renewsAt: upgrade.renewsAt }
        : null,
    });
  } catch (error) {
    console.error("RAZORPAY_CREATE_SUBSCRIPTION_ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
