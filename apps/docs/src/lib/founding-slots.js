import "server-only";
import { supabase } from "@/lib/supabase";

// Checkout-modal abandonment window - Razorpay's modal has no hard close
// timeout, so this is what actually reclaims a slot from someone who opens
// checkout and never finishes. Enforced lazily inside claim_founding_slot
// itself (see the SQL migration) rather than a cron sweep.
const RESERVATION_TTL_SECONDS = 15 * 60;

export async function claimFoundingSlot({ clerkUserId, idempotencyKey, currency }) {
  const { data, error } = await supabase.rpc("claim_founding_slot", {
    p_clerk_user_id: clerkUserId,
    p_idempotency_key: idempotencyKey,
    p_currency: currency,
    p_ttl_seconds: RESERVATION_TTL_SECONDS,
  });

  if (error) {
    console.error("CLAIM_FOUNDING_SLOT_ERROR:", error);
    throw error;
  }

  return data?.[0] ?? null; // null = pool full
}

export async function confirmFoundingSlot({ reservationId, razorpaySubscriptionId }) {
  const { data, error } = await supabase.rpc("confirm_founding_slot", {
    p_reservation_id: reservationId,
    p_razorpay_subscription_id: razorpaySubscriptionId,
  });

  if (error) {
    console.error("CONFIRM_FOUNDING_SLOT_ERROR:", error);
    throw error;
  }

  return data?.[0] ?? null;
}

export async function releaseFoundingSlot({ reservationId, reason }) {
  const { data, error } = await supabase.rpc("release_founding_slot", {
    p_reservation_id: reservationId,
    p_reason: reason,
  });

  if (error) {
    console.error("RELEASE_FOUNDING_SLOT_ERROR:", error);
    throw error;
  }

  return data?.[0] ?? null;
}
