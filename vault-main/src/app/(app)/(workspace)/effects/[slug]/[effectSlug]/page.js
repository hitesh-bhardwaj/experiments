import { notFound, permanentRedirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import {
  getAllPrivateEffects,
  getEffectMetadata,
  getEffectSource,
  getEffectTierCounts,
} from "@/lib/registry";

import {
  getAllSanityEffectEntries,
  getSanityEffectContent,
  buildEffectsFromSanity,
  getEffectsByCategoryFromSanity,
} from "@/lib/sanity";
import { getUserPlan } from "@/lib/subscription";
import { getEffectAccessDecision } from "@/lib/effect-access";
import { getEffectCategoryBySlug } from "@/lib/categories";
import { EffectDetailContent } from "../effect-detail";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { createPageMetadata } from "@/lib/seo-metadata";
import { resolveOgImageUrl } from "@/lib/media";
import { attachInstallCounts, getEffectInstallCounts } from "@/lib/cli-install-stats";

// Mirrors effect-detail.jsx's isCodeOnlyBlock - a Sanity portable-text block
// whose only content is a single "code"-marked span (used for freeform code
// snippets outside of explicit effectCodeBlock entries).
function isCodeOnlyBlock(block) {
  const children = block?.children || [];

  if (!children.length) return false;

  return children.every(
    (child) => child?._type === "span" && (child.marks || []).includes("code")
  );
}

// Sanity content.body can carry full Pro source two ways: explicit
// effectCodeBlock entries (block.code) and "code-only" portable-text blocks
// (block.children[].text). effect-detail.jsx already gates which component
// renders based on isLocked, but that only controls the UI - the underlying
// block data still gets passed to the client component and serialized into
// the page's RSC payload regardless. Strip the actual code text server-side
// when locked, so it's never present in what reaches the browser at all.
function redactLockedBody(body, isLocked) {
  if (!isLocked || !Array.isArray(body)) return body;

  return body.map((block) => {
    if (block?._type === "effectCodeBlock") {
      const { code, ...rest } = block;
      return rest;
    }

    if (block?._type === "block" && isCodeOnlyBlock(block)) {
      return {
        ...block,
        children: block.children.map((child) => ({ ...child, text: "" })),
      };
    }

    return block;
  });
}

function getFallbackContent(effect, effectSlug) {
  if (!effect) return null;

  const title = effect.title || effectSlug;
  const description = effect.description || "";

  return {
    title,
    summary: description,
    seo: {
      title,
      description,
      metaTitle: title,
      metaDescription: description,
      primaryKeyword: effectSlug,
      secondaryKeywords: [],
    },
    body: [],
    ctaBanner: null,
    coverImage: effect.coverImage || effectSlug,
    videoUrl: effect.videoUrl || `${effectSlug}.mp4`,
    tier: effect.tier || "pro",
    relatedEffectNames: [],
  };
}

function getEffectPageMetadata(effect, content, slug, effectSlug) {
  const title =
    content?.seo?.metaTitle ||
    content?.seo?.title ||
    `${effect?.title || effectSlug} | Hyperiux Vault`;
  const description =
    content?.seo?.metaDescription ||
    content?.seo?.description ||
    content?.summary ||
    effect?.description;
  const image =
    resolveOgImageUrl(content?.coverImage || effect?.coverImage || effectSlug, {
      defaultDirectory: "vault-listing-images",
      defaultExtension: "png",
    }) || "/seo/homepage.png";

  return createPageMetadata({
    title,
    description,
    path: `/effects/${slug}/${effectSlug}`,
    image,
    keywords: [
      content?.seo?.primaryKeyword,
      ...(content?.seo?.secondaryKeywords || []),
    ].filter(Boolean),
  });
}

function normalizeFaqText(value) {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeFaqText(item))
      .filter(Boolean)
      .join(" ");
  }

  if (typeof value === "object") {
    if (value.text) return value.text;
    if (value.children) return normalizeFaqText(value.children);
    if (value.content) return normalizeFaqText(value.content);
  }

  return "";
}

function getSanityFaqs(content) {
  return (content?.body || [])
    .filter((block) => block?._type === "effectFaqAccordion")
    .flatMap((block) => block.items || [])
    .map((item) => ({
      question: normalizeFaqText(item.question).trim(),
      answer: normalizeFaqText(item.answer).trim(),
    }))
    .filter((item) => item.question && item.answer);
}

// Registry file content (full component source) must never cross into a
// "use client" component's props - Next.js serializes the whole prop value
// into the page's initial HTML/RSC payload regardless of whether the client
// component actually renders it, so an unauthenticated visitor could read
// Pro effect source straight out of view-source even though the UI shows a
// lock screen. The rendered "Source Code" section is driven entirely by
// Sanity content blocks (which already gate on isLocked) - this raw
// registry content isn't used on this page at all, only by the
// separately-authenticated CLI download route.
function stripFileContent(effect) {
  if (!effect?.files?.length) return effect;

  return {
    ...effect,
    files: effect.files.map(({ content, ...rest }) => rest),
  };
}

function normalize(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

export async function generateStaticParams() {
  const entries = await getAllSanityEffectEntries();
  const params = new Map();

  for (const entry of entries) {
    params.set(`${entry.categorySlug}/${entry.effectSlug}`, {
      slug: entry.categorySlug,
      effectSlug: entry.effectSlug,
    });
  }

  for (const effect of getAllPrivateEffects()) {
    if (!effect.effectSlug || !effect.categorySlug) continue;

    params.set(`${effect.categorySlug}/${effect.effectSlug}`, {
      slug: effect.categorySlug,
      effectSlug: effect.effectSlug,
    });
  }

  return [...params.values()];
}

export async function generateMetadata({ params }) {
  const { slug, effectSlug } = await params;
  const effect = getEffectMetadata(effectSlug);
  const content =
    (await getSanityEffectContent(slug, effectSlug)) ||
    getFallbackContent(effect, effectSlug);

  if (!content && !effect) {
    return createPageMetadata({
      title: "Effect Not Found",
      description: "Effect not found.",
      path: `/effects/${slug}/${effectSlug}`,
      image: "/seo/homepage.png",
    });
  }

  return getEffectPageMetadata(effect, content, slug, effectSlug);
}

export default async function EffectPage({ params }) {
  const { slug, effectSlug } = await params;

  // Metadata only - no Pro source content read yet. Auth/plan is resolved
  // from this before we ever touch source file bytes, so an unauthorized
  // request never has Pro source attached to its response payload.
  const effectMeta = getEffectMetadata(effectSlug);
  const content =
    (await getSanityEffectContent(slug, effectSlug)) ||
    getFallbackContent(effectMeta, effectSlug);

  if (!content && !effectMeta) {
    notFound();
  }

  // getSanityEffectContent only matches when the URL's category segment is
  // (an alias of) the effect's real category - any other category string
  // still resolves here via getFallbackContent, which is built from the
  // registry alone and ignores the URL entirely. Without this check, every
  // effect silently renders under any category (real, stale, or made up),
  // which is both a duplicate-content SEO problem and how old/renamed
  // category links (e.g. spider-particles under the pre-rename
  // "cursor-effects") kept working indefinitely instead of consolidating to
  // the current canonical URL.
  const canonicalCategorySlugRaw =
    content?.categorySlug || effectMeta?.category || effectMeta?.categories?.[0] || null;

  if (canonicalCategorySlugRaw) {
    const canonicalSlug =
      getEffectCategoryBySlug(canonicalCategorySlugRaw)?.slug || canonicalCategorySlugRaw;
    const requestedSlug = getEffectCategoryBySlug(slug)?.slug || slug;

    if (requestedSlug !== canonicalSlug) {
      permanentRedirect(`/effects/${canonicalSlug}/${effectSlug}`);
    }
  }

  const { userId } = await auth();
  const effectTier = content.tier ?? effectMeta?.tier ?? "pro";

  // userPlan drives general "are you Pro" UI (upgrade CTAs etc.) independent
  // of this specific effect; access is the actual per-effect gating decision,
  // shared with the CLI and legacy web API routes - see docs/effect-access.md.
  const [userPlan, access] = await Promise.all([
    getUserPlan(userId),
    getEffectAccessDecision({ effectTier, clerkUserId: userId }),
  ]);
  const isLocked = !access.allowed;

  // Only attach Pro source content once the requester is confirmed authorized.
  const effect = isLocked ? effectMeta : getEffectSource(effectSlug);

  const sanityEntries = await getAllSanityEffectEntries();
  const allEffects = buildEffectsFromSanity(sanityEntries);
  const categoriesMap = getEffectsByCategoryFromSanity(sanityEntries);

  const globalSearchEffects = [...allEffects].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));

  const effectCounts = {};
  for (const [categoryId, catEffects] of Object.entries(categoriesMap)) {
    effectCounts[categoryId] = catEffects.length;
  }
  Object.assign(effectCounts, getEffectTierCounts());

  const relatedEffectNames = content?.relatedEffectNames || [];

  let relatedEffects = relatedEffectNames
    .map((relatedName) => {
      const normalizedRelatedName = normalize(relatedName);

      return allEffects.find((item) => {
        return (
          normalize(item.title) === normalizedRelatedName ||
          normalize(item.name) === normalizedRelatedName ||
          normalize(item.slug) === normalizedRelatedName
        );
      });
    })
    .filter(Boolean)
    .filter((item) => item.name !== effectSlug);

  if (relatedEffects.length === 0) {
    relatedEffects = allEffects
      .filter((item) => item.categorySlug === slug && item.name !== effectSlug)
      .slice(0, 5);
  }

  const installCounts = await getEffectInstallCounts([
    ...globalSearchEffects,
    ...relatedEffects,
  ]);
  const relatedEffectsWithInstallCounts = attachInstallCounts(
    relatedEffects,
    installCounts
  );
  const searchEffectsWithInstallCounts = attachInstallCounts(
    globalSearchEffects,
    installCounts
  );

  const pageMetadata = getEffectPageMetadata(effect, content, slug, effectSlug);
  const faqItems = getSanityFaqs(content);

  // Only the object actually sent to the client needs redaction - FAQ/SEO
  // extraction above already ran against the full `content`.
  const clientContent = { ...content, body: redactLockedBody(content.body, isLocked) };

  return (
    <>
      <WebpageJsonLd metadata={pageMetadata} />
      <BreadcrumbsJSONLD pathname={pageMetadata.url} />
      {faqItems.length > 0 && <FAQJSONLD faqs={faqItems} />}
      <EffectDetailContent
        slug={effectSlug}
        categorySlug={slug}
        effect={stripFileContent(effect)}
        content={clientContent}
        relatedEffects={relatedEffectsWithInstallCounts}
        effectCounts={effectCounts}
        totalEffects={sanityEntries.length}
        isLocked={isLocked}
        userPlan={userPlan}
        searchEffects={searchEffectsWithInstallCounts}
      />
    </>
  );
}
