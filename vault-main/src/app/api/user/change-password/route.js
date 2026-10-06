import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const clerk = await clerkClient();

  try {
    await clerk.users.verifyPassword({ userId, password: currentPassword });
  } catch {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  try {
    await clerk.users.updateUser(userId, { password: newPassword });
  } catch (err) {
    const message = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Unable to update password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
