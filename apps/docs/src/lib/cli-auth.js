import "server-only";
import { supabase } from "@/lib/supabase";
import { hashCliToken } from "@/lib/cli-token";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";

export function getCliTokenFromRequest(request) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  const headerToken = request.headers.get("x-hyperiux-token");

  if (headerToken) {
    return headerToken.trim();
  }

  return null;
}

// Lenient counterpart to verifyCliToken(): resolves whichever clerk_user_id
// a token belongs to for *attribution* purposes (telemetry, install-limit
// identity), without gating on plan/active-status the way content-access
// decisions do. A free or expired-pro user's token should still correctly
// attribute their installs to them - only a missing/malformed/revoked token
// resolves to no identity at all.
export async function resolveClerkUserIdFromCliToken(token) {
  if (!token || !token.startsWith("hpx_")) return null;

  const tokenHash = hashCliToken(token);
  const { data, error } = await supabase
    .from("subscriptions")
    .select("clerk_user_id, cli_token_revoked_at")
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("RESOLVE_CLERK_USER_ID_FROM_CLI_TOKEN_ERROR:", error);
    return null;
  }
  if (!data || data.cli_token_revoked_at) return null;

  return data.clerk_user_id;
}

export async function verifyCliToken(token) {
  if (!token) {
    return {
      valid: false,
      status: 401,
      reason: "Missing CLI token.",
    };
  }

  if (!token.startsWith("hpx_")) {
    return {
      valid: false,
      status: 401,
      reason: "Invalid CLI token format.",
    };
  }

  const tokenHash = hashCliToken(token);

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "clerk_user_id, plan, status, current_period_end, cli_token_hash, cli_token_revoked_at"
    )
    .eq("cli_token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("CLI_TOKEN_VERIFY_ERROR:", error);

    return {
      valid: false,
      status: 500,
      reason: "Unable to verify CLI token.",
    };
  }

  if (!data) {
    return {
      valid: false,
      status: 401,
      reason: "Invalid CLI token.",
    };
  }

  if (data.cli_token_revoked_at) {
    return {
      valid: false,
      status: 401,
      reason: "This CLI token has been revoked.",
    };
  }

  if (data.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(data.status)) {
    return {
      valid: false,
      status: 403,
      reason: "This token does not belong to an active Pro account.",
    };
  }

  if (data.current_period_end) {
    const periodEnd = new Date(data.current_period_end).getTime();

    if (!Number.isNaN(periodEnd) && periodEnd <= Date.now()) {
      return {
        valid: false,
        status: 403,
        reason: "Your Pro subscription has expired.",
      };
    }
  }

  await supabase
    .from("subscriptions")
    .update({
      cli_token_last_used_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", data.clerk_user_id);

  return {
    valid: true,
    status: 200,
    clerkUserId: data.clerk_user_id,
  };
}