import "server-only";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { getEffectHref } from "@/lib/categories";

// Shared by /api/effects/search-index (the client-side fallback GlobalSearch
// uses when no `effects` prop is passed) and by server components that want
// to pass `effects` down directly instead of relying on that client fetch -
// same shape either way, so GlobalSearch's category icon/label resolution
// behaves identically regardless of which path fed it.
function normalizeEffectForSearch(effect) {
  const href = getEffectHref(effect);
  const hrefParts = href.split("/").filter(Boolean);

  const categorySlug =
    effect.categorySlug ||
    hrefParts[1] ||
    effect.category ||
    effect.categories?.[0] ||
    "featured";

  const effectSlug =
    effect.effectSlug ||
    effect.slug ||
    effect.name ||
    hrefParts[2];

  return {
    name: effect.name,
    title: effect.title,
    description: effect.description,
    category: effect.category,
    categories: effect.categories || [],
    slug: effect.slug,
    effectSlug,
    categorySlug,
    tier: effect.tier,
    addedAt: effect.addedAt ?? 0,
    dependencies: effect.dependencies || [],
    href,
  };
}

export async function getSearchIndexEffects() {
  const sanityEntries = await getAllSanityEffectEntries();
  const effects = buildEffectsFromSanity(sanityEntries);

  const sortedEffects = [...effects].sort(
    (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)
  );

  return sortedEffects.map(normalizeEffectForSearch);
}
