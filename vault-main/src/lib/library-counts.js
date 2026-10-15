// The one place the library's effect counts are written down. Every page, metadata
// string, JSON-LD block, email and modal reads them from here - never type "50+" or
// "150+" into copy. library-counts.test.js fails if these drift from the registry
// (registry/index.json and public/r/index.json) or if a count is hard-coded elsewhere.
//
// Plain constants rather than a registry read, so client components can import them
// without pulling the whole effect index into the browser bundle.

export const FREE_EFFECTS = 56;
export const PRO_EFFECTS = 94;
export const TOTAL_EFFECTS = FREE_EFFECTS + PRO_EFFECTS;

// Rounded down to the nearest ten for marketing copy: 56 -> "50+", 150 -> "150+".
const roundedLabel = (count) => `${Math.floor(count / 10) * 10}+`;

export const FREE_LABEL = roundedLabel(FREE_EFFECTS);
export const TOTAL_LABEL = roundedLabel(TOTAL_EFFECTS);
