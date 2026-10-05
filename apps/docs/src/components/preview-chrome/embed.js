/**
 * Shared helpers for DemoHeader and the demo page it previews inside its device iframe.
 *
 *   · DEVICES                        → real device sizes the Tablet / Phone previews render at
 *   · simulateReducedMotion(on)      → makes matchMedia('(prefers-reduced-motion: reduce)') match
 *   · readEmbed()                    → inside the device iframe: `?embed=1` / `?rm=1`
 *   · onEmbedValues(cb)              → inside the device iframe: props edited in the host's panel
 *   · prefersReducedMotion()         → the user's real setting, ignoring the simulation
 */

export const DEVICES = { full: null, tablet: [820, 1180], phone: [390, 844] };
export const EMBED_MESSAGE = "vault-preview:values";
const RM_QUERY = /prefers-reduced-motion\s*:\s*reduce/;

/* ---------- reduced-motion simulation (shared by host page and embedded page) ---------- */
let rmOn = false;
let origMatchMedia = null;

function fakeList(media) {
  return {
    matches: true,
    media,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false;
    },
  };
}

export function simulateReducedMotion(on) {
  if (typeof window === "undefined") return;
  if (!origMatchMedia) {
    origMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (q) => (rmOn && RM_QUERY.test(q) ? fakeList(q) : origMatchMedia(q));
  }
  rmOn = !!on;
  document.documentElement.toggleAttribute("data-pc-rm", rmOn);
}

export const isReducedMotionSimulated = () => rmOn;

/** The user's own reduced-motion preference, unaffected by the simulation. */
export function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return (origMatchMedia ?? window.matchMedia.bind(window))("(prefers-reduced-motion: reduce)").matches;
}

/** Inside the device iframe: `?embed=1` hides the header, `?rm=1` turns on reduced motion. Call before effects mount. */
export function readEmbed(search = typeof location !== "undefined" ? location.search : "") {
  const params = new URLSearchParams(search);
  const embed = params.get("embed") === "1";
  const rm = params.get("rm") === "1";
  if (embed && typeof document !== "undefined") document.documentElement.setAttribute("data-pc-embed", "");
  if (rm) simulateReducedMotion(true);
  return { embed, rm };
}

/** Inside the device iframe: receive edited props from the host header. Returns an unsubscribe fn. */
export function onEmbedValues(cb) {
  const fn = (e) => {
    if (e.origin === location.origin && e.data && e.data.type === EMBED_MESSAGE) cb(e.data.values);
  };
  addEventListener("message", fn);
  return () => removeEventListener("message", fn);
}
