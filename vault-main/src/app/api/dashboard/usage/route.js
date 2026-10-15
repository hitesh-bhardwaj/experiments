import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

  // Members: install_unlocks, the ledger shared across web/CLI/MCP - one row per (UTC
  // day, effect), which is what the daily limit counts. Admins are never metered, so
  // they have no ledger rows; their installs are logged in install_events instead
  // (plan "admin", see lib/install-limit).
  const { data: rows, error } = isAdmin
    ? await supabase
        .from("install_events")
        .select("effect_slug, source, occurred_at")
        .eq("clerk_user_id", userId)
        .eq("plan", "admin")
        .order("occurred_at", { ascending: false })
        .limit(MAX_EVENTS)
    : await supabase
        .from("install_unlocks")
        .select("effect_slug, source, usage_date, first_unlocked_at")
        .eq("clerk_user_id", userId)
        .order("first_unlocked_at", { ascending: false })
        .limit(MAX_EVENTS);

  if (error) {
    console.error("DASHBOARD_USAGE_ERROR:", error);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }

  const events = (rows || []).map((row) => ({
    name: row.effect_slug,
    title: titleOf(row.effect_slug),
    source: row.source || "web",
    at: row.occurred_at || row.first_unlocked_at || row.usage_date,
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
