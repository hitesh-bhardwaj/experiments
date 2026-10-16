import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

// "Product updates" in the dashboard's settings: the account's email as a Resend contact,
// always listed in the Product Updates segment - subscribed when the switch is on,
// unsubscribed when it's off (Resend's broadcasts skip unsubscribed contacts). Contacts are
// account-wide in Resend (v6), so the switch reads and writes the contact's `unsubscribed`
// flag. Account and billing emails aren't optional, so they aren't stored here.

// Resend segment "Product Updates" (overridable per environment)
const SEGMENT_ID = process.env.RESEND_PRODUCT_UPDATES_SEGMENT_ID || "d2ba4cd4-0112-430f-94e1-38b170d1b9b3";

const resend = new Resend(process.env.RESEND_API_KEY);

async function accountEmail() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress?.toLowerCase() || null;
}

// The contact for this email, or null when there's none yet
async function findContact(email) {
  const { data, error } = await resend.contacts.get({ email });
  if (error && error.name !== "not_found") throw new Error(`${error.name}: ${error.message}`);
  return data || null;
}

export async function GET() {
  const email = await accountEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contact = await findContact(email);
    return NextResponse.json({ productUpdates: Boolean(contact && !contact.unsubscribed) });
  } catch (error) {
    console.error("EMAIL_PREFERENCES_READ_ERROR:", error);
    return NextResponse.json({ error: "Couldn't load your email preferences." }, { status: 502 });
  }
}

export async function POST(request) {
  const email = await accountEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productUpdates } = await request.json().catch(() => ({}));
  if (typeof productUpdates !== "boolean") {
    return NextResponse.json({ error: "productUpdates must be true or false." }, { status: 400 });
  }

  try {
    const contact = await findContact(email);
    if (!contact) {
      // First time: create the contact straight into the segment, either way the switch is
      const { error: createError } = await resend.contacts.create({ email, unsubscribed: !productUpdates, segments: [{ id: SEGMENT_ID }] });
      if (createError) throw new Error(`${createError.name}: ${createError.message}`);
    } else {
      const { error: updateError } = await resend.contacts.update({ email, unsubscribed: !productUpdates });
      if (updateError) throw new Error(`${updateError.name}: ${updateError.message}`);
      // An existing contact (the footer signup, an older switch) joins the segment if it isn't in it
      const { data: segments, error: listError } = await resend.contacts.segments.list({ email });
      if (listError) throw new Error(`${listError.name}: ${listError.message}`);
      if (!(segments?.data || []).some((segment) => segment.id === SEGMENT_ID)) {
        const { error: addError } = await resend.contacts.segments.add({ email, segmentId: SEGMENT_ID });
        if (addError) throw new Error(`${addError.name}: ${addError.message}`);
      }
    }
    return NextResponse.json({ productUpdates });
  } catch (error) {
    console.error("EMAIL_PREFERENCES_WRITE_ERROR:", error);
    return NextResponse.json({ error: "Couldn't update your email preferences." }, { status: 502 });
  }
}
