import { Suspense } from "react";
import { VaultContent } from "./vault-content";
import { getUserPlan } from "@/lib/subscription";
import { auth } from "@clerk/nextjs/server";
import {
  getAllSanityEffectEntries,
  buildRegistryIndex,
  buildEffectsFromSanity,
  getEffectsByCategoryFromSanity,
} from "@/lib/sanity";
import { getEffectTierCounts } from "@/lib/registry";
import { getFeaturedEffects, getOverviewFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import {
  getEffectCategoryContent,
  getEffectCategoryMetadata,
} from "@/lib/categories";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";

export const metadata = getEffectCategoryMetadata("all");
const pageContent = getEffectCategoryContent("all");

function VaultFallback() {
  return <div className="min-h-[300vh] w-screen bg-black"></div>;
}

export default async function EffectsPage() {
  const sanityEntries = await getAllSanityEffectEntries();
  const registryIndex = buildRegistryIndex(sanityEntries);
  const allEffects = buildEffectsFromSanity(sanityEntries);
  const categories = getEffectsByCategoryFromSanity(sanityEntries);
  const sortedEffects = sortEffects(allEffects);
  const featuredEffects = getFeaturedEffects(allEffects);
  const trendingEffects = getOverviewFeaturedEffects(allEffects);

  // Initial 18 cards for immediate first paint
  const initialSlice = sortedEffects.slice(0, 18);
  const initialInstallEffects = [...new Set([...initialSlice, ...featuredEffects, ...trendingEffects])];
  const installCounts = await getEffectInstallCounts(initialInstallEffects);
  const initialEffectsWithCounts = attachInstallCounts(initialSlice, installCounts);
  const featuredEffectsWithCounts = attachInstallCounts(featuredEffects, installCounts);
  const trendingEffectsWithCounts = attachInstallCounts(trendingEffects, installCounts);

  const effectCounts = {};
  for (const [category, catEffects] of Object.entries(categories)) {
    effectCounts[category] = catEffects.length;
  }
  Object.assign(effectCounts, getEffectTierCounts());
  effectCounts.featured = featuredEffects.length;
  const { userId } = await auth();
  const userPlan = await getUserPlan(userId);
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      {pageContent.faqs?.length > 0 && <FAQJSONLD faqs={pageContent.faqs} />}
      <Suspense fallback={<VaultFallback />}>
        <VaultContent
          effects={registryIndex}
          initialEffects={initialEffectsWithCounts}
          featuredEffects={featuredEffectsWithCounts}
          trendingEffects={trendingEffectsWithCounts}
          effectCounts={effectCounts}
          userPlan={userPlan}
        />
      </Suspense>
    </>
  );
}
