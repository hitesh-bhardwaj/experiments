// Shared by the v4 templates listing, its cards and the corridor.

/* ---------- text sizes (vw: desktop · tablet · mobile), same scale as the effects v4 listing ---------- */
export const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw]";
export const T12 = "text-[0.87vw] max-lg:text-[1.5vw] max-md:text-[3.2vw]";
export const T13 = "text-[0.9vw] max-lg:text-[1.6vw] max-md:text-[3.3vw]";
export const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";
export const T15 = "text-[1.04vw] max-lg:text-[1.8vw] max-md:text-[3.8vw]";
export const T16 = "text-[1.1vw] max-lg:text-[1.95vw] max-md:text-[4.1vw]";
export const T18 = "text-[1.25vw] max-lg:text-[2.2vw] max-md:text-[4.4vw]";
export const T20 = "text-[1.4vw] max-lg:text-[2.4vw] max-md:text-[5vw]";

// Headings and small labels. Plain case and default letter-spacing throughout
// these pages; every text size is in vw.
export const DISPLAY = "font-normal";
export const LABEL = T14;
export const T28 = "text-[1.95vw] max-lg:text-[3.4vw] max-md:text-[7vw]";
export const T24 = "text-[1.7vw] max-lg:text-[3.4vw] max-md:text-[6vw]";


// Prices ($39 and the like) are always set in Aeonik Pro.
export const PRICE = "font-aeonik";

// The standard section wrapper: capped width + page gutter
export const GUTTER = "site-container section-x";

// Small pill on a template shot (category, price, catalogue).
// Badges sit on the card shot - a barely-there shadow (as on the effect cards) keeps
// them readable over any screenshot.
export const BADGE = `inline-flex py-1 items-center gap-1.5 px-2.25 ${T14} backdrop-blur-lg shadow-[0_0.1vw_0.4vw_color-mix(in_srgb,black_8%,transparent)]`;

// Which credit catalogue a template sits in (lib/mock-templates): "selected"
// templates can be redeemed with a Pro credit, "full" ones need Pro+.
// Anything missing counts as "selected".
export const catalogueOf = (template) => template.catalogue || "selected";
export const catalogueLabel = (template) => (catalogueOf(template) === "full" ? "Pro+ Only" : "Selected");
export const priceOf = (template) => template.pricing?.standaloneOneTime ?? null;

// Template cards fade up as they scroll into view, matching the site's .fadeup (50px,
// 1.2s, power3.out, at 90% of the viewport), with the right column a beat behind the
// left. Spread onto a motion element; used by the /templates grid and the detail page's
// "More templates". Done with motion rather than .fadeup: useFadeUp only scans once, and
// the listing's cards mount and unmount as the filters change.
export const cardReveal = (index) => ({
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -10% 0px" },
  transition: { duration: 1.2, ease: [0.165, 0.84, 0.44, 1], delay: (index % 2) * 0.12 },
});
