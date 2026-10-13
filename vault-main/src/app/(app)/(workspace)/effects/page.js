import { Suspense } from "react";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { getFeaturedEffects, getOverviewFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import { getEffectCategoryContent, getEffectCategoryMetadata } from "@/lib/categories";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { getEffectInstallCounts } from "@/lib/cli-install-stats";
import { EffectsListing } from "./EffectsListing";

export const metadata = getEffectCategoryMetadata("all");
const pageContent = getEffectCategoryContent("all");

function VaultFallback() {
  return <div className="min-h-[300vh] w-screen bg-black"></div>;
}

// ISR: the listing is cached and rebuilt in the background at most once a
// minute - matching the install-count cache (lib/cli-install-stats), the
// shortest-lived data on the page. Effect content itself is cached for an hour
// and cleared on publish via /api/revalidate. The visitor's plan is fetched on
// the client (useUserPlan), so the cached page is the same for everyone.
export const revalidate = 60;

// The full effects listing (v4). Category chips link to /effects/[slug], which
// renders the same listing scoped to that category.
export default async function EffectsPage() {
  const sanityEntries = await getAllSanityEffectEntries();
  const effects = sortEffects(buildEffectsFromSanity(sanityEntries));
  // Install counts (Supabase) are baked into each ISR build of the page.
  const installCountsPromise = getEffectInstallCounts(effects).catch(() => ({}));
  const featuredNames = getFeaturedEffects(effects).map((effect) => effect.name);
  const trendingEffects = getOverviewFeaturedEffects(effects);


  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      {pageContent.faqs?.length > 0 && <FAQJSONLD faqs={pageContent.faqs} />}
      <Suspense fallback={<VaultFallback />}>
        <EffectsListing
          effects={effects}
          trendingEffects={trendingEffects}
          featuredNames={featuredNames}
          installCounts={installCountsPromise}
          content={pageContent}
        />
      </Suspense>
    </>
  );
}
