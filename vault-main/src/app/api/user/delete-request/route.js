import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";

// "Delete account" in the dashboard's settings. Deleting isn't automatic yet: billing
// records must be kept for tax, a live subscription needs cancelling first and CLI tokens
// revoking, so the request goes to the team (the same inbox as the site's contact forms)
// and the user gets a copy confirming it was received.
export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "A Vault user";
  const team = process.env.RESEND_FROM_EMAIL;

  if (!email || !team) {
    return NextResponse.json(
      { error: "Couldn't send your request. Please email us instead." },
      { status: 500 },
    );
  }

  // sendEmail reports failure in its result rather than throwing
  const sent = await sendEmail({
    to: team,
    replyTo: email,
    subject: `Account deletion request: ${email}`,
    text: `${name} (${email}, Clerk ID ${userId}) asked to delete their Hyperiux Vault account from the dashboard settings.\n\nBefore deleting: cancel any live subscription, revoke CLI tokens, and keep invoices and template purchases as the law requires.`,
  });
  if (!sent.success) {
    return NextResponse.json(
      { error: "Couldn't send your request. Please try again." },
      { status: 500 },
    );
  }
  await sendEmail({
    to: email,
    subject: "We received your account deletion request",
    text: `Hi ${user?.firstName || "there"},\n\nWe received your request to delete your Hyperiux Vault account. Our team will be in touch by email to confirm before anything is deleted. Billing records are kept as the law requires, and code you've installed in your projects keeps working.\n\nIf you didn't ask for this, reply to this email.\n\nHyperiux Vault`,
  });

  return NextResponse.json({ requested: true });
}
