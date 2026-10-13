"use client";

// Today's install usage ({ limit, count, remaining, effectSlugs, plan, tier,
// isAdmin } from /api/copy-usage), shared between every place that copies on
// a page - effect cards, the preview drawer, the effect page's code blocks
// and its Get code menu - so a copy in one locks or unlocks the others at once.
const EVENT = "vault:copy-usage";

export function publishCopyUsage(usage) {
  if (!usage || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: usage }));
}

export function subscribeCopyUsage(onUsage) {
  const handler = (event) => onUsage(event.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// Some responses (the Get code copy route) carry the counts but not the list
// of effects unlocked today - keep the known list, plus this effect if allowed.
export function mergeCopyUsage(previous, next, effectSlug) {
  if (!next) return previous;
  let effectSlugs = next.effectSlugs ?? previous?.effectSlugs ?? [];
  if (!next.effectSlugs && effectSlug && next.allowed && !effectSlugs.includes(effectSlug)) {
    effectSlugs = [...effectSlugs, effectSlug];
  }
  return { ...previous, ...next, effectSlugs };
}
