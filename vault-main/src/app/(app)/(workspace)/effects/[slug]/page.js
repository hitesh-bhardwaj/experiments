import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getEffectCategoryBySlug,
  getEffectCategoryContent,
  getEffectCategoryMetadata,
} from "@/lib/categories";
import { VaultContent } from "../vault-content";
import { getUserPlan } from "@/lib/subscription";
import { auth } from "@clerk/nextjs/server";
import { sortEffects } from "@/lib/effect-sort";
import {
  getAllSanityEffectEntries,
  buildRegistryIndex,
  buildEffectsFromSanity,
  getEffectsByCategoryFromSanity,
} from "@/lib/sanity";
import { getEffectTierCounts } from "@/lib/registry";
import {
  getFeaturedEffects,
  getFeaturedEffectsByCategory,
  getOverviewFeaturedEffects,
} from "@/lib/featured-effects";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";

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

export default async function EffectsCategoryPage({ params }) {
  const { userId } = await auth();
  const { slug } = await params;
  const isFreeListing = slug === "free";
  const isFeaturedListing = slug === "featured";
  const isProListing = slug === "pro";
  const category = getEffectCategoryBySlug(slug);
  const userPlan = await getUserPlan(userId);

  const sanityEntries = await getAllSanityEffectEntries();
  const registryIndex = buildRegistryIndex(sanityEntries);
  const allEffects = buildEffectsFromSanity(sanityEntries);
  const categoriesMap = getEffectsByCategoryFromSanity(sanityEntries);
  const sortedEffects = sortEffects(allEffects);
  const featuredEffects = getFeaturedEffects(allEffects);
  const pageTrendingEffects =
    category?.id && !isFreeListing && !isFeaturedListing && !isProListing
      ? getFeaturedEffectsByCategory(allEffects, category.id)
      : getOverviewFeaturedEffects(allEffects);

  // Initial category filter matching
  const categoryId = isFreeListing ? "free" : isFeaturedListing ? "featured" : isProListing ? "pro" : category?.id;
  const categoryEffects = sortedEffects.filter((effect) => {
    if (categoryId === "free") return effect.tier !== "pro";
    if (categoryId === "pro") return effect.tier === "pro";
    if (categoryId === "featured") return featuredEffects.some((f) => f.name === effect.name);
    return effect.categorySlug === slug || effect.categories?.includes(slug);
  });

  const initialSlice = categoryEffects.slice(0, 18);
  const initialInstallEffects = [...new Set([...initialSlice, ...featuredEffects, ...pageTrendingEffects])];
  const installCounts = await getEffectInstallCounts(initialInstallEffects);
  const initialEffectsWithCounts = attachInstallCounts(initialSlice, installCounts);
  const featuredEffectsWithCounts = attachInstallCounts(featuredEffects, installCounts);
  const trendingEffectsWithCounts = attachInstallCounts(pageTrendingEffects, installCounts);

  const effectCounts = {};
  for (const [catId, catEffects] of Object.entries(categoriesMap)) {
    effectCounts[catId] = catEffects.length;
  }
  Object.assign(effectCounts, getEffectTierCounts());
  effectCounts.featured = featuredEffects.length;

  if (!isFreeListing && !isFeaturedListing && !isProListing && (!category || !categoriesMap[category.id])) {
    notFound();
  }

  const pageMetadata = getEffectCategoryMetadata(
    isFreeListing ? "free" : isFeaturedListing ? "featured" : isProListing ? "pro" : category
  );
  const pageContent = getEffectCategoryContent(
    isFreeListing ? "free" : isFeaturedListing ? "featured" : isProListing ? "pro" : category
  );

  return (
    <>
      <WebpageJsonLd metadata={pageMetadata} />
      <BreadcrumbsJSONLD pathname={pageMetadata.url} />
      {pageContent.faqs?.length > 0 && <FAQJSONLD faqs={pageContent.faqs} />}
      <Suspense fallback={<VaultFallback />}>
        <VaultContent
          effects={registryIndex}
          initialEffects={initialEffectsWithCounts}
          featuredEffects={featuredEffectsWithCounts}
          trendingEffects={trendingEffectsWithCounts}
          effectCounts={effectCounts}
          initialCategory={categoryId}
          userPlan={userPlan}
        />
      </Suspense>
    </>
  );
}
