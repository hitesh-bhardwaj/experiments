import { NextResponse } from "next/server";
import { getEffectMetadata, buildEffectDeliveryPayload } from "@/lib/registry";
import { getCliTokenFromRequest } from "@/lib/cli-auth";
import { getEffectAccessDecision } from "@/lib/effect-access";
import { getInstallLimitDecision } from "@/lib/install-limit";
import { getRequestIp } from "@/lib/request-ip";
import { secondsUntilNextUtcMidnight } from "@/lib/utc-day";

// Legacy web-facing twin of /api/cli/effects/[effectSlug] - same
// CLI-token-based auth, same content source. Previously fetched Pro source
// live from the private GitHub repo's Contents API and hand-rolled its own
// token verification (missing the revocation check the CLI route had),
// which is exactly the drift the F-040 consolidation was meant to close.
// See docs/effect-access.md for the full entry-point map.

const REASON_STATUS = {
  "invalid-credential": 401,
  anonymous: 401,
  revoked: 403,
  "no-subscription": 403,
  expired: 403,
  error: 500,
};

const REASON_MESSAGE = {
  "invalid-credential": "Invalid token.",
  anonymous: "Authorization token required.",
  revoked: "This token has been revoked.",
  "no-subscription": "Pro subscription required.",
  expired: "Subscription has expired.",
  error: "Unable to verify token.",
};

export async function GET(req, { params }) {
  const { slug } = await params;

  const effectMeta = getEffectMetadata(slug);

  if (!effectMeta) {
    return NextResponse.json({ error: `Effect "${slug}" not found.` }, { status: 404 });
  }

  const effectTier = effectMeta.tier || "free";
  const cliToken = getCliTokenFromRequest(req);

  const access = await getEffectAccessDecision({ effectTier, cliToken });

  if (!access.allowed) {
    return NextResponse.json(
      {
        error: REASON_MESSAGE[access.reason] || "Access denied.",
        reason: access.reason,
      },
      { status: REASON_STATUS[access.reason] || 403 }
    );
  }

  const payload = buildEffectDeliveryPayload(slug);

  // Stage 1 (Installation-SyncUp.md): same shadow-mode logging as the CLI
  // twin route - never affects what's returned below. Also shared by the MCP
  // server, same mcp-version-header disambiguation as the CLI twin route.
  const mcpVersion = req.headers.get("x-hyperiux-mcp-version") || undefined;

  const installDecision = await getInstallLimitDecision({
    effectSlug: slug,
    effectTier,
    source: mcpVersion ? "mcp" : "cli",
    cliToken,
    deviceId: req.headers.get("x-hyperiux-device-id") || undefined,
    ip: getRequestIp(req),
    isDependency: new URL(req.url).searchParams.get("dependency") === "1",
    cliVersion: req.headers.get("x-hyperiux-cli-version") || undefined,
    mcpVersion,
    userAgent: req.headers.get("user-agent") || undefined,
  });

  // Stage 3: only takes effect once INSTALL_LIMIT_ENFORCE=true - see the
  // identical note in the CLI twin route.
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

  // See the identical note in the CLI twin route: surfaced on success too,
  // not just denials, so callers can show "N of M left today".
  return NextResponse.json({
    ...payload,
    tier: effectTier,
    installLimit: installDecision.limit,
    installRemaining: installDecision.remaining,
  });
}
