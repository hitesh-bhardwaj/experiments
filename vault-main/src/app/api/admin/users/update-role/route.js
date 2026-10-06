import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { assertSuperAdmin, ROLES } from "@/lib/admin";

const VALID_ROLES = new Set([ROLES.SUPER_ADMIN, ROLES.ADMIN, null]);

export async function POST(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { clerkUserId, role } = await request.json();

    if (!clerkUserId || !VALID_ROLES.has(role)) {
      return NextResponse.json(
        { error: "clerkUserId and role (super_admin|admin|null) are required." },
        { status: 400 }
      );
    }

    // A super admin can't change their own role from this endpoint - only
    // another super admin can, so a single account can never lock itself out
    // of role management.
    const { userId } = await auth();
    if (clerkUserId === userId) {
      return NextResponse.json(
        { error: "You cannot change your own role." },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();

    // publicMetadata.role is a sibling key to plan/proAccess/billingInterval
    // (see update-plan/route.js) - updateUserMetadata merges at the top
    // level, so this can't clobber a user's plan and vice versa.
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role },
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("ADMIN_UPDATE_ROLE_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
