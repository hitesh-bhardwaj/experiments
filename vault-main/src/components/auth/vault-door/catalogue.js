import "server-only";
import { getPublicEffectBySlug, getRegistryIndex } from "@/lib/registry";
import { getQuickCategoryLabel } from "@/lib/categories";

// Read once per server instance: the per-effect files also carry source code
let cachedCatalogue = null;

function toCatalogueEntry(item) {
  const title = getPublicEffectBySlug(item.name)?.title;

  return {
    name: title || item.name,
    category: getQuickCategoryLabel(item.category || "other"),
    tier: item.tier === "pro" ? "pro" : "free",
  };
}

// The effects shown as nodes in the core, plus the counts the HUD reads out
export function getVaultCatalogue() {
  if (cachedCatalogue) return cachedCatalogue;

  const effects = (getRegistryIndex()?.items ?? []).map(toCatalogueEntry);
  const free = effects.filter((effect) => effect.tier === "free").length;

  cachedCatalogue = {
    effects,
    stats: {
      total: effects.length,
      free,
      pro: effects.length - free,
      categories: new Set(effects.map((effect) => effect.category)).size,
    },
  };

  return cachedCatalogue;
}
