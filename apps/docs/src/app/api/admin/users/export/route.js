import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRole, isSuperAdminUser } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";

const CHUNK = 500;
// Hard ceiling so an export can never turn into an unbounded loop against
// Clerk/Supabase, however large the user base eventually gets.
const MAX_ROWS = 20000;

const SUBSCRIPTION_COLUMNS =
  "clerk_user_id, plan, status, billing_interval, current_period_end, razorpay_customer_id, razorpay_subscription_id, created_at";

const ROLE_OPTIONS = new Set(["admin", "super_admin", "user"]);

function csvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toRow(clerkUser, sub, viewerIsSuperAdmin) {
  const role = getRole(clerkUser);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const name = clerkUser.fullName || clerkUser.firstName || "";
  const joinedAt = clerkUser.createdAt || sub?.created_at || "";

  const base = [name, email, joinedAt ? new Date(joinedAt).toISOString() : "", sub?.plan || "free", role || "none"];

  if (!viewerIsSuperAdmin) return base;

  return [
    ...base,
    sub?.status || "inactive",
    sub?.billing_interval || "",
    sub?.current_period_end ? new Date(sub.current_period_end).toISOString() : "",
    sub?.razorpay_customer_id || "",
    sub?.razorpay_subscription_id || "",
    clerkUser.id,
  ];
}

async function subscriptionsForIds(ids) {
  if (!ids.length) return {};
  const { data } = await supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS).in("clerk_user_id", ids);
  return Object.fromEntries((data || []).map((s) => [s.clerk_user_id, s]));
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
    const search = (searchParams.get("search") || "").trim();
    const planFilter = searchParams.get("plan") || "all";
    const rawRole = searchParams.get("role") || "all";
    const roleFilter = ROLE_OPTIONS.has(rawRole) ? rawRole : "all";
    const joinedRange = searchParams.get("joined") || "all";
    const joinedFrom = searchParams.get("joinedFrom");
    const joinedTo = searchParams.get("joinedTo");
    const { startISO, endISO } = resolveDateBounds({
      range: joinedRange,
      from: joinedFrom,
      to: joinedTo,
    });

    const rows = [];

    if (search) {
      let offset = 0;
      // Terminates when Clerk returns fewer than CHUNK rows (last page) or
      // the MAX_ROWS safety ceiling is hit - never an unconditional loop.
      for (;;) {
        const clerkParams = { query: search, limit: CHUNK, offset, orderBy: "-created_at" };
        if (startISO) clerkParams.createdAtAfter = new Date(startISO).getTime();
        if (endISO) clerkParams.createdAtBefore = new Date(endISO).getTime();

        const { data: clerkUsers } = await clerk.users.getUserList(clerkParams);
        if (!clerkUsers.length) break;

        const subMap = await subscriptionsForIds(clerkUsers.map((u) => u.id));

        for (const clerkUser of clerkUsers) {
          const sub = subMap[clerkUser.id];
          if (planFilter !== "all" && (sub?.plan || "free") !== planFilter) continue;
          if (roleFilter !== "all" && (getRole(clerkUser) || "user") !== roleFilter) continue;
          rows.push(toRow(clerkUser, sub, viewerIsSuperAdmin));
          if (rows.length >= MAX_ROWS) break;
        }

        if (rows.length >= MAX_ROWS || clerkUsers.length < CHUNK) break;
        offset += CHUNK;
      }
    } else {
      let offset = 0;
      for (;;) {
        let query = supabase
          .from("subscriptions")
          .select(SUBSCRIPTION_COLUMNS)
          .order("created_at", { ascending: false })
          .range(offset, offset + CHUNK - 1);

        if (planFilter !== "all") query = query.eq("plan", planFilter);
        if (startISO) query = query.gte("created_at", startISO);
        if (endISO) query = query.lt("created_at", endISO);

        const { data: subscriptions, error } = await query;
        if (error) {
          console.error("ADMIN_USERS_EXPORT_SUPABASE_ERROR:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!subscriptions.length) break;

        const clerkUserIds = subscriptions.map((s) => s.clerk_user_id).filter(Boolean);
        const { data: clerkUsers } = clerkUserIds.length
          ? await clerk.users.getUserList({ userId: clerkUserIds, limit: clerkUserIds.length })
          : { data: [] };
        const clerkMap = Object.fromEntries((clerkUsers || []).map((u) => [u.id, u]));

        for (const sub of subscriptions) {
          const clerkUser = clerkMap[sub.clerk_user_id] || {
            id: sub.clerk_user_id,
            emailAddresses: [],
            fullName: null,
            firstName: null,
            createdAt: null,
            publicMetadata: {},
          };
          if (roleFilter !== "all" && (getRole(clerkUser) || "user") !== roleFilter) continue;
          rows.push(toRow(clerkUser, sub, viewerIsSuperAdmin));
        }

        if (rows.length >= MAX_ROWS || subscriptions.length < CHUNK) break;
        offset += CHUNK;
      }
    }

    const header = viewerIsSuperAdmin
      ? [
          "Name",
          "Email",
          "Joined At",
          "Plan",
          "Role",
          "Status",
          "Billing Interval",
          "Plan Valid Until",
          "Razorpay Customer ID",
          "Razorpay Subscription ID",
          "Clerk User ID",
        ]
      : ["Name", "Email", "Joined At", "Plan", "Role"];

    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `hyperiux-users-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("ADMIN_USERS_EXPORT_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
