import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/admin";
import { sendEmail } from "@/lib/resend";

// "Send password reset" in the Users tab's Manage drawer. Clerk can't send a reset from
// the server, so this emails the account a link to the sign-in page opened on password
// reset with their email filled in (`/sign-in?mode=reset&email=`); they get a code there
// and pick a new password. Nothing changes until they do. Super admins only; at most once
// a minute per account.

const COOLDOWN_MS = 60_000;
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || "https://vault.hyperiux.com";

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function POST(request) {
  if (!(await assertSuperAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { clerkUserId } = await request.json().catch(() => ({}));
    if (!clerkUserId) return NextResponse.json({ error: "clerkUserId is required." }, { status: 400 });

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(clerkUserId);
    const email = user.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress;
    if (!email) return NextResponse.json({ error: "This account has no email address." }, { status: 400 });

    const lastSent = Number(user.privateMetadata?.adminResetSentAt) || 0;
    if (Date.now() - lastSent < COOLDOWN_MS) {
      return NextResponse.json({ error: "A reset email was just sent. Try again in a minute." }, { status: 429 });
    }

    const link = `${APP_URL()}/sign-in?mode=reset&email=${encodeURIComponent(email)}`;
    const name = user.firstName || "there";
    const result = await sendEmail({
      to: email,
      subject: "Reset your Hyperiux Vault password",
      emailType: "password_reset_link",
      text: `Hi ${name},\n\nThe Hyperiux Vault team sent you a link to reset your password:\n${link}\n\nOpen it, enter the code we email you, and choose a new password. If you didn't ask for this, you can ignore this email - your password stays as it is.`,
      html: `<div style="background:#111111;padding:40px 24px;font-family:Helvetica,Arial,sans-serif;color:#ffffff">
  <div style="max-width:480px;margin:0 auto">
    <p style="font-size:22px;margin:0 0 16px">Reset your password</p>
    <p style="font-size:15px;line-height:1.6;color:#cccccc;margin:0 0 24px">Hi ${escape(name)}, the Hyperiux Vault team sent you a link to reset your password. Open it, enter the code we email you, and choose a new one.</p>
    <a href="${escape(link)}" style="display:inline-block;background:#ff5f00;color:#111111;text-decoration:none;padding:12px 20px;font-size:15px">Reset password</a>
    <p style="font-size:13px;line-height:1.6;color:#939393;margin:24px 0 0">If you didn't ask for this, you can ignore this email - your password stays as it is.</p>
  </div>
</div>`,
    });

    if (result?.success === false) {
      return NextResponse.json({ error: "Couldn't send the reset email." }, { status: 502 });
    }

    await clerk.users.updateUserMetadata(clerkUserId, { privateMetadata: { adminResetSentAt: Date.now() } });
    return NextResponse.json({ sent: true, email });
  } catch (error) {
    console.error("ADMIN_SEND_PASSWORD_RESET_ERROR:", error);
    return NextResponse.json({ error: "Couldn't send the reset email." }, { status: 500 });
  }
}
