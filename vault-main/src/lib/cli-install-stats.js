import "server-only";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

async function countEffectInstalls(effect) {
  const { count, error } = await supabase
    .from("cli_effect_installs")
    .select("*", { count: "exact", head: true })
    .eq("effect", effect);

  if (error) {
    console.error("CLI_INSTALL_STATS_COUNT_ERROR:", error);
    return 0;
  }

  return count ?? 0;
}

// Every effects listing/category/detail page render was firing one Supabase
// query per effect (up to ~130 in parallel) on every single navigation, with
// no caching - this was the single biggest amplifier of any Supabase
// slowness. Cached per unique slug set so repeat visits within the window
// don't touch Supabase at all, and any single Supabase blip only affects
// requests during that one revalidation instead of every page load.
const getCachedInstallCounts = unstable_cache(
  async (effectSlugs) => {
    const counts = await Promise.all(effectSlugs.map(countEffectInstalls));

    return Object.fromEntries(
      effectSlugs.map((effectSlug, index) => [effectSlug, counts[index]])
    );
  },
  ["cli-install-counts"],
  { revalidate: 60 }
);

export async function getEffectInstallCounts(effects) {
  const effectSlugs = [
    ...new Set(
      effects
        .map((effect) => effect?.name || effect?.effectSlug || effect?.slug)
        .filter(Boolean)
    ),
  ].sort();

  if (effectSlugs.length === 0) return {};

  return getCachedInstallCounts(effectSlugs);
}

export function attachInstallCounts(effects, installCounts) {
  return effects.map((effect) => {
    const effectSlug = effect?.name || effect?.effectSlug || effect?.slug;

    return {
      ...effect,
      installCount: installCounts?.[effectSlug] ?? 0,
    };
  });
}
