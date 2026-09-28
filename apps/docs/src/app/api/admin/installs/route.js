import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { buildDailyBucketsForRange, fillDailyBuckets, resolveDateBounds, utcDateString } from "@/lib/admin-activity";

// Stage 2 (Installation-SyncUp.md): calibrate the 2/3/10 daily limits against
// real install_events data before Stage 3 flips INSTALL_LIMIT_ENFORCE on.
// The single question this exists to answer: are the limits right, or are
// CI pipelines / monorepos / shared office IPs about to get falsely capped?

const TOP_USERS_LIMIT = 10;

// Same success-vs-attempt distinction as /api/admin/copy-activity - "allowed"
// and "already-unlocked" are real deliveries, "denied" rows never happened.
const SUCCESS_DECISIONS = ["allowed", "already-unlocked"];

// Only signed-in identities have a clerk_user_id to rank and a Clerk profile
// to resolve a name/email from - anonymous device:/ip: activity has no "user"
// to put on a leaderboard, so it's excluded here. Unlike install_events,
// install_unlocks has no `decision` column at all - every row already is a
// successful claim (a denied attempt never gets one inserted), so there's
// nothing to filter there.
function topUserCounts(rows, limit) {
  const counts = new Map();

  for (const row of rows) {
    if (!row.clerk_user_id) continue;
    counts.set(row.clerk_user_id, (counts.get(row.clerk_user_id) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([clerkUserId, count]) => ({ clerkUserId, count }));
}

function countBy(rows, key) {
  const counts = new Map();

  for (const row of rows) {
    const value = row[key] || "unknown";
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // Matches /api/admin/copy-activity's default - both read the same
    // install_events ledger, and the shared date-range control in
    // InstallActivityTab.js's buildRangeQuery() omits the `range` param
    // entirely for "All time" rather than sending range=all, so whatever
    // each route falls back to here is what "All time" actually shows.
    // These silently disagreeing (this used to default to "30d") is why
    // the installs panel and the copy-activity list could show different
    // start dates for the exact same underlying data.
    const range = searchParams.get("range") || "all";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const { startISO, endISO, startDateString, endDateString } = resolveDateBounds({
      range,
      from,
      to,
    });
    const today = utcDateString(0);

    // install_unlocks and install_events are written by two separate,
    // non-atomic inserts for the same claim (see getInstallLimitDecision()
    // in lib/install-limit.js) - install_unlocks goes through an atomic RPC
    // and can't silently lose a row, install_events is a best-effort
    // .insert() right after it that can (and, on real data, has - see the
    // retry added there). That made install_events an unreliable source for
    // "how many installs actually happened": totals, the trend chart,
    // source breakdown, and both leaderboards below now read the
    // guaranteed-complete install_unlocks ledger instead. install_events
    // stays the source for denied/enforcement stats and the plan
    // breakdown - a denied attempt has no install_unlocks row at all (there
    // was nothing to unlock), and plan isn't a column on install_unlocks -
    // and for the raw per-attempt event log at /api/admin/copy-activity,
    // which genuinely needs per-decision, per-timestamp granularity.
    let unlocksQuery = supabase
      .from("install_unlocks")
      .select("usage_date,identity_key,clerk_user_id,effect_slug,source")
      .order("usage_date", { ascending: false });
    if (startISO) unlocksQuery = unlocksQuery.gte("usage_date", startISO);
    if (endISO) unlocksQuery = unlocksQuery.lt("usage_date", endISO);

    let eventsQuery = supabase
      .from("install_events")
      .select(
        "occurred_at,identity_key,clerk_user_id,device_id,ip_hash,effect_slug,effect_tier,source,plan,decision,reason,enforced,would_have_denied,cli_version,mcp_version"
      )
      .order("occurred_at", { ascending: false });
    if (startISO) eventsQuery = eventsQuery.gte("occurred_at", startISO);
    if (endISO) eventsQuery = eventsQuery.lt("occurred_at", endISO);

    const [
      { data: unlockRows, error: unlocksError },
      { data: eventRows, error: eventsError },
      // "Installs Today" is a fixed daily pulse, deliberately independent of
      // whatever window is selected elsewhere on the page - always today.
      { count: installsToday, error: installsTodayError },
    ] = await Promise.all([
      unlocksQuery,
      eventsQuery,
      supabase
        .from("install_unlocks")
        .select("id", { count: "exact", head: true })
        .eq("usage_date", today),
    ]);

    if (unlocksError || eventsError || installsTodayError) {
      console.error("ADMIN_INSTALLS_ERROR:", unlocksError || eventsError || installsTodayError);
      return NextResponse.json({ error: "Failed to load install events" }, { status: 500 });
    }

    const unlocks = unlockRows || [];
    const allEvents = eventRows || [];
    const deniedEvents = allEvents.filter((row) => !SUCCESS_DECISIONS.includes(row.decision));
    const allowedRows = allEvents.filter((row) => row.decision === "allowed");
    const alreadyUnlockedRows = allEvents.filter((row) => row.decision === "already-unlocked");

    const installTrend = fillDailyBuckets(
      buildDailyBucketsForRange({ startDateString, endDateString }),
      unlocks,
      (row) => row.usage_date
    );

    // Two leaderboards over the same `unlocks`: "Top users by copies" means
    // the website's copy button specifically - same as everywhere else
    // "copies" is used (Overview's Total Copies, the per-user detail page) -
    // so it ranks a web-only subset. "Top installers" is the all-sources
    // counterpart (web/CLI/MCP combined), matching everything else above
    // that's deliberately unscoped by source.
    const webUnlocks = unlocks.filter((row) => row.source === "web");
    const webUserCounts = topUserCounts(webUnlocks, TOP_USERS_LIMIT);
    const allUserCounts = topUserCounts(unlocks, TOP_USERS_LIMIT);

    // One Clerk lookup covering both leaderboards' user ids, instead of
    // fetching twice for whatever users happen to appear on both.
    const neededClerkUserIds = [
      ...new Set([...webUserCounts, ...allUserCounts].map((entry) => entry.clerkUserId)),
    ];
    let clerkMap = {};
    if (neededClerkUserIds.length > 0) {
      const clerk = await clerkClient();
      const results = await clerk.users.getUserList({
        userId: neededClerkUserIds,
        limit: neededClerkUserIds.length,
      });
      clerkMap = Object.fromEntries((results.data || []).map((u) => [u.id, u]));
    }

    // Historical install_unlocks rows outlive the account that made them -
    // a deleted Clerk user still has old unlocks on file. Rather than
    // surface a blank/unclickable row (there's no profile left to open),
    // those identities are dropped from the leaderboard entirely.
    function buildLeaderboard(userCounts) {
      return userCounts
        .filter(({ clerkUserId }) => clerkMap[clerkUserId])
        .map(({ clerkUserId, count }) => {
          const clerkUser = clerkMap[clerkUserId];
          return {
            clerkUserId,
            name: clerkUser.fullName || clerkUser.firstName || null,
            email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
            imageUrl: clerkUser.imageUrl || null,
            count,
          };
        });
    }

    const topUsers = buildLeaderboard(webUserCounts);
    const topInstallers = buildLeaderboard(allUserCounts);

    return NextResponse.json({
      range,
      stats: {
        // Installs is the superset, copies the web-only subset within it -
        // both now read from install_unlocks, so a user's "Copies" number
        // (here and everywhere else it's shown) can never exceed their
        // "Installs" number, the way it could when the leaderboards read
        // the less-reliable install_events instead.
        totalInstalls: unlocks.length,
        installsToday: installsToday || 0,
        // These three stay install_events-based - install_unlocks has no
        // concept of a denied attempt (nothing gets inserted there when a
        // claim is refused) or of what enforcement mode was active, so
        // there's no equivalent number to read from it instead.
        allowedCount: allowedRows.length,
        alreadyUnlockedCount: alreadyUnlockedRows.length,
        deniedCount: deniedEvents.length,
        // Checked across every attempt, not just successful ones - a denial
        // can only happen while enforcement is on, so it's the more
        // complete signal for "was the limit actually active in this
        // window," even if every *successful* row happened to log false.
        enforced: allEvents.some((row) => row.enforced),
      },
      sourceBreakdown: countBy(unlocks, "source"),
      // Stays install_events-based - plan isn't a column on install_unlocks,
      // so this is the one breakdown here still reading the less-complete
      // table (a documented exception, not an oversight).
      planBreakdown: countBy(allEvents, "plan"),
      installTrend,
      topUsers,
      topInstallers,
    });
  } catch (error) {
    console.error("ADMIN_INSTALLS_ERROR:", error);
    return NextResponse.json({ error: "Failed to load install events" }, { status: 500 });
  }
}
