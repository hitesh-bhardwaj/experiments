import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

// Founding Annual (first-100-users discounted yearly plan) is disabled for
// new checkouts - see the comment below. RAZORPAY_PRO_FOUNDING_YEARLY(_INR)_
// PLAN_ID stay set in env and PLANS is left off this object deliberately -
// pro-access.js and api/razorpay/webhooks/route.js still read those env vars
// directly to correctly label/release *existing* founding subscribers.
const PLANS = {
  USD: {
    monthly: process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID,
    yearly: process.env.RAZORPAY_PRO_YEARLY_PLAN_ID,
  },
  INR: {
    monthly: process.env.RAZORPAY_PRO_MONTHLY_INR_PLAN_ID,
    yearly: process.env.RAZORPAY_PRO_YEARLY_INR_PLAN_ID,
  },
};

// Number of billing cycles Razorpay runs the mandate for (max ~100).
const TOTAL_COUNTS = {
  monthly: 100, // ~8 years
  yearly: 20,
};

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedPlan = body?.plan;
    const currency = body?.currency === "INR" ? "INR" : "USD";

    if (!["monthly", "yearly"].includes(requestedPlan)) {
      return NextResponse.json(
        { error: "Invalid plan. Use monthly or yearly." },
        { status: 400 }
      );
    }

    const planKey = requestedPlan;
    const planId = PLANS[currency][planKey];

    let subscription;

    try {
      subscription = await razorpay.subscriptions.create({
        plan_id: planId,
        total_count: TOTAL_COUNTS[planKey],
        customer_notify: 1,
        notes: {
          clerk_user_id: userId,
          plan_key: planKey,
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
