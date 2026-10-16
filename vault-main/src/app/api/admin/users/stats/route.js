import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";
import { fetchAllRows, getAdminUserList, getAudience, parseAudience } from "@/lib/admin-data";

// The Users tab's KPIs, for one audience (customers by default) and the same
// Joined window as the table, so the numbers always match the list below them.
export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const { startISO, endISO, startDateString, endDateString } = resolveDateBounds({
      range,
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    });
    const audienceName = parseAudience(searchParams);

    const [joined, audience, unlockRows, saveRows] = await Promise.all([
      // Accounts that joined in the window (real Clerk accounts, not leftover rows)
      getAdminUserList({ audience: audienceName, startISO, endISO }),
      getAudience(audienceName),
      fetchAllRows(() => {
        let q = supabase.from("install_unlocks").select("clerk_user_id");
        if (startDateString) q = q.gte("usage_date", startDateString);
        if (endDateString) q = q.lte("usage_date", endDateString);
        return q;
      }),
      fetchAllRows(() => {
        let q = supabase.from("wishlisted_effects").select("clerk_user_id");
        if (startISO) q = q.gte("created_at", startISO);
        if (endISO) q = q.lt("created_at", endISO);
        return q;
      }),
    ]);

    const mine = (rows) => rows.filter((row) => audience.includes(row.clerk_user_id)).length;

    return NextResponse.json({
      range,
      newUsers: joined.length,
      // On a paid plan now (Pro or Pro+, period still running)
      newProUsers: joined.filter((entry) => entry.currentPlan !== "free").length,
      copies: mine(unlockRows),
      saves: mine(saveRows),
    });
  } catch (error) {
    console.error("ADMIN_USERS_STATS_ERROR:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
