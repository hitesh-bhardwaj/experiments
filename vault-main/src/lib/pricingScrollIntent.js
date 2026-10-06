// Cross-page "scroll to the pricing cards once you land on /pricing" signal.
//
// A `#pricing-cards` hash on the href looks like the obvious way to do this,
// and it does work for a full page load - but a client-side <Link>
// navigation into /pricing from elsewhere in the app (VaultHeader's
// "Upgrade to Pro", the dashboard, CliTokenManager) was observed dropping
// the hash (and any query string) from the URL entirely once the
// navigation lands, so PricingV3 never saw it. sessionStorage isn't touched
// by routing at all, so it survives that navigation reliably - this flag is
// the actual signal PricingV3 acts on; the hash is left on the href only as
// a harmless progressive-enhancement fallback (still works for a real full
// page load / shared link).
const STORAGE_KEY = "hyperiux_scroll_to_pricing_cards";

export function markScrollToPricingCards() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Storage can throw in private-browsing/locked-down contexts - the hash
    // fallback on the href still covers a full page load either way.
  }
}

// Read-only - safe to call on every render/effect re-run (e.g. while a
// dependency like a Lenis instance is still settling) without losing the
// flag before the caller has actually acted on it.
export function hasScrollToPricingCardsIntent() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// Call once the scroll has actually happened, not just been checked for.
export function clearScrollToPricingCardsIntent() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}
