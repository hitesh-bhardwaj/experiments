// Lets a component outside LazyRecaptchaProvider's own tree (e.g. a modal
// triggered by cursor behavior rather than a query param) ask it to mount
// the real <ReCaptchaProvider> - same window-CustomEvent pattern as
// wishlistEvents.js, needed here because the two components aren't in a
// parent/child relationship (LazyRecaptchaProvider wraps the root layout,
// the modal is rendered from a page further down the tree).
export const RECAPTCHA_ARM_EVENT = "hyperiux:recaptcha-arm";

export function armRecaptcha() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(RECAPTCHA_ARM_EVENT));
}
