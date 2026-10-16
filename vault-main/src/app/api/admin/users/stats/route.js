import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { compareStat, comparisonWindows, resolveDateBounds } from "@/lib/admin-activity";
import { fetchAllRows, fetchInstalls, getAdminUserList, getAudience, parseAudience } from "@/lib/admin-data";

// The Users tab's stat cards, for one audience (customers by default) and the same
// Joined window as the table, so the numbers always match the list below them. Each card
// (lib/admin-activity compareStat): the window's total, its change against the window
// before (all time: last 30 days against the 30 before) and its line.
export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "all";
    const { startISO, endISO } = resolveDateBounds({
      range,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    const audienceName = parseAudience(searchParams);
    const audience = await getAudience(audienceName);

    const windows = comparisonWindows({ startISO, endISO, range });
    const fetchFromISO = startISO ? new Date(windows.previous[0]).toISOString() : null;
    const startMs = startISO ? new Date(startISO).getTime() : -Infinity;
    const endMs = endISO ? new Date(endISO).getTime() : Infinity;
    const inWindow = (at) => at >= startMs && at < endMs;

    const [everyone, installs, saveRows] = await Promise.all([
      // Every account in the audience, with its plan now
      getAdminUserList({ audience: audienceName }),
      // Installs (one effect, one account, one day - every source)
      fetchInstalls({ startISO: fetchFromISO, endISO, audience }),
      fetchAllRows(() => {
        let q = supabase.from("wishlisted_effects").select("clerk_user_id, created_at");
        if (fetchFromISO) q = q.gte("created_at", fetchFromISO);
        if (endISO) q = q.lt("created_at", endISO);
        return q;
      }).then((rows) => rows.filter((row) => audience.includes(row.clerk_user_id))),
    ]);

    const earliest = (items) => (items.length ? Math.min(...items.map((item) => item.at)) : windows.current[0]);
    const card = (items) => compareStat(items, windows, { inWindow, seriesStartMs: startISO ? startMs : earliest(items) });

    const joined = everyone.map((entry) => ({ at: entry.clerkUser.createdAt, paid: entry.currentPlan !== "free" }));
    const users = card(joined);
    const paidUsers = card(joined.filter((entry) => entry.paid));
    const installCard = card(installs.map((row) => ({ at: new Date(row.at).getTime() })));
    const saves = card(saveRows.map((row) => ({ at: new Date(row.created_at).getTime() })));

    return NextResponse.json({
      range,
      // Accounts that joined in the window, and how many of them are on a paid plan now
      newUsers: users.value,
      newProUsers: paidUsers.value,
      installs: installCard.value,
      saves: saves.value,
      kpis: { comparison: windows.label, users, paidUsers, installs: installCard, saves },
    });
  } catch (error) {
    console.error("ADMIN_USERS_STATS_ERROR:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
