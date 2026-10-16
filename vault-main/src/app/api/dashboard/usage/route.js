import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchInstalls } from "@/lib/admin-data";
import { NextResponse } from "next/server";
import { getUserPlanInfo } from "@/lib/subscription";
import { isAdminUser } from "@/lib/admin";
import { getEffectMetadata } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { getLimitForTier } from "@/lib/install-limit";

// The dashboard's Usage tab: today's count against the daily limit, and every effect
// taken (newest first) for its table and chart.

// How much history the table (and its chart) gets
const MAX_EVENTS = 500;

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user, { plan, tier }, sanityEntries] = await Promise.all([
    currentUser(),
    getUserPlanInfo(userId),
    getAllSanityEffectEntries(),
  ]);
  const isAdmin = isAdminUser(user);
  const limit = getLimitForTier(tier, { isAdmin });

  const titles = new Map(buildEffectsFromSanity(sanityEntries).map((effect) => [effect.name, effect.title]));
  const titleOf = (slug) => titles.get(slug) || getEffectMetadata(slug)?.title || slug;

  // Their installs, newest first: one effect, one day, from the website, the CLI or MCP
  // (lib/admin-data fetchInstalls - the count every admin page uses; admins included)
  let rows;
  try {
    rows = (await fetchInstalls({ clerkUserId: userId })).slice(0, MAX_EVENTS);
  } catch (error) {
    console.error("DASHBOARD_USAGE_ERROR:", error);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }

  const events = rows.map((row) => ({
    name: row.effectSlug,
    title: titleOf(row.effectSlug),
    source: row.source,
    at: row.at,
  }));

  // Unique effects today (UTC), against the limit
  const today = todayUTC();
  const count = new Set(events.filter((event) => String(event.at).slice(0, 10) === today).map((event) => event.name)).size;

  return NextResponse.json({
    plan,
    tier,
    isAdmin,
    limit,
    count,
    remaining: isAdmin ? null : Math.max(0, limit - count),
    events,
  });
}
