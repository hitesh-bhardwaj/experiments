import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getRole } from "@/lib/admin";

// The client can't compute its own role: the ADMIN_EMAIL bootstrap fallback
// in getRole() depends on a server-only env var. This is the single source
// of truth the UI reads from to decide what to render.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  return NextResponse.json({ role: getRole(user) });
}
