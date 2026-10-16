import { NextResponse } from "next/server";
import { Resend } from "resend";

// Keep in sync with the stack chips in components/Community/CommunityStack.jsx
const STACKS = ["React", "Next.js", "GSAP", "Three.js", "WebGL", "Motion", "Lenis", "Vue", "Svelte", "Webflow"];

// Vault Community waitlist. Resend keeps one list of contacts for the whole
// account (the newsletter shares it); the waitlist is a segment of it, so it can
// be invited in waves and emailed on its own.
//
// Env:
//   RESEND_API_KEY                   shared with the newsletter
//   RESEND_COMMUNITY_SEGMENT_ID      required; the "Community Waitlist" segment
//   RESEND_COMMUNITY_STACK_PROPERTY  optional; a string contact property
//                                    (created in Resend first) that stores the
//                                    picked stack, e.g. "stack"

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function isInSegment(email, segmentId) {
  const { data } = await resend.contacts.segments.list({ email });
  return Boolean(data?.data?.some((segment) => segment.id === segmentId));
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const { email, stack } = body || {};

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const segmentId = process.env.RESEND_COMMUNITY_SEGMENT_ID;
    if (!segmentId) {
      console.error("RESEND_COMMUNITY_SEGMENT_ID is not set");
      return NextResponse.json({ error: "The waitlist isn’t open yet. Please try again soon." }, { status: 503 });
    }

    // Only known chip names are kept, so the property can't carry arbitrary text
    const pickedStack = Array.isArray(stack) ? STACKS.filter((s) => stack.includes(s)) : [];
    const stackProperty = process.env.RESEND_COMMUNITY_STACK_PROPERTY;
    const properties = stackProperty && pickedStack.length ? { [stackProperty]: pickedStack.join(", ") } : null;

    const { error: createError } = await resend.contacts.create({
      email: normalizedEmail,
      unsubscribed: false,
      segments: [{ id: segmentId }],
      ...(properties ? { properties } : {}),
    });

    if (createError) {
      // Usually an existing contact (a newsletter subscriber, or a second sign-up):
      // add them to the waitlist segment instead. Their subscription status is
      // left as it is.
      const { error: addError } = await resend.contacts.segments.add({ email: normalizedEmail, segmentId });

      if (addError && !(await isInSegment(normalizedEmail, segmentId))) {
        console.error("RESEND_COMMUNITY_CONTACT_ERROR:", createError, addError);
        return NextResponse.json({ error: "Couldn’t save your seat. Please try again." }, { status: 500 });
      }

      if (properties) {
        const { error: updateError } = await resend.contacts.update({ email: normalizedEmail, properties });
        if (updateError) console.error("RESEND_COMMUNITY_STACK_UPDATE_ERROR:", updateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("COMMUNITY_WAITLIST_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
