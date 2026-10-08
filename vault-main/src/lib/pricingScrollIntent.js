
const STORAGE_KEY = "hyperiux_scroll_to_pricing_cards";

export function markScrollToPricingCards() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
  }
}


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
