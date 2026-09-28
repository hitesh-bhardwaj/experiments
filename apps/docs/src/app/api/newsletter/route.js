import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      console.error("RESEND_AUDIENCE_ID is not set");
      return NextResponse.json({ error: "Newsletter service not configured." }, { status: 500 });
    }

    const { error } = await resend.contacts.create({
      email: normalizedEmail,
      audienceId,
      unsubscribed: false,
    });

    if (error) {
      console.error("RESEND_CONTACT_ERROR:", error);
      return NextResponse.json({ error: "Failed to subscribe. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("NEWSLETTER_SUBSCRIBE_ERROR:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
