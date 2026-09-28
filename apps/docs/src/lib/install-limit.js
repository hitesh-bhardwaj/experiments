import "server-only";
import crypto from "crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { getUserPlan } from "@/lib/subscription";
import { isAdminUser } from "@/lib/admin";
import { resolveClerkUserIdFromCliToken } from "@/lib/cli-auth";

// Single decision point for "does this request get to consume an install of
// this effect today" across all three surfaces (website copy, `hyperiux add`,
// MCP `include_source`) - sibling to effect-access.js, same discipline. See
// Installation-SyncUp.md for the full plan this implements.

export const LIMITS = { anonymous: 1, free: 3, pro: 10, admin: null, ip: 10 };
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
    enforced: isEnforced(),
    ...overrides,
  };
}

// Exported for callers that need identity/plan context without making a
// claim (e.g. a GET endpoint rendering "you have N of M left" on page load).
export async function resolveSignedInIdentity(clerkUserId) {
  const [rawPlan, clerkUser] = await Promise.all([
    getUserPlan(clerkUserId),
    clerkClient()
      .then((c) => c.users.getUser(clerkUserId))
      .catch((error) => {
        console.error("INSTALL_LIMIT_CLERK_USER_LOOKUP_ERROR:", error);
        return null;
      }),
  ]);

  const isAdmin = isAdminUser(clerkUser);
  const plan = isAdmin ? "admin" : rawPlan;

  return {
    identityKey: `user:${clerkUserId}`,
    clerkUserId,
    isAdmin,
    plan,
    limit: isAdmin ? LIMITS.admin : rawPlan === "pro" ? LIMITS.pro : LIMITS.free,
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
 * Exactly one of `clerkUserId` or `cliToken` should be set for a signed-in
 * caller; neither means anonymous, resolved via `deviceId`/`ip` instead.
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

  // registryDependencies pulled in transitively never consume quota -
  // otherwise one `add` of a composite effect could eat a user's entire
  // daily allowance. Not logged either: it's not a real install attempt.
  if (isDependency) {
    return decision("dependency", { allowed: true });
  }

  const usageDate = todayUTC();
  const resolvedClerkUserId = clerkUserId || (cliToken ? await resolveClerkUserIdFromCliToken(cliToken) : null);

  let identity;

  if (resolvedClerkUserId) {
    identity = await resolveSignedInIdentity(resolvedClerkUserId);
  } else {
    const ipHash = hashIp(ip);
    const deviceKey = deviceId ? `device:${deviceId}` : null;
    const ipKey = ipHash ? `ip:${ipHash}` : null;

    if (!deviceKey && !ipKey) {
      // No identity at all - can't attribute or limit, deny by policy.
      // Rare in practice (web anonymous reads are unmetered, see risk #4,
      // and a request without any resolvable IP is unusual) - but a missing
      // device ID alone is common and handled below, not here: it falls
      // back to the IP as this caller's identity rather than hitting this
      // branch.
      return decision("no-identity");
    }

    identity = { deviceKey, ipKey, isAnonymous: true, plan: "anonymous" };
  }

  async function recordAndReturn({ identityKey, claim, reason, limit }) {
    const naturalAllowed = Boolean(claim?.allowed);
    const finalAllowed = isEnforced() ? naturalAllowed : true;
    const decisionLabel = claim?.already_unlocked ? "already-unlocked" : naturalAllowed ? "allowed" : "denied";

    await logInstallEvent({
      identity_key: identityKey,
      clerk_user_id: identity.clerkUserId ?? null,
      device_id: deviceId ?? null,
      ip_hash: identity.isAnonymous ? hashIp(ip) : null,
      effect_slug: effectSlug,
      effect_tier: effectTier ?? null,
      source,
      plan: identity.plan ?? null,
      decision: decisionLabel,
      reason,
      enforced: isEnforced(),
      would_have_denied: !naturalAllowed,
      cli_version: telemetryDisabled ? null : cliVersion ?? null,
      mcp_version: telemetryDisabled ? null : mcpVersion ?? null,
      user_agent: telemetryDisabled ? null : userAgent ?? null,
      anonymous_project_id: telemetryDisabled ? null : anonymousProjectId ?? null,
    });

    return decision(reason, {
      allowed: finalAllowed,
      limit: claim ? (identity.isAdmin ? null : (limit ?? null)) : null,
      count: claim?.claim_count ?? 0,
      remaining: claim?.remaining ?? null,
      identityKey,
      plan: identity.plan ?? null,
    });
  }

  if (!identity.isAnonymous) {
    if (identity.isAdmin) {
      // Admins bypass entirely - no claim, no ledger row, matches the
      // existing copy-usage/effect-access precedent of never metering them.
      return decision("admin", { allowed: true, identityKey: identity.identityKey, plan: "admin", limit: null });
    }

    const claim = await claimSlot({
      identityKey: identity.identityKey,
      clerkUserId: identity.clerkUserId,
      usageDate,
      effectSlug,
      source,
      limit: identity.limit,
    });

    if (!claim) return decision("error", { identityKey: identity.identityKey, plan: identity.plan, limit: identity.limit });

    return recordAndReturn({
      identityKey: identity.identityKey,
      claim,
      reason: claim.already_unlocked ? "already-unlocked" : claim.allowed ? "allowed" : "limit-reached",
      limit: identity.limit,
    });
  }

  // Anonymous: checked against both device and IP buckets, stricter wins.
  // Device is claimed first (lower limit, more likely to be the binding
  // constraint, cheaper to short-circuit on). If it denies, the IP bucket
  // is never touched. If device allows but the IP bucket then denies, the
  // device slot has already been spent for this effect - an accepted
  // imperfection given this is usage-shaping, not a security boundary (see
  // Installation-SyncUp.md risk #1); retrying the same effect is still free
  // via the device bucket's own already-unlocked check.
  let deviceClaim = null;
  let ipClaim = null;

  if (identity.deviceKey) {
    deviceClaim = await claimSlot({
      identityKey: identity.deviceKey,
      clerkUserId: null,
      usageDate,
      effectSlug,
      source,
      limit: LIMITS.anonymous,
    });

    if (deviceClaim && !deviceClaim.allowed) {
      return recordAndReturn({
        identityKey: identity.deviceKey,
        claim: deviceClaim,
        reason: "limit-reached",
        limit: LIMITS.anonymous,
      });
    }
  }

  // LIMITS.ip only exists to keep many *different* real devices sharing one
  // network (an office, a CI runner) from all getting falsely capped once
  // they've each already passed their own device check above. It was never
  // meant to apply to a single caller who simply never sent a device ID -
  // that caller has no other identity, so the IP *is* them, and they must
  // get the same strict per-anonymous-caller limit a device ID would have
  // gotten them. Skipping this bucket entirely once a device already
  // claimed successfully avoids double-spending: a shared-IP ceiling is a
  // real, separate check in that case, not "the" check.
  if (identity.ipKey && !identity.deviceKey) {
    ipClaim = await claimSlot({
      identityKey: identity.ipKey,
      clerkUserId: null,
      usageDate,
      effectSlug,
      source,
      limit: LIMITS.anonymous,
    });
  } else if (identity.ipKey) {
    ipClaim = await claimSlot({
      identityKey: identity.ipKey,
      clerkUserId: null,
      usageDate,
      effectSlug,
      source,
      limit: LIMITS.ip,
    });
  }

  const primaryClaim = deviceClaim ?? ipClaim;
  const primaryKey = identity.deviceKey ?? identity.ipKey;

  if (!primaryClaim) return decision("error", { identityKey: primaryKey, plan: "anonymous" });

  // Stricter verdict wins: only truly allowed if every bucket that ran
  // allowed it.
  const bothAllowed = [deviceClaim, ipClaim].filter(Boolean).every((c) => c.allowed);
  const effectiveClaim = { ...primaryClaim, allowed: bothAllowed };

  return recordAndReturn({
    identityKey: primaryKey,
    claim: effectiveClaim,
    reason: effectiveClaim.already_unlocked ? "already-unlocked" : bothAllowed ? "allowed" : "limit-reached",
    // Without a device key, the IP claim above always runs against
    // LIMITS.anonymous (there's no other bucket in play) - report that,
    // allowed or denied. With a device key, it's the original logic: device
    // always checked first and short-circuits its own denial above (a
    // truthy deviceKey reaching this point already passed), so a denial
    // here is always the IP bucket's real (looser) limit, and a success
    // reports the device's own (stricter) limit, since that's the primary
    // claim a device-having caller was actually bound by.
    limit: identity.deviceKey ? (bothAllowed ? LIMITS.anonymous : LIMITS.ip) : LIMITS.anonymous,
  });
}
