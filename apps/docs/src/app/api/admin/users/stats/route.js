import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { assertAdmin } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";

export async function GET(request) {
  if (!(await assertAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const { startISO, endISO, startDateString, endDateString } = resolveDateBounds({
      range,
      from,
      to,
    });

    let newUsersQuery = supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true });
    if (startISO) newUsersQuery = newUsersQuery.gte("created_at", startISO);
    if (endISO) newUsersQuery = newUsersQuery.lt("created_at", endISO);

    let copiesQuery = supabase
      .from("install_unlocks")
      .select("*", { count: "exact", head: true });
    if (startDateString) copiesQuery = copiesQuery.gte("usage_date", startDateString);
    if (endDateString) copiesQuery = copiesQuery.lte("usage_date", endDateString);

    let savesQuery = supabase
      .from("wishlisted_effects")
      .select("*", { count: "exact", head: true });
    if (startISO) savesQuery = savesQuery.gte("created_at", startISO);
    if (endISO) savesQuery = savesQuery.lt("created_at", endISO);

    // "New Pro Users" is a plain headcount off subscriptions - the real
    // source of truth for current plan - scoped to the window by
    // created_at. Deliberately not sourced from invoices: a payer's first
    // paid invoice date can fall inside the window while their signup
    // (created_at) sits outside it, which pulled in users nowhere to be
    // found when the admin table itself is filtered to the same "Joined"
    // range - a headcount by created_at is what actually stays consistent
    // with that table at every window size, including "all time" (no
    // created_at filter).
    let proUsersQuery = supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("plan", "pro");
    if (startISO) proUsersQuery = proUsersQuery.gte("created_at", startISO);
    if (endISO) proUsersQuery = proUsersQuery.lt("created_at", endISO);

    const [
      { count: newUsers, error: newUsersError },
      { count: copies, error: copiesError },
      { count: saves, error: savesError },
      { count: newProUsers, error: newProUsersError },
    ] = await Promise.all([newUsersQuery, copiesQuery, savesQuery, proUsersQuery]);

    const firstError = newUsersError || copiesError || savesError || newProUsersError;
    if (firstError) {
      console.error("ADMIN_USERS_STATS_ERROR:", firstError);
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }

    return NextResponse.json({
      range,
      newUsers: newUsers || 0,
      newProUsers: newProUsers || 0,
      copies: copies || 0,
      saves: saves || 0,
    });
  } catch (error) {
    console.error("ADMIN_USERS_STATS_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
