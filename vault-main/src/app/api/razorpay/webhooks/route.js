import { NextResponse } from "next/server";
import crypto from "crypto";
import { markUserProFromSubscription, markUserFree, sendInvoiceEmail, recordInvoice } from "@/lib/pro-access";
import { releaseFoundingSlot } from "@/lib/founding-slots";
import { grantCreditsForCharge } from "@/lib/template-credits";
import { cancelReplacedSubscription, shouldApplySubscriptionEvent } from "@/lib/subscription-events";

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

  // A prorated Pro -> Pro+ upgrade starts in the future (lib/upgrade.js): it's
  // paid up front, but Razorpay only marks it "authenticated" until the first
  // full charge, so that event grants Pro+ for upgrades
  const isUpgradeStart =
    event.event === "subscription.authenticated" && Boolean(subscription.notes?.replaces_subscription_id);

  try {
    const kind = PRO_EVENTS.has(event.event) || isUpgradeStart ? "start" : event.event in FREE_EVENTS ? "end" : null;

    // After a Pro -> Pro+ upgrade the old subscription still sends events
    // (its own cancellation above all); they must not touch the user's plan
    if (kind && !(await shouldApplySubscriptionEvent({ clerkUserId, subscription, kind }))) {
      return NextResponse.json({ received: true, ignored: "replaced-subscription" });
    }

    if (PRO_EVENTS.has(event.event) || isUpgradeStart) {
      await markUserProFromSubscription({ clerkUserId, subscription });

      // Upgrade: make sure the subscription it replaced is cancelled (also
      // done by verify-payment; a no-op once cancelled)
      await cancelReplacedSubscription(subscription);

      // Only "charged" corresponds 1:1 with an actual payment - "activated"
      // and "charged" can both fire for the first cycle, so gating the email
      // (and the invoice record) on "charged" alone avoids double-counting
      // one charge.
      // An upgrade's "authenticated" event carries its upfront payment, which
      // pays for its first period - credited as its first charge
      if ((event.event === "subscription.charged" || isUpgradeStart) && payment) {
        await recordInvoice({ clerkUserId, subscription, payment });
        // Throws on a Supabase error so Razorpay retries the delivery -
        // safe, since a payment ID only ever adds credits once.
        await grantCreditsForCharge({
          clerkUserId,
          subscription: isUpgradeStart ? { ...subscription, paid_count: subscription.paid_count || 1 } : subscription,
          payment,
          isUpgradePayment: isUpgradeStart,
        });
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
