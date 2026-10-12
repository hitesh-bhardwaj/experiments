import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { supabase } from "@/lib/supabase";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { isValidInterval, isValidTier } from "@/lib/plans";
import { getRazorpayPlanId } from "@/lib/plans.server";

// Starts a Pro or Pro+ subscription, billed quarterly or yearly, in USD or
// INR. Plan IDs come from plans.server.js. The old monthly/yearly Pro plans
// (and Founding Annual) are closed to new checkouts - plans.server.js still
// maps them so existing subscribers keep working.

// Number of billing cycles Razorpay runs the mandate for (max ~100).
const TOTAL_COUNTS = {
  quarterly: 40, // 10 years
  yearly: 20,
};

// A second subscription would overwrite the first in our subscriptions row
// (one row per user) while Razorpay kept charging both - so a subscriber has
// to let the current one end before starting another. Admin grants (no
// Razorpay subscription behind them) don't block checkout.
async function hasActiveSubscription(userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, razorpay_subscription_id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("CREATE_SUBSCRIPTION_LOOKUP_ERROR:", error);
    return false;
  }

  if (!data?.razorpay_subscription_id) return false;
  if (data.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(data.status)) return false;
  if (!data.current_period_end) return true;
  return new Date(data.current_period_end).getTime() > Date.now();
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

    const planId = getRazorpayPlanId(tier, interval, currency);

    if (!planId) {
      console.error("RAZORPAY_PLAN_NOT_CONFIGURED:", tier, interval, currency);
      return NextResponse.json(
        { error: "This plan isn't available right now.", reason: "plan_not_configured" },
        { status: 503 }
      );
    }

    if (await hasActiveSubscription(userId)) {
      return NextResponse.json(
        {
          error: "You already have an active subscription. Switching plans is available once it ends.",
          reason: "already_subscribed",
        },
        { status: 409 }
      );
    }

    let subscription;

    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: TOTAL_COUNTS[interval],
        customer_notify: 1,
        notes: {
          clerk_user_id: userId,
          tier,
          plan_key: interval,
          currency,
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
    });
  } catch (error) {
    console.error("RAZORPAY_CREATE_SUBSCRIPTION_ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
