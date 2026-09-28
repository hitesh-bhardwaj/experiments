import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/resend";
import { PasswordResetOtpEmail } from "@/components/WebsiteComps/emailTemplate/PasswordResetOtpEmail";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp, userId) {
  return crypto
    .createHash("sha256")
    .update(`${otp}:${userId}:${process.env.CLERK_SECRET_KEY}`)
    .digest("hex");
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  const email = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId
  )?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "No email address found on your account." },
      { status: 400 }
    );
  }

  const otp = generateOtp();
  const hash = hashOtp(otp, userId);
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  await clerk.users.updateUser(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      passwordResetOtp: { hash, expiresAt },
    },
  });

  const { success } = await sendEmail({
    to: email,
    subject: "Your password reset code - Hyperiux Vault",
    react: PasswordResetOtpEmail({ otp, expiresInMinutes: 10 }),
    emailType: "password_reset_otp",
  });

  if (!success) {
    return NextResponse.json(
      { error: "Failed to send OTP email. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
