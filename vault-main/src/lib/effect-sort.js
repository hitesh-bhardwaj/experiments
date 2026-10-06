export const EFFECT_CATEGORY_FILTER_OPTIONS = ["featured", "free", "pro"];
export const EFFECT_SORT_OPTIONS = ["az", "za", "recent"];
export const FILTER_OPTIONS = [
  "none",
  ...EFFECT_CATEGORY_FILTER_OPTIONS,
  ...EFFECT_SORT_OPTIONS,
];

function getComparableTitle(effect) {
  return String(effect?.title || effect?.name || effect?.effectSlug || "");
}

function compareByTitle(a, b, direction = "asc") {
  const result = getComparableTitle(a).localeCompare(getComparableTitle(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "desc" ? -result : result;
}

function compareByRecent(a, b) {
  const result = (b?.addedAt ?? 0) - (a?.addedAt ?? 0);

  return result || compareByTitle(a, b);
}

export function sortEffects(effects = [], sortFilter = null) {
  const sortedEffects = [...effects];

  if (sortFilter === "az") {
    return sortedEffects.sort((a, b) => compareByTitle(a, b));
  }

  if (sortFilter === "za") {
    return sortedEffects.sort((a, b) => compareByTitle(a, b, "desc"));
  }

  if (sortFilter === "recent") {
    return sortedEffects.sort(compareByRecent);
  }

  return sortedEffects;
}
