import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

function hashOtp(otp, userId) {
  return crypto
    .createHash("sha256")
    .update(`${otp}:${userId}:${process.env.CLERK_SECRET_KEY}`)
    .digest("hex");
}

export async function POST(request) {
  const { userId } = await auth();

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

  const hash = hashOtp(otp.trim(), userId);

  if (hash !== stored.hash) {
    return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
  }

  await clerk.users.updateUser(userId, {
    password: newPassword,
    privateMetadata: { ...user.privateMetadata, passwordResetOtp: null },
  });

  return NextResponse.json({ success: true });
}
