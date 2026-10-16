import { NextResponse } from "next/server";
import { displayName } from "@/lib/display-name";
import { clerkClient } from "@clerk/nextjs/server";
import { assertAdmin } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { resolveDateBounds } from "@/lib/admin-activity";
import { fetchInstalls, getAudience, parseAudience } from "@/lib/admin-data";

// The Activity page's "Recent installs" feed: every install, newest first - one effect,
// one account, one day, from the website, the CLI or MCP (lib/admin-data fetchInstalls,
// the same count as every other admin number). Searched, filtered and paged here.

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

    const audience = await getAudience(parseAudience(searchParams));

    const search = effectSearch.trim().toLowerCase();
    // One account's installs only, with ?userId= (the Users tab's Manage drawer)
    const userId = searchParams.get("userId");
    const [installs, sanityEntries] = await Promise.all([
      fetchInstalls(userId ? { startISO, endISO, clerkUserId: userId } : { startISO, endISO, audience }),
      getAllSanityEffectEntries(),
    ]);
    const matching = installs.filter(
      (row) => (!source || source === "all" || row.source === source) && (!search || row.effectSlug.toLowerCase().includes(search))
    );
    const count = matching.length;
    const rows = matching.slice(offset, offset + limit).map((row) => ({
      id: `${row.identityKey || row.clerkUserId}|${row.effectSlug}|${row.day}`,
      occurred_at: row.at,
      clerk_user_id: row.clerkUserId,
      identity_key: row.identityKey,
      effect_slug: row.effectSlug,
      source: row.source,
    }));

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
        userName: displayName(clerkUser),
        userEmail: clerkUser?.emailAddresses?.[0]?.emailAddress || null,
        userImageUrl: clerkUser?.hasImage ? clerkUser.imageUrl : null, // a real photo, not Clerk's placeholder
        identityKey: row.identity_key,
        effectSlug: row.effect_slug,
        effectTitle: resolveTitle(row.effect_slug),
        source: row.source,
      };
    });

    return NextResponse.json({ events, total: count || 0 });
  } catch (error) {
    console.error("ADMIN_COPY_ACTIVITY_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
