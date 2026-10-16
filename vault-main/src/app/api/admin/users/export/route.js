import { auth, clerkClient } from "@clerk/nextjs/server";
import { displayName } from "@/lib/display-name";
import { NextResponse } from "next/server";
import { getRole, isSuperAdminUser } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";
import { PLAN_LABELS, getAdminUserList, parseAudience } from "@/lib/admin-data";

// Hard ceiling on one export, however large the user base gets
const MAX_ROWS = 20000;

const PLAN_OPTIONS = new Set(["pro_plus", "pro", "free", "paid"]);
const ROLE_OPTIONS = new Set(["admin", "super_admin", "user"]);

function csvCell(value) {
  const str = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toRow({ clerkUser, sub, currentPlan }, viewerIsSuperAdmin) {
  const role = getRole(clerkUser);
  const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const name = displayName(clerkUser) || "";
  const joinedAt = clerkUser.createdAt || sub?.created_at || "";

  // The plan they have now (an expired grant is Free)
  const base = [name, email, joinedAt ? new Date(joinedAt).toISOString() : "", PLAN_LABELS[currentPlan], role || "none"];

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
    const { startISO, endISO } = resolveDateBounds({
      range: searchParams.get("joined") || "all",
      from: searchParams.get("joinedFrom"),
      to: searchParams.get("joinedTo"),
    });

    // The same list (and filters) as the Users table
    const list = await getAdminUserList({
      audience: parseAudience(searchParams),
      search: searchParams.get("search") || "",
      plan: PLAN_OPTIONS.has(rawPlan) ? rawPlan : "all",
      role: ROLE_OPTIONS.has(rawRole) ? rawRole : "all",
      startISO,
      endISO,
    });
    const rows = list.slice(0, MAX_ROWS).map((entry) => toRow(entry, viewerIsSuperAdmin));

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
