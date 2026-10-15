import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserPlan, getUserPlanInfo } from "@/lib/subscription";
import { getRole, isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

const NO_STORE = { headers: { "Cache-Control": "private, no-store" } };

// The signed-in visitor's plan ("free" | "pro"), for pages that are cached
// (ISR) and so can't read the session on the server themselves.
// With ?detail=1 (the dashboard sidebar's plan card) it also returns the tier, the
// billing interval, when the current period ends, and whether (and which kind of) admin.
export async function GET(request) {
  const { userId } = await auth();

  if (new URL(request.url).searchParams.get("detail")) {
    if (!userId) return NextResponse.json({ plan: "free" }, NO_STORE);
    try {
      const [user, { plan, tier }, { data: subscription }] = await Promise.all([
        currentUser(),
        getUserPlanInfo(userId),
        supabase.from("subscriptions").select("billing_interval, current_period_end").eq("clerk_user_id", userId).maybeSingle(),
      ]);
      return NextResponse.json(
        {
          plan,
          tier,
          isAdmin: isAdminUser(user),
          // "admin" | "super_admin" | null
          role: getRole(user),
          billingInterval: subscription?.billing_interval || null,
          planValidUntil: subscription?.current_period_end || null,
        },
        NO_STORE,
      );
    } catch {
      return NextResponse.json({ plan: "free" }, NO_STORE);
    }
  }

  let plan = "free";
  try {
    plan = await getUserPlan(userId);
  } catch {
    // Treat a lookup failure as free; the copy / install routes re-check access.
  }
  return NextResponse.json({ plan }, NO_STORE);
}
