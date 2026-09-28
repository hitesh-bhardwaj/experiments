import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { resolveDateBounds } from "@/lib/admin-activity";

// install_events is the full per-attempt audit trail (web/CLI/MCP) written by
// getInstallLimitDecision() in lib/install-limit.js - "allowed" and
// "already-unlocked" are the two decisions that represent an actual
// successful copy; "denied" rows are attempts that didn't happen, not
// something a "who copied what" feed should list.
const SUCCESS_DECISIONS = ["allowed", "already-unlocked"];

// Matches the ceiling on /api/admin/users - the page-size selector in the
// admin UI tops out at 500, so a smaller cap here would silently truncate a
// "500 per page" request to 100 rows while pagination math (total / 500)
// keeps assuming the full page size, skipping rows between pages.
const MAX_LIMIT = 500;

export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const effectSearch = searchParams.get("effect") || "";
    const source = searchParams.get("source") || "";
    const range = searchParams.get("range") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), MAX_LIMIT);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { startISO, endISO } = resolveDateBounds({ range, from, to });

    let query = supabase
      .from("install_events")
      .select(
        "id, occurred_at, identity_key, clerk_user_id, effect_slug, source, decision",
        { count: "exact" }
      )
      .in("decision", SUCCESS_DECISIONS)
      .order("occurred_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (effectSearch) query = query.ilike("effect_slug", `%${effectSearch}%`);
    if (source && source !== "all") query = query.eq("source", source);
    if (startISO) query = query.gte("occurred_at", startISO);
    if (endISO) query = query.lt("occurred_at", endISO);

    const [{ data: rows, error, count }, sanityEntries] = await Promise.all([
      query,
      getAllSanityEffectEntries(),
    ]);

    if (error) {
      console.error("ADMIN_COPY_ACTIVITY_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sanityEffectsBySlug = new Map(
      buildEffectsFromSanity(sanityEntries).map((effect) => [effect.name, effect])
    );
    function resolveTitle(slug) {
      return sanityEffectsBySlug.get(slug)?.title || getEffectMetadata(slug)?.title || slug;
    }

    const clerkUserIds = [...new Set((rows || []).map((r) => r.clerk_user_id).filter(Boolean))];
    let clerkMap = {};
    if (clerkUserIds.length > 0) {
      const clerk = await clerkClient();
      const results = await clerk.users.getUserList({
        userId: clerkUserIds,
        limit: clerkUserIds.length,
      });
      clerkMap = Object.fromEntries((results.data || []).map((u) => [u.id, u]));
    }

    const events = (rows || []).map((row) => {
      const clerkUser = row.clerk_user_id ? clerkMap[row.clerk_user_id] : null;

      return {
        id: row.id,
        occurredAt: row.occurred_at,
        userId: row.clerk_user_id,
        userName: clerkUser?.fullName || clerkUser?.firstName || null,
        userEmail: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
        userImageUrl: clerkUser?.imageUrl || null,
        identityKey: row.identity_key,
        effectSlug: row.effect_slug,
        effectTitle: resolveTitle(row.effect_slug),
        source: row.source,
        decision: row.decision,
      };
    });

    return NextResponse.json({ events, total: count || 0 });
  } catch (error) {
    console.error("ADMIN_COPY_ACTIVITY_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
