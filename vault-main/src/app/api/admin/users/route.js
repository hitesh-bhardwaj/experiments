import { auth, clerkClient } from "@clerk/nextjs/server";
import { displayName } from "@/lib/display-name";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRole, isSuperAdminUser } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";
import { fetchAllRows, fetchInstalls, getAdminUserList, parseAudience } from "@/lib/admin-data";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 500;

// "installs" (all sources), or one source; "copies" is the old name for web
const SORT_OPTIONS = new Set(["installs", "web", "cli", "mcp", "saves", "copies"]);
const ROLE_OPTIONS = new Set(["admin", "super_admin", "user"]);
const PLAN_OPTIONS = new Set(["pro_plus", "pro", "free", "paid"]);

function countByUser(rows, key = "clerk_user_id") {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  }
  return counts;
}

// Lifetime installs per user (lib/admin-data fetchInstalls: one effect, one day - admins
// included), in total and by where they happened: web (the website), cli
// (`npx hyperiux add`), mcp (the Hyperiux MCP); plus saves (wishlisted_effects).
// All-time, like the per-user page - the Joined filter decides who's listed, not how
// much history counts. Every row, not the first 1000.
async function activityCounts() {
  const [installs, saveRows] = await Promise.all([
    fetchInstalls().then((rows) => rows.filter((row) => row.clerkUserId)),
    fetchAllRows(() => supabase.from("wishlisted_effects").select("clerk_user_id")),
  ]);
  return {
    installsById: countByUser(installs, "clerkUserId"),
    webById: countByUser(installs.filter((r) => r.source === "web"), "clerkUserId"),
    cliById: countByUser(installs.filter((r) => r.source === "cli"), "clerkUserId"),
    mcpById: countByUser(installs.filter((r) => r.source === "mcp"), "clerkUserId"),
    savesById: countByUser(saveRows),
  };
}

function shapeUser({ clerkUser, sub, currentPlan }, viewerIsSuperAdmin, { installsById, webById, cliById, mcpById, savesById }) {
  const role = getRole(clerkUser);

  const base = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
    name: displayName(clerkUser),
    imageUrl: clerkUser.hasImage ? clerkUser.imageUrl : null, // a real photo, not Clerk's placeholder
    joinedAt: clerkUser.createdAt || sub?.created_at || null,
    // The plan they have now: an expired grant or a cancelled subscription is Free
    plan: currentPlan === "free" ? "free" : "pro",
    // "pro" | "pro_plus" for a paid plan (not payment data, so every admin sees it)
    tier: currentPlan === "free" ? null : currentPlan,
    role,
    isAdmin: role !== null,
    installsCount: installsById.get(clerkUser.id) || 0,
    webCount: webById.get(clerkUser.id) || 0,
    cliCount: cliById.get(clerkUser.id) || 0,
    mcpCount: mcpById.get(clerkUser.id) || 0,
    savesCount: savesById.get(clerkUser.id) || 0,
    // Suspended (banned in Clerk): can't sign in until restored
    suspended: Boolean(clerkUser.banned),
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
      const countMap = {
        installs: counts.installsById,
        web: counts.webById,
        copies: counts.webById,
        cli: counts.cliById,
        mcp: counts.mcpById,
        saves: counts.savesById,
      }[sortBy];
      list.sort((a, b) => (countMap.get(b.clerkUser.id) || 0) - (countMap.get(a.clerkUser.id) || 0));
    }

    const users = list.slice(offset, offset + limit).map((entry) => shapeUser(entry, viewerIsSuperAdmin, counts));
    return NextResponse.json({ users, total: list.length });
  } catch (error) {
    console.error("ADMIN_USERS_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
