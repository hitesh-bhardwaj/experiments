import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCliTokenFromRequest, resolveClerkUserIdFromCliToken } from "@/lib/cli-auth";

const ALLOWED_EVENTS = new Set(["init", "add"]);
const MAX_PROPERTIES_JSON_LENGTH = 4096;
const MAX_STRING_FIELD_LENGTH = 128;

function isShortString(value) {
  return typeof value === "string" && value.length <= MAX_STRING_FIELD_LENGTH;
}

// POST /api/cli/telemetry
// Fire-and-forget usage events from the `hyperiux` CLI (see
// packages/cli/src/utils/telemetry.js in hyperiux-components). Anonymous,
// unauthenticated, best-effort - the CLI never surfaces or retries failures.
export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const {
    event,
    anonymousId,
    cliVersion,
    platform,
    nodeVersion,
    properties,
    timestamp,
  } = body || {};

  if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  }

  if (!isShortString(anonymousId)) {
    return NextResponse.json({ error: "Invalid anonymousId." }, { status: 400 });
  }

  const propertiesJson =
    properties && typeof properties === "object" && !Array.isArray(properties)
      ? properties
      : {};

  if (JSON.stringify(propertiesJson).length > MAX_PROPERTIES_JSON_LENGTH) {
    return NextResponse.json({ error: "Properties payload too large." }, { status: 400 });
  }

  const clientTimestamp =
    typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))
      ? timestamp
      : null;

  // Best-effort attribution only - a missing/invalid/free-tier token still
  // records the event anonymously rather than rejecting it. This is what
  // lets a Pro user's CLI installs actually show up as theirs instead of
  // last_clerk_user_id always being null (see Installation-SyncUp.md §7.2).
  const cliToken = getCliTokenFromRequest(request);
  const clerkUserId = cliToken ? await resolveClerkUserIdFromCliToken(cliToken) : null;

  const { error } = await supabase.from("cli_telemetry_events").insert({
    event,
    anonymous_id: anonymousId,
    clerk_user_id: clerkUserId,
    cli_version: isShortString(cliVersion) ? cliVersion : null,
    platform: isShortString(platform) ? platform : null,
    node_version: isShortString(nodeVersion) ? nodeVersion : null,
    properties: propertiesJson,
    client_timestamp: clientTimestamp,
  });

  if (error) {
    console.error("CLI_TELEMETRY_INSERT_ERROR:", error);
    return NextResponse.json({ error: "Failed to record event." }, { status: 500 });
  }

  // Dedup by (anonymousId, effect) so a re-run of `add` on the same project
  // doesn't inflate the per-effect install count - see
  // packages/cli/FRAMEWORK_DETECTION_PLAN.md §3 in hyperiux-components.
  if (event === "add" && isShortString(propertiesJson.effect)) {
    const { error: dedupError } = await supabase
      .from("cli_effect_installs")
      .upsert(
        {
          anonymous_id: anonymousId,
          clerk_user_id: clerkUserId,
          effect: propertiesJson.effect,
          framework: isShortString(propertiesJson.framework)
            ? propertiesJson.framework
            : null,
          router: isShortString(propertiesJson.router)
            ? propertiesJson.router
            : null,
          package_manager: isShortString(propertiesJson.packageManager)
            ? propertiesJson.packageManager
            : null,
          last_installed_at: clientTimestamp || new Date().toISOString(),
        },
        { onConflict: "anonymous_id,effect" }
      );

    if (dedupError) {
      // Non-fatal: the raw event above is already persisted, and the
      // dedup table only backs the aggregate stats endpoint.
      console.error("CLI_EFFECT_INSTALL_UPSERT_ERROR:", dedupError);
    }
  }

  return new NextResponse(null, { status: 204 });
}
