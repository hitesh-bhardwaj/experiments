import { NextResponse } from "next/server";
import { getEffectMetadata, buildEffectDeliveryPayload } from "@/lib/registry";
import { getCliTokenFromRequest } from "@/lib/cli-auth";
import { getEffectAccessDecision } from "@/lib/effect-access";
import { getInstallLimitDecision } from "@/lib/install-limit";
import { getRequestIp } from "@/lib/request-ip";
import { secondsUntilNextUtcMidnight } from "@/lib/utc-day";

// See docs/effect-access.md for how this route relates to
// /api/effects/[slug] (the legacy web route) and the effect detail page.

const REASON_STATUS = {
  "invalid-credential": 401,
  anonymous: 401,
  revoked: 403,
  "no-subscription": 403,
  expired: 403,
  error: 500,
};

const REASON_MESSAGE = {
  "invalid-credential": "Invalid CLI token.",
  anonymous: "Missing CLI token.",
  revoked: "This CLI token has been revoked.",
  "no-subscription": "This token does not belong to an active Pro account.",
  expired: "Your Pro subscription has expired.",
  error: "Unable to verify CLI token.",
};

export async function GET(request, { params }) {
  const { effectSlug } = await params;

  const effectMeta = getEffectMetadata(effectSlug);

  if (!effectMeta) {
    return NextResponse.json({ error: "Effect not found." }, { status: 404 });
  }

  const effectTier = effectMeta.tier || "free";
  const cliToken = getCliTokenFromRequest(request);

  const access = await getEffectAccessDecision({ effectTier, cliToken });

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: REASON_MESSAGE[access.reason] || "Access denied.",
        reason: access.reason,
        requiresPro: true,
      },
      { status: REASON_STATUS[access.reason] || 403 }
    );
  }

  // Content is only read from disk after the access decision above.
  const payload = buildEffectDeliveryPayload(effectSlug);

  // Stage 1 (Installation-SyncUp.md): record every real delivery through
  // install-limit so the ledger has real data to calibrate against before
  // enforcement turns on - shadow mode means this never affects what's
  // returned below, regardless of what it decides.
  // This route is shared by both the CLI and the MCP server (registry-client.ts
  // hits the same URL) - the mcp-version header is how we tell them apart for
  // attribution, since both would otherwise get miscounted as "cli".
  const mcpVersion = request.headers.get("x-hyperiux-mcp-version") || undefined;

  const installDecision = await getInstallLimitDecision({
    effectSlug,
    effectTier,
    source: mcpVersion ? "mcp" : "cli",
    cliToken,
    deviceId: request.headers.get("x-hyperiux-device-id") || undefined,
    ip: getRequestIp(request),
    isDependency: new URL(request.url).searchParams.get("dependency") === "1",
    cliVersion: request.headers.get("x-hyperiux-cli-version") || undefined,
    mcpVersion,
    userAgent: request.headers.get("user-agent") || undefined,
  });

  // Stage 3: only takes effect once INSTALL_LIMIT_ENFORCE=true - until then
  // installDecision.allowed is always true regardless of the real count (see
  // install-limit.js's shadow-mode semantics), so this branch is unreachable
  // in shadow mode and every request still falls through to the payload below.
  if (!installDecision.allowed) {
    const retryAfter = secondsUntilNextUtcMidnight();

    return NextResponse.json(
      {
        error: `Daily install limit reached (${installDecision.limit}/day). Try again in ${Math.ceil(retryAfter / 3600)}h, or upgrade to Pro for a higher limit.`,
        reason: installDecision.reason,
        rateLimited: true,
        limit: installDecision.limit,
        remaining: installDecision.remaining,
        retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // installLimit/installRemaining are surfaced on every successful delivery
  // (not just denials) so the CLI/MCP can print "N of M left today" the same
  // way the website's copy toast already does - null for admin/dependency
  // fetches, which never consume a slot.
  return NextResponse.json({
    ...payload,
    tier: effectTier,
    installLimit: installDecision.limit,
    installRemaining: installDecision.remaining,
  });
}
