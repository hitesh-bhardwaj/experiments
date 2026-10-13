"use client";

import { isPlanKey } from "@/lib/plans";

// The plan a signed-out visitor clicked, kept in the browser while they sign
// in or sign up - by whichever route (email, Google, Clerk's continue page),
// some of which drop redirect_url. PendingCheckoutResume and the pricing
// cards read it back to open checkout once they're signed in.
const KEY = "vault:pending-checkout";
const MAX_AGE_MS = 30 * 60 * 1000;

export { isPlanKey };

export function savePendingCheckout(planKey) {
  if (!isPlanKey(planKey)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ plan: planKey, at: Date.now() }));
  } catch {}
}

export function readPendingCheckout() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) || "null");
    if (saved && isPlanKey(saved.plan) && Date.now() - saved.at < MAX_AGE_MS) return saved.plan;
    window.localStorage.removeItem(KEY);
  } catch {}
  return null;
}

export function clearPendingCheckout() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
