import "server-only";
import crypto from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getUserPlanInfo } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import { isAdminUser } from "@/lib/admin";
import { resolveClerkUserIdFromCliToken } from "@/lib/cli-auth";

// Single decision point for "does this request get to consume an install of
// this effect today" across all three surfaces (website copy, `hyperiux add`,
// MCP `include_source`) - sibling to effect-access.js, same discipline. See
// Installation-SyncUp.md for the full plan this implements.

// Unique effects a day, shared across web copies, CLI and MCP. The paid
// tiers' limits come from plans.js (Pro 5, Pro+ 10).
// Signed-out callers get none: every install needs an account, even for free
// effects (see the sign-in check in getInstallLimitDecision).
export const LIMITS = {
  free: 3,
  pro: PLANS.pro.installsPerDay,
  pro_plus: PLANS.pro_plus.installsPerDay,
  admin: null,
};

// The daily limit for a signed-in user's tier ("free" | "pro" | "pro_plus")
export function getLimitForTier(tier, { isAdmin = false } = {}) {
  if (isAdmin) return LIMITS.admin;
  return LIMITS[tier] ?? LIMITS.free;
}
export const LIMIT_POLICY_VERSION = "1";

// A function, not a module-load-time constant, so tests can flip
// process.env.INSTALL_LIMIT_ENFORCE between cases without vi.resetModules().
function isEnforced() {
  return process.env.INSTALL_LIMIT_ENFORCE === "true";
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// IPs are low-entropy compared to a random CLI token, so unlike
// hashCliToken() this needs a salt to resist a rainbow-table reversal back
// to a real IP. Falls back to a random per-process salt (resets on every
// restart - fine for shadow mode, must be set for production enforcement)
// rather than hard-failing the whole module when unset.
const RUNTIME_FALLBACK_IP_SALT = crypto.randomBytes(32).toString("hex");
let warnedMissingIpSalt = false;

function getIpSalt() {
  if (process.env.INSTALL_LIMIT_IP_SALT) return process.env.INSTALL_LIMIT_IP_SALT;

  if (!warnedMissingIpSalt) {
    warnedMissingIpSalt = true;
    console.warn(
      "INSTALL_LIMIT_IP_SALT is not set - IP hashing is using a salt that " +
        "resets on every process restart. Set INSTALL_LIMIT_IP_SALT in production."
    );
  }

  return RUNTIME_FALLBACK_IP_SALT;
}

export function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(`${ip}:${getIpSalt()}`).digest("hex");
}

function decision(reason, overrides = {}) {
  return {
    allowed: false,
    reason,
    limit: null,
    count: 0,
    remaining: null,
    identityKey: null,
    plan: null,
    tier: null,
    enforced: isEnforced(),
    ...overrides,
  };
}

// Exported for callers that need identity/plan context without making a
// claim (e.g. a GET endpoint rendering "you have N of M left" on page load).
export async function resolveSignedInIdentity(clerkUserId) {
  const [planInfo, clerkUser] = await Promise.all([
    getUserPlanInfo(clerkUserId),
    clerkClient()
      .then((c) => c.users.getUser(clerkUserId))
      .catch((error) => {
        console.error("INSTALL_LIMIT_CLERK_USER_LOOKUP_ERROR:", error);
        return null;
      }),
  ]);

  const isAdmin = isAdminUser(clerkUser);
  const plan = isAdmin ? "admin" : planInfo.plan;
  const tier = isAdmin ? "admin" : planInfo.tier;

  return {
    identityKey: `user:${clerkUserId}`,
    clerkUserId,
    isAdmin,
    plan,
    tier,
    limit: getLimitForTier(planInfo.tier, { isAdmin }),
  };
}

async function claimSlot({ identityKey, clerkUserId, usageDate, effectSlug, source, limit }) {
  const { data, error } = await supabase.rpc("claim_install_slot", {
    p_identity_key: identityKey,
    p_usage_date: usageDate,
    p_effect_slug: effectSlug,
    p_source: source,
    p_limit: limit,
    p_clerk_user_id: clerkUserId ?? null,
  });

  if (error) {
    console.error("CLAIM_INSTALL_SLOT_ERROR:", error);
    return null;
  }

  return data?.[0] ?? null;
}

// install_unlocks (claimSlot, above) goes through an atomic RPC and can't
// silently lose a row. This insert is a separate, non-atomic call right
// after it - on real data, a fraction of these were failing (a transient
// Supabase error, the 5s query timeout in lib/supabase.js) and, since the
// caller never awaited or checked this beyond a console.error, going
// unnoticed: install_unlocks would accrue a real row with no matching
// install_events row to show for it. One immediate retry (no backoff -
// this is already the tail end of the request, and a second consecutive
// failure is worth surfacing rather than delaying further) closes most of
// that gap without slowing down the common case.
async function logInstallEvent(row) {
  const { error: firstError } = await supabase.from("install_events").insert(row);

  if (!firstError) return;

  console.error("INSTALL_EVENT_LOG_ERROR (retrying once):", firstError);

  const { error: retryError } = await supabase.from("install_events").insert(row);

  if (retryError) {
    console.error("INSTALL_EVENT_LOG_ERROR (retry failed):", retryError);
  }
}

// Read-only: which effects has this identity already unlocked today. No
// claim, no event log - for rendering current usage (e.g. copy-usage's GET),
// not for deciding whether a new install should be allowed.
export async function getUnlockedEffectSlugsToday({ clerkUserId }) {
  const { data, error } = await supabase
    .from("install_unlocks")
    .select("effect_slug")
    .eq("identity_key", `user:${clerkUserId}`)
    .eq("usage_date", todayUTC());

  if (error) {
    console.error("GET_UNLOCKED_EFFECT_SLUGS_ERROR:", error);
    return [];
  }

  return (data || []).map((row) => row.effect_slug);
}

/**
 * Decide whether a request may consume an install of one effect today, and
 * record it. Always makes the real atomic claim against install_unlocks
 * regardless of shadow/enforce mode - claim_install_slot itself already
 * refuses to insert past the limit, so the ledger accrues real data safe to
 * flip enforcement on top of later. The only thing shadow mode changes is
 * whether the boolean handed back to the *caller* respects that claim.
 *
 * Exactly one of `clerkUserId` or `cliToken` should be set; neither means a
 * signed-out caller, who is always refused ("sign-in-required").
 */
export async function getInstallLimitDecision({
  effectSlug,
  effectTier,
  source, // 'web' | 'cli' | 'mcp'
  clerkUserId,
  cliToken,
  deviceId,
  ip,
  isDependency = false,
  cliVersion,
  mcpVersion,
  userAgent,
  anonymousProjectId,
  telemetryDisabled = false,
}) {
  if (!effectSlug || !source) {
    throw new Error("getInstallLimitDecision requires effectSlug and source");
  }

  const usageDate = todayUTC();
  const resolvedClerkUserId = clerkUserId || (cliToken ? await resolveClerkUserIdFromCliToken(cliToken) : null);

  const telemetry = {
    cli_version: telemetryDisabled ? null : cliVersion ?? null,
    mcp_version: telemetryDisabled ? null : mcpVersion ?? null,
    user_agent: telemetryDisabled ? null : userAgent ?? null,
    anonymous_project_id: telemetryDisabled ? null : anonymousProjectId ?? null,
  };

  // No account, no install - free effects included, and in shadow mode too (this is
  // access, not usage shaping). Checked before the dependency shortcut below, so
  // `?dependency=1` can't be used to fetch code signed out. The attempt is logged
  // (not for dependencies), so the admin pages can see sign-in-wall demand.
  if (!resolvedClerkUserId) {
    const ipHash = hashIp(ip);
    if (!isDependency) {
      await logInstallEvent({
        identity_key: deviceId ? `device:${deviceId}` : ipHash ? `ip:${ipHash}` : "anonymous",
        clerk_user_id: null,
        device_id: deviceId ?? null,
        ip_hash: ipHash,
        effect_slug: effectSlug,
        effect_tier: effectTier ?? null,
        source,
        plan: "anonymous",
        decision: "denied",
        reason: "sign-in-required",
        enforced: true,
        would_have_denied: true,
        ...telemetry,
      });
    }
    return decision("sign-in-required", { plan: "anonymous", enforced: true });
  }

  // registryDependencies pulled in transitively never consume quota -
  // otherwise one `add` of a composite effect could eat a user's entire
  // daily allowance. Not logged either: it's not a real install attempt.
  if (isDependency) {
    return decision("dependency", { allowed: true });
  }

  const identity = await resolveSignedInIdentity(resolvedClerkUserId);

  if (identity.isAdmin) {
    // Admins aren't metered - no claim, no ledger row, matches the existing
    // copy-usage/effect-access precedent. The install is still logged (plan
    // "admin"), so the admin's own dashboard Usage tab has a history to show.
    await logInstallEvent({
      identity_key: identity.identityKey,
      clerk_user_id: identity.clerkUserId ?? null,
      device_id: deviceId ?? null,
      ip_hash: null,
      effect_slug: effectSlug,
      effect_tier: effectTier ?? null,
      source,
      plan: "admin",
      decision: "allowed",
      reason: "admin",
      enforced: isEnforced(),
      would_have_denied: false,
      ...telemetry,
    });
    return decision("admin", { allowed: true, identityKey: identity.identityKey, plan: "admin", tier: "admin", limit: null });
  }

  const claim = await claimSlot({
    identityKey: identity.identityKey,
    clerkUserId: identity.clerkUserId,
    usageDate,
    effectSlug,
    source,
    limit: identity.limit,
  });

  if (!claim) return decision("error", { identityKey: identity.identityKey, plan: identity.plan, tier: identity.tier, limit: identity.limit });

  const naturalAllowed = Boolean(claim.allowed);
  const reason = claim.already_unlocked ? "already-unlocked" : naturalAllowed ? "allowed" : "limit-reached";

  await logInstallEvent({
    identity_key: identity.identityKey,
    clerk_user_id: identity.clerkUserId ?? null,
    device_id: deviceId ?? null,
    ip_hash: null,
    effect_slug: effectSlug,
    effect_tier: effectTier ?? null,
    source,
    // The tier, so the admin installs view can tell Pro from Pro+ ("free" | "pro" | "pro_plus")
    plan: identity.tier ?? identity.plan ?? null,
    decision: claim.already_unlocked ? "already-unlocked" : naturalAllowed ? "allowed" : "denied",
    reason,
    enforced: isEnforced(),
    would_have_denied: !naturalAllowed,
    ...telemetry,
  });

  return decision(reason, {
    // Shadow mode (INSTALL_LIMIT_ENFORCE unset): the limit is recorded, not applied
    allowed: isEnforced() ? naturalAllowed : true,
    limit: identity.limit ?? null,
    count: claim.claim_count ?? 0,
    remaining: claim.remaining ?? null,
    identityKey: identity.identityKey,
    plan: identity.plan ?? null,
    tier: identity.tier ?? null,
  });
}
