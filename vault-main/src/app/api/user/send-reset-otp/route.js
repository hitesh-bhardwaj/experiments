import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { PasswordResetOtpEmail } from "@/components/WebsiteComps/emailTemplate/PasswordResetOtpEmail";
import { OTP_EXPIRY_MS, generateOtp, hashOtp, sendWindow } from "@/lib/reset-otp";

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

  // 60s between codes and at most 5 an hour (lib/reset-otp)
  const now = Date.now();
  const { recent, waitMs } = sendWindow(user.privateMetadata?.passwordResetSends, now);

  if (waitMs > 0) {
    const seconds = Math.ceil(waitMs / 1000);
    return NextResponse.json(
      {
        error: seconds > 60
          ? `Too many codes requested. Try again in ${Math.ceil(seconds / 60)} minutes.`
          : `Please wait ${seconds} seconds before requesting another code.`,
        retryAfter: seconds,
      },
      { status: 429, headers: { "Retry-After": String(seconds) } }
    );
  }

  const otp = generateOtp();

  await clerk.users.updateUser(userId, {
    privateMetadata: {
      ...user.privateMetadata,
      // A new code starts with a fresh attempt count
      passwordResetOtp: { hash: hashOtp(otp, userId), expiresAt: now + OTP_EXPIRY_MS, attempts: 0 },
      passwordResetSends: [...recent, now],
    },
  });

  const { success } = await sendEmail({
    to: email,
    subject: "Your password reset code - Hyperiux Vault",
    react: PasswordResetOtpEmail({ otp, expiresInMinutes: OTP_EXPIRY_MS / 60000 }),
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
