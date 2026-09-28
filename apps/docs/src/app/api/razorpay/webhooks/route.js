import { NextResponse } from "next/server";
import crypto from "crypto";
import { markUserProFromSubscription, markUserFree, sendInvoiceEmail, recordInvoice } from "@/lib/pro-access";
import { releaseFoundingSlot } from "@/lib/founding-slots";

// Razorpay's server calls this - authenticated via X-Razorpay-Signature
// (HMAC of the raw body with the webhook secret), never via Clerk.
// Keep this route out of proxy.js's protected matcher.

const PRO_EVENTS = new Set([
  "subscription.activated",
  "subscription.charged",
  "subscription.resumed",
]);

// event -> status we record when access ends or is suspended
const FREE_EVENTS = {
  "subscription.halted": "halted",
  "subscription.cancelled": "cancelled",
  "subscription.completed": "completed",
  "subscription.expired": "expired",
  "subscription.paused": "paused",
};

export async function POST(req) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_ERROR: Missing RAZORPAY_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(body).digest("hex")
  );
  const received = Buffer.from(signature);

  const isValid =
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const subscription = event?.payload?.subscription?.entity;
  const payment = event?.payload?.payment?.entity;
  const clerkUserId = subscription?.notes?.clerk_user_id;

  if (!subscription || !clerkUserId) {
    // Not a subscription event we track (e.g. payment.captured) - ack and move on.
    return NextResponse.json({ received: true });
  }

  try {
    if (PRO_EVENTS.has(event.event)) {
      await markUserProFromSubscription({ clerkUserId, subscription });

      // Only "charged" corresponds 1:1 with an actual payment - "activated"
      // and "charged" can both fire for the first cycle, so gating the email
      // (and the invoice record) on "charged" alone avoids double-counting
      // one charge.
      if (event.event === "subscription.charged" && payment) {
        await recordInvoice({ clerkUserId, subscription, payment });
        await sendInvoiceEmail({ clerkUserId, subscription, payment });

        // Referral/affiliate sale tracking is no longer done from here -
        // ReferralRocket has its own native Razorpay webhook integration
        // (configured directly in the Razorpay dashboard), so no code on our
        // side reports the charge.
      }
    } else if (event.event in FREE_EVENTS) {
      await markUserFree({ clerkUserId, status: FREE_EVENTS[event.event] });

      // Only frees the slot if the reservation never got confirmed (a
      // founding member who cancels after activating keeps their slot -
      // release_founding_slot no-ops on an already-confirmed reservation).
      const foundingReservationId = subscription?.notes?.founding_reservation_id;

      if (foundingReservationId) {
        try {
          await releaseFoundingSlot({ reservationId: foundingReservationId, reason: event.event });
        } catch (releaseError) {
          console.error("RELEASE_FOUNDING_SLOT_ERROR:", foundingReservationId, releaseError);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("RAZORPAY_WEBHOOK_HANDLER_ERROR:", event.event, error);

    // Non-200 makes Razorpay retry the delivery later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
