import "server-only";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

// The one canonical list of subscription statuses that count as "currently
// has Pro" - shared by every place that gates on plan/status, so a status
// accepted as "paid" in one place (e.g. admin revenue counting) can never
// silently be rejected as "not active" in another (e.g. CLI/MCP content
// access). Previously duplicated - and inconsistently - across this file,
// effect-access.js, cli-auth.js, and pro-access.js (which used
// ["authenticated", "active"] while the other three used
// ["active", "trialing"]); a Razorpay subscriber sitting in "authenticated"
// (mandate approved, first charge pending) could be counted as a paying
// customer in the admin dashboard while their CLI token was rejected for
// actual Pro content. "trialing" is kept for forward-compatibility even
// though this integration doesn't currently create trial subscriptions.
export const ACTIVE_PRO_STATUSES = ["authenticated", "active", "trialing"];

// Short-lived last-known-good cache, keyed by clerk_user_id. Exists only to
// bridge brief Supabase blips: on a genuine query error, serve the last
// verified plan if still fresh, otherwise fail closed to "free". Never used
// to grant pro from Clerk metadata alone - Supabase stays the sole source
// of truth for *active* pro access, error or not.
const PLAN_CACHE_TTL_MS = 60_000;
const planCache = new Map();

export function invalidatePlanCache(userId) {
  if (userId) planCache.delete(userId);
}

export async function getUserPlan(userId) {
  if (!userId) {
    return "free";
  }

  // Was previously only consulted after a Supabase error - every single
  // call re-queried Supabase even for a user who'd been checked seconds
  // ago on the previous page. Checking it first turns this into a real
  // cache (one Supabase round trip per user per TTL window) instead of a
  // fallback that only ever helped after something had already gone wrong.
  const freshCached = planCache.get(userId);
  if (freshCached && freshCached.expiresAt > Date.now()) {
    return freshCached.plan;
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("GET_USER_PLAN_SUPABASE_ERROR:", error);

    const cached = planCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.plan;
    }

    // No fresh cached value and Supabase itself errored - fail closed
    // rather than falling through to Clerk metadata, which isn't a
    // verified source of truth for revocation.
    return "free";
  }

  let plan = "free";
  let isExpired = false;

  if (data?.plan === "pro" && ACTIVE_PRO_STATUSES.includes(data.status)) {
    if (!data.current_period_end) {
      plan = "pro";
    } else {
      const periodEnd = new Date(data.current_period_end).getTime();
      if (Number.isNaN(periodEnd) || periodEnd > Date.now()) {
        plan = "pro";
      } else {
        isExpired = true;
      }
    }
  }

  if (plan === "free" && !data) {
    // Legitimate "no row at all yet" case (Supabase queried successfully,
    // nothing on file) - bridges the window between a successful checkout
    // and the webhook writing the Supabase row. Deliberately NOT used when
    // a row exists but is expired/inactive: Clerk's publicMetadata is only
    // ever cleared by a webhook (real subscriptions) or the admin route
    // (manual grants) - an expired row has neither in flight, so falling
    // through here would resurrect access from stale metadata forever.
    const user = await currentUser();

    if (
      user?.publicMetadata?.plan === "pro" ||
      user?.publicMetadata?.proAccess === true
    ) {
      plan = "pro";
    }
  }

  if (isExpired) {
    // Manually-granted pro (admin route) has no real Razorpay subscription
    // behind it, so no webhook ever fires to downgrade it - this is the
    // only place that happens, lazily, on the next time anything checks
    // this user's plan. Real subscriptions should already be caught up by
    // their own webhook before current_period_end passes; this is a safety
    // net for both, not admin-grant-specific.
    await supabase
      .from("subscriptions")
      .update({ plan: "free", status: "expired", updated_at: new Date().toISOString() })
      .eq("clerk_user_id", userId);

    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);

      // Same field set markUserFree() clears on a real cancellation/expiry
      // webhook - this is the manual-grant/missed-webhook equivalent, so it
      // shouldn't leave a different (stale) shape behind in publicMetadata.
      await clerk.users.updateUser(userId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          plan: "free",
          proAccess: false,
          billingInterval: null,
          subscriptionStatus: "expired",
          currentPeriodEnd: null,
          razorpaySubscriptionId: null,
          razorpayPlanId: null,
        },
      });
    } catch (metaError) {
      console.error("GET_USER_PLAN_SELF_HEAL_CLERK_ERROR:", metaError);
    }
  }

  planCache.set(userId, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL_MS });

  return plan;
}