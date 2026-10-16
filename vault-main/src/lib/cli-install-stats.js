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
// Count queries run this many at a time, not all ~150 at once - a build
// renders pages on several workers together, and an unbounded burst from each
// times Supabase out.
const COUNT_CONCURRENCY = 12;

async function countAll(effectSlugs) {
  const counts = new Array(effectSlugs.length);
  let next = 0;
  async function worker() {
    while (next < effectSlugs.length) {
      const index = next++;
      counts[index] = await countEffectInstalls(effectSlugs[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(COUNT_CONCURRENCY, effectSlugs.length) }, worker));
  return counts;
}

const getCachedInstallCounts = unstable_cache(
  async (effectSlugs) => {
    const counts = await countAll(effectSlugs);

    return Object.fromEntries(
      effectSlugs.map((effectSlug, index) => [effectSlug, counts[index]])
    );
  },
  ["cli-install-counts"],
  { revalidate: 60 }
);

// unstable_cache only stores a result once it's back, so pages rendering at
// the same moment (a build prerenders every effect page at once - 240+, each
// asking for the same set) would each run the ~150 count queries and time
// Supabase out. They share the one request in flight instead.
const inFlight = new Map();

export async function getEffectInstallCounts(effects) {
  const effectSlugs = [
    ...new Set(
      effects
        .map((effect) => effect?.name || effect?.effectSlug || effect?.slug)
        .filter(Boolean)
    ),
  ].sort();

  if (effectSlugs.length === 0) return {};

  const key = effectSlugs.join(",");
  if (!inFlight.has(key)) {
    inFlight.set(key, getCachedInstallCounts(effectSlugs).finally(() => inFlight.delete(key)));
  }
  return inFlight.get(key);
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
