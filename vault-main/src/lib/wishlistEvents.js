export const WISHLIST_CHANGED_EVENT = "hyperiux:wishlist-changed";

export function emitWishlistChanged(saved) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(WISHLIST_CHANGED_EVENT, { detail: { saved } })
  );
}
