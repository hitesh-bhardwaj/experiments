import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getEffectCategoryBySlug,
  getEffectCategoryContent,
  getEffectCategoryMetadata,
} from "@/lib/categories";
import { EffectsListing } from "../EffectsListing";
import { sortEffects } from "@/lib/effect-sort";
import {
  getAllSanityEffectEntries,
  buildEffectsFromSanity,
  getEffectsByCategoryFromSanity,
} from "@/lib/sanity";
import {
  getFeaturedEffects,
  getFeaturedEffectsByCategory,
  getOverviewFeaturedEffects,
} from "@/lib/featured-effects";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { getEffectInstallCounts } from "@/lib/cli-install-stats";

function VaultFallback() {
  return (
    <div className="min-h-[300vh] w-screen bg-black">
    </div>
  );
}

export async function generateStaticParams() {
  const entries = await getAllSanityEffectEntries();
  const slugs = new Set(["free", "featured", "pro"]);

  for (const entry of entries) {
    if (entry.categorySlug) {
      const category = getEffectCategoryBySlug(entry.categorySlug);
      slugs.add(entry.categorySlug);
      slugs.add(category?.slug || entry.categorySlug);
    }
  }

  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const category = getEffectCategoryBySlug(slug);

  if (slug === "free" || slug === "featured" || slug === "pro" || category) {
    return getEffectCategoryMetadata(slug);
  }

  return getEffectCategoryMetadata("all", {
    title: "Category Not Found",
    description: "Effect category not found.",
    url: `/effects/${slug}`,
  });
}

// ISR: the listing is cached and rebuilt in the background at most once a
// minute - matching the install-count cache (lib/cli-install-stats), the
// shortest-lived data on the page. Effect content itself is cached for an hour
// and cleared on publish via /api/revalidate. The visitor's plan is fetched on
// the client (useUserPlan), so the cached page is the same for everyone.
export const revalidate = 60;

// Category listing (/effects/text, /effects/free, /effects/pro, /effects/featured, ...):
// the v4 listing scoped to this category, with the category's own hero copy, FAQ
// and CTA. Every effect is passed so the tier/featured/tag filters and the category
// chips' counts work; the chips link between category pages.
export default async function EffectsCategoryPage({ params }) {
  const { slug } = await params;
  const isFreeListing = slug === "free";
  const isFeaturedListing = slug === "featured";
  const isProListing = slug === "pro";
  const category = getEffectCategoryBySlug(slug);

  const sanityEntries = await getAllSanityEffectEntries();
  const categoriesMap = getEffectsByCategoryFromSanity(sanityEntries);

  if (!isFreeListing && !isFeaturedListing && !isProListing && (!category || !categoriesMap[category.id])) {
    notFound();
  }

  const scope = isFreeListing ? "free" : isFeaturedListing ? "featured" : isProListing ? "pro" : category.id;

  const effects = sortEffects(buildEffectsFromSanity(sanityEntries));
  // Install counts (Supabase) are baked into each ISR build of the page.
  const installCountsPromise = getEffectInstallCounts(effects).catch(() => ({}));
  const featuredNames = getFeaturedEffects(effects).map((effect) => effect.name);
  const trendingEffects =
    category?.id && !isFreeListing && !isFeaturedListing && !isProListing
      ? getFeaturedEffectsByCategory(effects, category.id)
      : getOverviewFeaturedEffects(effects);

  const pageMetadata = getEffectCategoryMetadata(scope === category?.id ? category : scope);
  const pageContent = getEffectCategoryContent(scope === category?.id ? category : scope);

  return (
    <>
      <WebpageJsonLd metadata={pageMetadata} />
      <BreadcrumbsJSONLD pathname={pageMetadata.url} />
      {pageContent.faqs?.length > 0 && <FAQJSONLD faqs={pageContent.faqs} />}
      <Suspense fallback={<VaultFallback />}>
        <EffectsListing
          effects={effects}
          trendingEffects={trendingEffects}
          featuredNames={featuredNames}
          installCounts={installCountsPromise}
          scope={scope}
          content={pageContent}
        />
      </Suspense>
    </>
  );
}
