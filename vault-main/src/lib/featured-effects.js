import { effectCategories, resolveEffectCategoryId } from "./categories";

export function getFeaturedEffects(effects = []) {
  return effects.filter((effect) => effect?.isFeatured === true);
}

export function getFeaturedEffectsByCategory(effects = [], categoryId) {
  if (!categoryId || categoryId === "all" || categoryId === "featured") {
    return getFeaturedEffects(effects);
  }

  return getFeaturedEffects(effects).filter(
    (effect) => resolveEffectCategoryId(effect) === categoryId,
  );
}

export function getOverviewFeaturedEffects(effects = []) {
  const featuredByCategory = new Map();

  for (const effect of getFeaturedEffects(effects)) {
    const categoryId = resolveEffectCategoryId(effect);

    if (categoryId && !featuredByCategory.has(categoryId)) {
      featuredByCategory.set(categoryId, effect);
    }
  }

  const orderedCategoryIds = effectCategories
    .map((category) => category.id)
    .filter((categoryId) => categoryId !== "featured");

  const orderedFeaturedEffects = orderedCategoryIds
    .map((categoryId) => featuredByCategory.get(categoryId))
    .filter(Boolean);

  const extraFeaturedEffects = [...featuredByCategory.entries()]
    .filter(([categoryId]) => !orderedCategoryIds.includes(categoryId))
    .map(([, effect]) => effect);

  return [...orderedFeaturedEffects, ...extraFeaturedEffects];
}

export function isFeaturedEffect(effect, effects = []) {
  return effect?.isFeatured === true || getFeaturedEffects(effects).some(
    (featuredEffect) => featuredEffect.name === effect?.name,
  );
}
