import { Suspense } from "react";
import { getUserPlan } from "@/lib/subscription";
import { auth } from "@clerk/nextjs/server";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { getFeaturedEffects, getOverviewFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import { getEffectCategoryContent, getEffectCategoryMetadata } from "@/lib/categories";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";
import { EffectsListingV4 } from "./EffectsListingV4";

export const metadata = getEffectCategoryMetadata("all");
const pageContent = getEffectCategoryContent("all");

function VaultFallback() {
  return <div className="min-h-[300vh] w-screen bg-black"></div>;
}

// The full effects listing (v4). Category chips link to /effects/[slug], which
// renders the same listing scoped to that category.
export default async function EffectsPage() {
  const sanityEntries = await getAllSanityEffectEntries();
  const allEffects = sortEffects(buildEffectsFromSanity(sanityEntries));
  const installCounts = await getEffectInstallCounts(allEffects);
  const effects = attachInstallCounts(allEffects, installCounts);
  const featuredNames = getFeaturedEffects(effects).map((effect) => effect.name);
  const trendingEffects = getOverviewFeaturedEffects(effects);

  const { userId } = await auth();
  const userPlan = await getUserPlan(userId);

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      {pageContent.faqs?.length > 0 && <FAQJSONLD faqs={pageContent.faqs} />}
      <Suspense fallback={<VaultFallback />}>
        <EffectsListingV4
          effects={effects}
          trendingEffects={trendingEffects}
          featuredNames={featuredNames}
          userPlan={userPlan}
          content={pageContent}
          routeCategories
        />
      </Suspense>
    </>
  );
}
