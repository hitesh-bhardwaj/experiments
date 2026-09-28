import "server-only";
import { supabase } from "@/lib/supabase";
import { hashCliToken } from "@/lib/cli-token";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";

// Single authorization decision point for Pro effect content, used by all
// three places that decide whether to hand over source: the effect detail
// page (Clerk session), the CLI download route, and the legacy web API
// route (both CLI-token based). See docs/effect-access.md for the full
// entry-point map - if you're touching this file, check that doc too.

export const POLICY_VERSION = "1";

function decision(reason, allowed = false) {
  return { allowed, reason, policyVersion: POLICY_VERSION, source: "supabase" };
}

// Same plan/status/expiry/revocation logic regardless of how the caller's
// identity was resolved - this is the part that must never diverge between
// entry points.
function evaluateSubscriptionRow(row) {
  if (!row) return decision("no-subscription");

  if (row.cli_token_revoked_at) return decision("revoked");

  if (row.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(row.status)) {
    return decision("no-subscription");
  }

  if (row.current_period_end) {
    const periodEnd = new Date(row.current_period_end).getTime();

    if (!Number.isNaN(periodEnd) && periodEnd <= Date.now()) {
      return decision("expired");
    }
  }

  return decision("active-pro", true);
}

async function resolveByClerkUserId(clerkUserId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    console.error("EFFECT_ACCESS_SUPABASE_ERROR:", error);
    return decision("error");
  }

  return evaluateSubscriptionRow(data);
}

async function resolveByCliToken(cliToken) {
  if (!cliToken.startsWith("hpx_")) {
    return decision("invalid-credential");
  }

  const tokenHash = hashCliToken(cliToken);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("clerk_user_id, plan, status, current_period_end, cli_token_revoked_at")
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("EFFECT_ACCESS_SUPABASE_ERROR:", error);
    return decision("error");
  }

  if (!data) {
    return decision("invalid-credential");
  }

  // Fire-and-forget, matches the CLI route's prior last-used tracking.
  // Never blocks or fails the access decision itself.
  supabase
    .from("subscriptions")
    .update({ cli_token_last_used_at: new Date().toISOString() })
    .eq("clerk_user_id", data.clerk_user_id)
    .then(({ error: touchError }) => {
      if (touchError) console.error("EFFECT_ACCESS_TOUCH_ERROR:", touchError);
    });

  return evaluateSubscriptionRow(data);
}

/**
 * Decide whether a request may receive an effect's Pro source content.
 *
 * Exactly one of `clerkUserId` (browser/page requests, from Clerk's auth())
 * or `cliToken` (API requests, raw "hpx_..." bearer token) should be passed.
 * Neither present means anonymous.
 *
 * `reason` extends the illustrative set from the original audit finding
 * (free/active-pro/expired/anonymous/error) with two states that only make
 * sense once CLI tokens are in the picture: 'revoked' (token exists but was
 * revoked - distinct from never having had access, useful for support) and
 * 'invalid-credential' (a token was supplied but is malformed or unknown -
 * distinct from supplying nothing at all). 'admin' from the audit's example
 * was not included: no admin-bypass-for-Pro-effects behavior exists in this
 * codebase today (the /dashboard/admin role is unrelated to effect access),
 * so adding that reason without the behavior would be misleading.
 */
export async function getEffectAccessDecision({ effectTier = "free", clerkUserId, cliToken }) {
  if (!effectTier || effectTier === "free") {
    return decision("free", true);
  }

  if (clerkUserId) {
    return resolveByClerkUserId(clerkUserId);
  }

  if (cliToken) {
    return resolveByCliToken(cliToken);
  }

  return decision("anonymous");
}
