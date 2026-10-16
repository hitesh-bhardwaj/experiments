import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { razorpay } from "@/lib/razorpay";
import { isAdminUser } from "@/lib/admin";
import { ACCOUNT_DELETED_COOKIE } from "@/lib/account-deleted";

// "Delete account" in the dashboard's settings: the account and its data go for good.
//
// 1. A live Razorpay subscription is cancelled first - if that fails, nothing else is
//    touched (better a retry than a deleted account that keeps being billed).
// 2. The account's own data is removed: saves, template credits, usage history and the
//    subscription row (which holds the CLI token, so the token stops working).
//    Invoices and template purchases stay - tax records the law requires keeping.
//    CLI telemetry is anonymised rather than deleted.
// 3. The Clerk user is deleted last, which signs them out everywhere.
//
// Admin accounts can't delete themselves here (another super admin removes their access first).

const LIVE_STATUSES = new Set(["created", "authenticated", "active", "pending", "halted"]);

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { confirm } = await request.json().catch(() => ({}));
  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }

  const user = await currentUser();
  if (isAdminUser(user)) {
    return NextResponse.json({ error: "Admin accounts can't be deleted here. Ask a super admin to remove your access first." }, { status: 403 });
  }

  // 1. Stop billing
  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (subscriptionError) {
    console.error("DELETE_ACCOUNT_SUBSCRIPTION_ERROR:", subscriptionError);
    return NextResponse.json({ error: "Couldn't delete your account. Please try again." }, { status: 500 });
  }
  if (subscription?.razorpay_subscription_id) {
    try {
      const live = await razorpay.subscriptions.fetch(subscription.razorpay_subscription_id);
      if (LIVE_STATUSES.has(live?.status)) await razorpay.subscriptions.cancel(subscription.razorpay_subscription_id, false);
    } catch (error) {
      console.error("DELETE_ACCOUNT_CANCEL_ERROR:", subscription.razorpay_subscription_id, error);
      return NextResponse.json({ error: "We couldn't cancel your subscription, so nothing was deleted. Please try again or contact support." }, { status: 502 });
    }
  }

  // 2. Remove the account's data (billing records stay)
  const steps = [
    supabase.from("wishlisted_effects").delete().eq("clerk_user_id", userId),
    supabase.from("wishlisted_templates").delete().eq("clerk_user_id", userId),
    supabase.from("template_credits").delete().eq("clerk_user_id", userId),
    supabase.from("install_unlocks").delete().eq("clerk_user_id", userId),
    supabase.from("install_events").delete().eq("clerk_user_id", userId),
    supabase.from("cli_telemetry_events").update({ clerk_user_id: null }).eq("clerk_user_id", userId),
    supabase.from("subscriptions").delete().eq("clerk_user_id", userId),
  ];
  const results = await Promise.all(steps);
  const failed = results.find((result) => result.error);
  if (failed) {
    console.error("DELETE_ACCOUNT_DATA_ERROR:", failed.error);
    return NextResponse.json({ error: "Couldn't remove all of your data. Please try again." }, { status: 500 });
  }

  // 3. The account itself
  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch (error) {
    console.error("DELETE_ACCOUNT_CLERK_ERROR:", error);
    return NextResponse.json({ error: "Your data was removed but the account couldn't be closed. Please try again." }, { status: 500 });
  }

  // A short-lived marker for this browser: its dashboard pages (Back after deleting) go to
  // the effects instead of the sign-in page (proxy.js, DashboardShell)
  const res = NextResponse.json({ deleted: true });
  res.cookies.set(ACCOUNT_DELETED_COOKIE, "1", { maxAge: 15 * 60, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}
