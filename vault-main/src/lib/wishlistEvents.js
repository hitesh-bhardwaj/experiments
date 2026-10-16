export const WISHLIST_CHANGED_EVENT = "hyperiux:wishlist-changed";

// `saved`: whether it's saved now; `name`: the effect's slug (the dashboard's Saved page
// drops an unsaved card at once)
export function emitWishlistChanged(saved, name = null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(WISHLIST_CHANGED_EVENT, { detail: { saved, name } })
  );
}
