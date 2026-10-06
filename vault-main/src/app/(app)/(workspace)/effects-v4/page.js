import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/subscription";
import {
  getAllSanityEffectEntries,
  buildEffectsFromSanity,
} from "@/lib/sanity";
import { getFeaturedEffects, getOverviewFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";
import { EffectsListingV4 } from "./EffectsListingV4";

// Sample of the v4 listing design (public/v4/Effects — Hyperiux Vault.html),
// kept off the index until it replaces /effects.
export const metadata = {
  title: "Effects (v4 preview) | Hyperiux Vault",
  robots: { index: false, follow: false },
};

export default async function EffectsV4Page() {
  const sanityEntries = await getAllSanityEffectEntries();
  const allEffects = sortEffects(buildEffectsFromSanity(sanityEntries));
  const installCounts = await getEffectInstallCounts(allEffects);
  const effects = attachInstallCounts(allEffects, installCounts);

  const featuredNames = getFeaturedEffects(effects).map((effect) => effect.name);
  const trendingEffects = getOverviewFeaturedEffects(effects);

  const { userId } = await auth();
  const userPlan = await getUserPlan(userId);

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EffectsListingV4
        effects={effects}
        trendingEffects={trendingEffects}
        featuredNames={featuredNames}
        userPlan={userPlan}
      />
    </Suspense>
  );
}
