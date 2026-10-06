import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabase } from "@/lib/supabase";
import { sendEmail } from "@/lib/resend";
import { renderWelcomeEmail, welcomeSubject, welcomeText } from "@/lib/emails/welcome-email";
import { renderVerificationCodeEmail } from "@/lib/emails/verification-code-email";
import { renderResetPasswordCodeEmail } from "@/lib/emails/reset-password-code-email";
import { renderPasswordChangedEmail } from "@/lib/emails/password-changed-email";
import { renderPasswordRemovedEmail } from "@/lib/emails/password-removed-email";
import { renderPrimaryEmailAddressChangedEmail } from "@/lib/emails/primary-email-address-changed-email";
import { renderAccountLockedEmail } from "@/lib/emails/account-locked-email";
import { renderNewDeviceSignInEmail } from "@/lib/emails/new-device-sign-in-email";

// Clerk's "Delivered by Clerk" toggle hands templates to us via the
// email.created webhook instead of sending them itself. Each entry maps a
// Clerk template slug (ground-truthed against this project's live templates
// via `npx clerk api templates/email`, not guessed) to the subject line and
// React template we render for it, plus the Clerk merge-tag field names to
// pull off event.data.data for that template. Slugs are the only reliable
// discriminator - verification_code and reset_password_code both carry an
// otp_code field, so branching on "does this have an otp code" (the old
// approach) sent the same email for both.
const EMAIL_TEMPLATE_HANDLERS = {
  verification_code: (data) => ({
    subject: `${data?.otp_code || ""} is your Hyperiux Vault verification code`,
    react: renderVerificationCodeEmail({
      otpCode: data?.otp_code,
      requestedFrom: data?.requested_from,
      requestedAt: data?.requested_at,
    }),
    emailType: "verification_code",
  }),
  reset_password_code: (data) => ({
    subject: `${data?.otp_code || ""} is your Hyperiux Vault reset code`,
    react: renderResetPasswordCodeEmail({
      otpCode: data?.otp_code,
      requestedFrom: data?.requested_from,
      requestedAt: data?.requested_at,
    }),
    emailType: "reset_password_code",
  }),
  password_changed: (data) => ({
    subject: "Your Hyperiux Vault password was changed",
    react: renderPasswordChangedEmail({
      requestedFrom: data?.requested_from,
      requestedAt: data?.requested_at,
    }),
    emailType: "password_changed",
  }),
  password_removed: (data) => ({
    subject: "Your Hyperiux Vault password was removed",
    react: renderPasswordRemovedEmail({
      primaryEmailAddress: data?.primary_email_address,
    }),
    emailType: "password_removed",
  }),
  primary_email_address_changed: (data) => ({
    subject: "Your Hyperiux Vault email address was updated",
    react: renderPrimaryEmailAddressChangedEmail({
      newEmailAddress: data?.new_email_address,
    }),
    emailType: "primary_email_address_changed",
  }),
  account_locked: (data) => ({
    subject: "Your Hyperiux Vault account has been locked",
    react: renderAccountLockedEmail({
      failedAttempts: data?.failed_attempts,
      lockedDate: data?.locked_date,
      lockoutDuration: data?.lockout_duration,
    }),
    emailType: "account_locked",
  }),
  new_device_sign_in: (data) => ({
    subject: "New device signed in to your Hyperiux Vault account",
    react: renderNewDeviceSignInEmail({
      browserName: data?.browser_name,
      deviceType: data?.device_type,
      ipAddress: data?.ip_address,
      location: data?.location,
      operatingSystem: data?.operating_system,
      revokeSessionUrl: data?.revoke_session_url,
      sessionCreatedAt: data?.session_created_at,
      signInMethod: data?.sign_in_method,
    }),
    emailType: "new_device_sign_in",
  }),
};

export async function POST(request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (err) {
    console.error("Clerk webhook verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { id: clerkUserId, email_addresses, created_at } = event.data;

    const email = email_addresses?.[0]?.email_address;

    // Provision a free subscription row in Supabase
    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          clerk_user_id: clerkUserId,
          plan: "free",
          status: "inactive",
          created_at: new Date(created_at).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" }
      );

    if (upsertError) {
      console.error("CLERK_WEBHOOK_SUPABASE_UPSERT_ERROR:", upsertError);
    }

    // Send welcome email
    if (email) {
      await sendEmail({
        to: email,
        subject: welcomeSubject,
        react: renderWelcomeEmail(),
        text: welcomeText(),
        emailType: "welcome",
      });
    }

  } else if (event.type === "email.created") {
    // Fires for any Clerk system email whose "Delivered by Clerk" toggle is
    // off (Dashboard > Customization > Emails) - delivered_by_clerk is false
    // only for those, so gating on it is what tells us Clerk expects us to
    // send this one ourselves instead of just logging/ignoring the event.
    const { to_email_address: toEmail, delivered_by_clerk: deliveredByClerk, slug, data } = event.data;

    if (deliveredByClerk !== false || !toEmail) {
      return NextResponse.json({ received: true });
    }

    const buildEmail = EMAIL_TEMPLATE_HANDLERS[slug];

    if (!buildEmail) {
      console.warn("CLERK_EMAIL_CREATED_UNHANDLED_SLUG:", slug);
      return NextResponse.json({ received: true });
    }

    const { subject, react, emailType } = buildEmail(data);

    await sendEmail({ to: toEmail, subject, react, emailType });
  }

  return NextResponse.json({ received: true });
}
