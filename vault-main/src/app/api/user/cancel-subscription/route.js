import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { razorpay } from "@/lib/razorpay";
import { CANCEL_SCHEDULED_KEY } from "@/lib/subscription-events";

// "Cancel subscription" on the dashboard's Invoicing tab. Cancels at the end of the paid
// period: the plan stays until current_period_end, nothing more is charged, and the
// remaining time isn't refunded (Refund Policy). Razorpay's subscription.cancelled webhook
// moves the account to Free when the period ends; until then the account carries the
// scheduled cancellation (lib/subscription-events), which the dashboard shows.

const ENDED = new Set(["cancelled", "completed", "expired"]);

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("subscriptions")
    .select("plan,razorpay_subscription_id,current_period_end")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("CANCEL_SUBSCRIPTION_LOOKUP_ERROR:", error);
    return NextResponse.json({ error: "Couldn't cancel your subscription. Please try again." }, { status: 500 });
  }
  // Plans granted by the team have no Razorpay subscription to cancel
  if (row?.plan !== "pro" || !row.razorpay_subscription_id) {
    return NextResponse.json({ error: "There's no paid subscription to cancel." }, { status: 400 });
  }

  const id = row.razorpay_subscription_id;
  try {
    const live = await razorpay.subscriptions.fetch(id);
    if (!ENDED.has(live?.status)) await razorpay.subscriptions.cancel(id, true);
  } catch (cancelError) {
    console.error("CANCEL_SUBSCRIPTION_ERROR:", id, cancelError);
    return NextResponse.json({ error: "Razorpay couldn't cancel your subscription. Please try again or contact support." }, { status: 502 });
  }

  // Shown on the dashboard until the webhook ends the plan. Razorpay has already cancelled,
  // so a failure here only affects the label - logged, not reported as a failed cancel.
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    await clerk.users.updateUser(userId, { publicMetadata: { ...user.publicMetadata, [CANCEL_SCHEDULED_KEY]: id } });
  } catch (metadataError) {
    console.error("CANCEL_SUBSCRIPTION_METADATA_ERROR:", id, metadataError);
  }

  return NextResponse.json({ cancelAtPeriodEnd: true, accessUntil: row.current_period_end || null });
}
