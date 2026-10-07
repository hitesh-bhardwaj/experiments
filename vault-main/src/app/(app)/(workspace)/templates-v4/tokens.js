// Shared by the v4 templates listing, its cards and the corridor.

/* ---------- text sizes (vw: desktop · tablet · mobile), same scale as the effects v4 listing ---------- */
export const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw]";
export const T13 = "text-[0.9vw] max-lg:text-[1.6vw] max-md:text-[3.3vw]";
export const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";
export const T16 = "text-[1.1vw] max-lg:text-[1.95vw] max-md:text-[4.1vw]";
export const T18 = "text-[1.25vw] max-lg:text-[2.2vw] max-md:text-[4.4vw]";
export const T20 = "text-[1.4vw] max-lg:text-[2.4vw] max-md:text-[5vw]";

// Headings and small labels. Plain case and default letter-spacing throughout
// these pages; every text size is in vw.
export const DISPLAY = "font-normal";
export const LABEL = T14;
export const T10 = "text-[0.66vw] max-lg:text-[1.2vw] max-md:text-[2.5vw]";
export const T24 = "text-[1.7vw] max-lg:text-[3.4vw] max-md:text-[6vw]";
export const T40 = "text-[3.5vw] max-lg:text-[4.6vw] max-md:text-[8vw]";

// Prices ($39 and the like) are always set in Aeonik Pro.
export const PRICE = "font-aeonik";

export const GUTTER = "px-[3.4vw] max-lg:px-[5vw] max-md:px-5";

// Small pill on a template shot (category, price, catalogue).
export const BADGE = `inline-flex py-1 items-center gap-1.5 px-2.25 ${T14} backdrop-blur-md`;

/*
 * Which credit catalogue a template sits in: "selected" templates can be
 * redeemed with a Pro credit, "full" ones need Pro+ (see the pricing page's
 * credit wallet). Not in lib/mock-templates yet, so this is placeholder data
 * for the sample page; anything missing counts as "selected".
 */
const SAMPLE_CATALOGUE = {
  elenavoss: "selected",
  lumera: "selected",
  "oris-dental": "full",
  kyntra: "full",
};

export const catalogueOf = (template) => template.catalogue || SAMPLE_CATALOGUE[template.slug] || "selected";
export const catalogueLabel = (template) => (catalogueOf(template) === "full" ? "Pro+ only" : "✦ Selected");
export const priceOf = (template) => template.pricing?.standaloneOneTime ?? null;

// Template links inside the sample stay inside the sample.
export const sampleHref = (slug) => `/templates-v4/${slug}`;
