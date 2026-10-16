import { auth, clerkClient } from "@clerk/nextjs/server";
import { displayName } from "@/lib/display-name";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRole, isSuperAdminUser } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";
import { fetchAllRows, getAdminUserList, parseAudience } from "@/lib/admin-data";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 500;

const SORT_OPTIONS = new Set(["copies", "cli", "mcp", "saves"]);
const ROLE_OPTIONS = new Set(["admin", "super_admin", "user"]);
const PLAN_OPTIONS = new Set(["pro_plus", "pro", "free", "paid"]);

function countByUser(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.clerk_user_id, (counts.get(row.clerk_user_id) || 0) + 1);
  }
  return counts;
}

// Lifetime effect activity per user, split by where it happened
// (install_unlocks.source): copies = the website's copy buttons (web), cli =
// `npx hyperiux add`, mcp = the Hyperiux MCP; plus saves (wishlisted_effects).
// All-time, like the per-user page - the Joined filter decides who's listed,
// not how much history counts. Every row, not the first 1000.
async function activityCounts() {
  const [unlockRows, saveRows] = await Promise.all([
    fetchAllRows(() => supabase.from("install_unlocks").select("clerk_user_id, source").not("clerk_user_id", "is", null)),
    fetchAllRows(() => supabase.from("wishlisted_effects").select("clerk_user_id")),
  ]);
  return {
    copiesById: countByUser(unlockRows.filter((r) => r.source === "web")),
    cliById: countByUser(unlockRows.filter((r) => r.source === "cli")),
    mcpById: countByUser(unlockRows.filter((r) => r.source === "mcp")),
    savesById: countByUser(saveRows),
  };
}

function shapeUser({ clerkUser, sub, currentPlan }, viewerIsSuperAdmin, { copiesById, cliById, mcpById, savesById }) {
  const role = getRole(clerkUser);

  const base = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
    name: displayName(clerkUser),
    imageUrl: clerkUser.imageUrl || null,
    joinedAt: clerkUser.createdAt || sub?.created_at || null,
    // The plan they have now: an expired grant or a cancelled subscription is Free
    plan: currentPlan === "free" ? "free" : "pro",
    // "pro" | "pro_plus" for a paid plan (not payment data, so every admin sees it)
    tier: currentPlan === "free" ? null : currentPlan,
    role,
    isAdmin: role !== null,
    copiesCount: copiesById.get(clerkUser.id) || 0,
    cliCount: cliById.get(clerkUser.id) || 0,
    mcpCount: mcpById.get(clerkUser.id) || 0,
    savesCount: savesById.get(clerkUser.id) || 0,
  };

  // Billing/payment detail is super-admin only - a regular admin gets user
  // identity + plan but no subscription status, renewal date, or Razorpay
  // IDs, enforced here rather than only hidden in the UI.
  if (!viewerIsSuperAdmin) return base;

  return {
    ...base,
    status: sub?.status || "inactive",
    billingInterval: sub?.billing_interval || null,
    planValidUntil: sub?.current_period_end || null,
    razorpayCustomerId: sub?.razorpay_customer_id || null,
    razorpaySubscriptionId: sub?.razorpay_subscription_id || null,
  };
}

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clerk = await clerkClient();
  const viewer = await clerk.users.getUser(userId);
  if (getRole(viewer) === null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const viewerIsSuperAdmin = isSuperAdminUser(viewer);

  try {
    const { searchParams } = new URL(request.url);
    const rawPlan = searchParams.get("plan") || "all";
    const rawRole = searchParams.get("role") || "all";
    const rawSort = searchParams.get("sort") || "newest";
    const sortBy = SORT_OPTIONS.has(rawSort) ? rawSort : "newest";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);
    const { startISO, endISO } = resolveDateBounds({
      range: searchParams.get("joined") || "all",
      from: searchParams.get("joinedFrom"),
      to: searchParams.get("joinedTo"),
    });

    // The whole filtered list (Clerk accounts, cached), so every filter, sort and
    // the total are exact - no more search-only-on-this-page or capped fetches
    const [list, counts] = await Promise.all([
      getAdminUserList({
        audience: parseAudience(searchParams),
        search: searchParams.get("search") || "",
        plan: PLAN_OPTIONS.has(rawPlan) ? rawPlan : "all",
        role: ROLE_OPTIONS.has(rawRole) ? rawRole : "all",
        startISO,
        endISO,
      }),
      activityCounts(),
    ]);

    if (sortBy !== "newest") {
      const countMap =
        sortBy === "copies" ? counts.copiesById : sortBy === "cli" ? counts.cliById : sortBy === "mcp" ? counts.mcpById : counts.savesById;
      list.sort((a, b) => (countMap.get(b.clerkUser.id) || 0) - (countMap.get(a.clerkUser.id) || 0));
    }

    const users = list.slice(offset, offset + limit).map((entry) => shapeUser(entry, viewerIsSuperAdmin, counts));
    return NextResponse.json({ users, total: list.length });
  } catch (error) {
    console.error("ADMIN_USERS_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
