import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { MAX_ATTEMPTS, otpMatches } from "@/lib/reset-otp";

export async function POST(request) {
  const { userId, sessionId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { otp, newPassword } = await request.json();

  if (!otp || !newPassword) {
    return NextResponse.json(
      { error: "OTP and new password are required." },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);
  const stored = user.privateMetadata?.passwordResetOtp;

  if (!stored?.hash) {
    return NextResponse.json(
      { error: "No OTP found. Please request a new one." },
      { status: 400 }
    );
  }

  if (Date.now() > stored.expiresAt) {
    await clerk.users.updateUser(userId, {
      privateMetadata: { ...user.privateMetadata, passwordResetOtp: null },
    });
    return NextResponse.json(
      { error: "OTP has expired. Please request a new one." },
      { status: 400 }
    );
  }

  if (!otpMatches(String(otp).trim(), userId, stored.hash)) {
    // Each wrong guess is counted; the 5th destroys the code, so it can't be
    // brute-forced within its 10 minutes (security audit M3)
    const attempts = (stored.attempts || 0) + 1;
    const burned = attempts >= MAX_ATTEMPTS;

    await clerk.users.updateUser(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        passwordResetOtp: burned ? null : { ...stored, attempts },
      },
    });

    return burned
      ? NextResponse.json(
          { error: "Too many wrong codes. Please request a new one." },
          { status: 429 }
        )
      : NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
  }

  await clerk.users.updateUser(userId, {
    password: newPassword,
    privateMetadata: { ...user.privateMetadata, passwordResetOtp: null },
  });

  // Sign the account out everywhere else, so a session someone else holds
  // ends with the old password. This one stays signed in. The password has
  // already changed, so a failure here is logged rather than returned.
  try {
    const { data: sessions } = await clerk.sessions.getSessionList({ userId, status: "active" });
    await Promise.all(
      (sessions || [])
        .filter((session) => session.id !== sessionId)
        .map((session) => clerk.sessions.revokeSession(session.id))
    );
  } catch (error) {
    console.error("RESET_OTP_REVOKE_SESSIONS_ERROR:", error);
  }

  return NextResponse.json({ success: true });
}
