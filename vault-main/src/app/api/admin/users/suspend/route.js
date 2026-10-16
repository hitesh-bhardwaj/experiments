import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { assertSuperAdmin, isSuperAdminUser } from "@/lib/admin";

// Suspend or restore an account (the Users tab's Manage drawer). Suspending bans it in
// Clerk: it's signed out everywhere and can't sign in again until restored. Nothing is
// deleted - its plan, payments and history stay. Super admins only; never your own
// account or another super admin's (take their role away first).
export async function POST(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { clerkUserId, suspended } = await request.json();
    if (!clerkUserId || typeof suspended !== "boolean") {
      return NextResponse.json({ error: "clerkUserId and suspended (true|false) are required." }, { status: 400 });
    }

    const { userId } = await auth();
    if (clerkUserId === userId) {
      return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
    }

    const clerk = await clerkClient();
    const target = await clerk.users.getUser(clerkUserId);
    if (suspended && isSuperAdminUser(target)) {
      return NextResponse.json({ error: "Remove their Super Admin role before suspending this account." }, { status: 400 });
    }

    const user = suspended ? await clerk.users.banUser(clerkUserId) : await clerk.users.unbanUser(clerkUserId);
    return NextResponse.json({ suspended: Boolean(user.banned) });
  } catch (error) {
    console.error("ADMIN_SUSPEND_USER_ERROR:", error);
    return NextResponse.json({ error: "Couldn't update this account." }, { status: 500 });
  }
}
