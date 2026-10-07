import { NextResponse } from "next/server";
import { Resend } from "resend";

// Keep in sync with the stack chips in components/Community/CommunityStack.jsx
const STACKS = ["React", "Next.js", "GSAP", "Three.js", "WebGL", "Motion", "Lenis", "Vue", "Svelte", "Webflow"];

// Vault Community waitlist. Same provider and validation as /api/newsletter,
// but its own Resend audience so the waitlist can be invited in waves.
//
// Env:
//   RESEND_API_KEY                   shared with the newsletter
//   RESEND_COMMUNITY_AUDIENCE_ID     required; the waitlist audience
//   RESEND_COMMUNITY_STACK_PROPERTY  optional; a string contact property
//                                    (created in Resend first) that stores the
//                                    picked stack, e.g. "stack"

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const { email, stack } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Only known chip names are kept, so the property can't carry arbitrary text
    const pickedStack = Array.isArray(stack) ? STACKS.filter((s) => stack.includes(s)) : [];

    const audienceId = process.env.RESEND_COMMUNITY_AUDIENCE_ID;
    if (!audienceId) {
      console.error("RESEND_COMMUNITY_AUDIENCE_ID is not set");
      return NextResponse.json({ error: "The waitlist isn’t open yet. Please try again soon." }, { status: 503 });
    }

    const stackProperty = process.env.RESEND_COMMUNITY_STACK_PROPERTY;
    const { error } = await resend.contacts.create({
      email: normalizedEmail,
      audienceId,
      unsubscribed: false,
      ...(stackProperty && pickedStack.length ? { properties: { [stackProperty]: pickedStack.join(", ") } } : {}),
    });

    if (error) {
      console.error("RESEND_COMMUNITY_CONTACT_ERROR:", error);
      return NextResponse.json({ error: "Couldn’t save your seat. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("COMMUNITY_WAITLIST_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
