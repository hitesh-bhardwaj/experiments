import "server-only";
import { supabase } from "@/lib/supabase";
import { razorpay } from "@/lib/razorpay";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";

// Upgrading Pro -> Pro+ starts a new Razorpay subscription and cancels the
// old one once the new one is paid (create-subscription stamps the old ID on
// the new one's notes as replaces_subscription_id). The user keeps one
// subscriptions row, so Razorpay events for the old subscription - its
// "cancelled" above all - must not touch that row afterwards.

// Whether a webhook event for `subscription` should update the user's row.
//   kind "start": activated / charged / resumed
//   kind "end":   halted / cancelled / completed / expired / paused
export async function shouldApplySubscriptionEvent({ clerkUserId, subscription, kind }) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("razorpay_subscription_id, plan, status")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  // Thrown, so the webhook answers non-200 and Razorpay retries later
  if (error) throw error;

  const currentId = data?.razorpay_subscription_id;
  if (!currentId || currentId === subscription?.id) return true;

  // Another subscription is the current one: this one was replaced
  if (kind === "end") return false;

  // The upgrade's new subscription, arriving before verify-payment switched the row
  if (subscription?.notes?.replaces_subscription_id === currentId) return true;

  // A fresh subscription after the old one ended (re-subscribing) is fine;
  // a stray event while another subscription is live is not
  return !(data.plan === "pro" && ACTIVE_PRO_STATUSES.includes(data.status));
}

// Cancels the subscription an upgrade replaced, right away (not at the end of
// its cycle), so it never charges again. Safe to call more than once: both
// verify-payment and the webhook call it, and an already-cancelled
// subscription is left as it is. Returns true when nothing is left to cancel.
export async function cancelReplacedSubscription(subscription) {
  const oldId = subscription?.notes?.replaces_subscription_id;
  if (!oldId || oldId === subscription?.id) return true;

  try {
    const old = await razorpay.subscriptions.fetch(oldId);
    if (["cancelled", "completed", "expired"].includes(old?.status)) return true;
    await razorpay.subscriptions.cancel(oldId, false);
    return true;
  } catch (error) {
    // Loud on purpose: a failure here leaves the old plan billing as well
    console.error("CANCEL_REPLACED_SUBSCRIPTION_ERROR:", oldId, "replaced by", subscription?.id, error);
    return false;
  }
}
