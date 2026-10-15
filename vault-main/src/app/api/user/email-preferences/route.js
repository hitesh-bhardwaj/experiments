import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

// "Product updates" in the dashboard's settings: whether the account's email is a
// subscribed contact in the newsletter audience (the same one /api/newsletter adds to).
// Account and billing emails aren't optional, so they aren't stored here.

const resend = new Resend(process.env.RESEND_API_KEY);

async function accountEmail() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress?.toLowerCase() || null;
}

export async function GET() {
  const email = await accountEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return NextResponse.json({ error: "Newsletter service not configured." }, { status: 500 });

  // Not in the audience at all reads as "not subscribed"
  const { data } = await resend.contacts.get({ email, audienceId });
  return NextResponse.json({ productUpdates: Boolean(data && !data.unsubscribed) });
}

export async function POST(request) {
  const email = await accountEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) return NextResponse.json({ error: "Newsletter service not configured." }, { status: 500 });

  const { productUpdates } = await request.json().catch(() => ({}));
  if (typeof productUpdates !== "boolean") {
    return NextResponse.json({ error: "productUpdates must be true or false." }, { status: 400 });
  }

  const { data: contact } = await resend.contacts.get({ email, audienceId });
  const { error } = contact
    ? await resend.contacts.update({ email, audienceId, unsubscribed: !productUpdates })
    : productUpdates
      ? await resend.contacts.create({ email, audienceId, unsubscribed: false })
      : { error: null };

  if (error) {
    console.error("EMAIL_PREFERENCES_ERROR:", error);
    return NextResponse.json({ error: "Couldn't update your email preferences." }, { status: 500 });
  }
  return NextResponse.json({ productUpdates });
}
