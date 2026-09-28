import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/resend";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { isBlockedEmailDomain } from "@/lib/blocked-email-domains";
import {
  renderWaitlistInviteEmail,
  waitlistInviteSubject,
  waitlistInviteText,
} from "@/lib/emails/waitlist-invite-email";

// Public sibling to api/admin/waitlist/invite/route.js - same
// createInvitation + sendEmail(waitlist-invite-email) pattern, but reachable
// by any anonymous visitor (the exit-intent modal), not just admins. Same
// reCAPTCHA-only anti-abuse level as the other public lead form
// (api/work-with-hyperiux/route.js) - no extra rate limiting on top, to
// match this codebase's existing risk tolerance for this class of form.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return Response.json({ error: "A valid email is required." }, { status: 400 });
    }

    if (isBlockedEmailDomain(email)) {
      return Response.json(
        { error: "Please use a work or personal email address." },
        { status: 400 }
      );
    }

    const { success: recaptchaOk } = await verifyRecaptcha(
      body?.recaptchaToken,
      "exit_intent_invite"
    );

    if (!recaptchaOk) {
      return Response.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();

    // notify:false + our own sendEmail() call below, same reasoning as the
    // admin route: one branded email, not Clerk's own generic one.
    // ignoreExisting:true means a repeat visitor re-submitting doesn't error
    // out on "already invited" - it just re-sends the same working link.
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      notify: false,
      ignoreExisting: true,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup/continue`,
    });

    if (!invitation.url) {
      throw new Error("Clerk did not return an invitation URL");
    }

    const emailResult = await sendEmail({
      to: email,
      from: "Hyperiux Vault <invites@vault.hyperiux.com>",
      subject: waitlistInviteSubject,
      react: renderWaitlistInviteEmail({ signUpUrl: invitation.url }),
      text: waitlistInviteText({ signUpUrl: invitation.url }),
      emailType: "exit_intent_invite",
    });

    if (!emailResult.success) {
      return Response.json(
        { error: "Invitation created but the email failed to send. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("EXIT_INTENT_INVITE_ERROR:", error);
    return Response.json(
      { error: error?.errors?.[0]?.longMessage || "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
