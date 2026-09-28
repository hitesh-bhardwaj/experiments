import { getAllSanityEffectEntries } from "@/lib/sanity";
import { createPageMetadata } from "@/lib/seo-metadata";
import { resolveOgImageUrl } from "@/lib/media";
import { getPublicEffectBySlug } from "@/lib/registry";

function titleizeSlug(value = "") {
  return value
    .toString()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\b3d\b/i, "3D")
    .replace(/\bsvg\b/gi, "SVG")
    .replace(/\bwebgl\b/gi, "WebGL");
}

export async function getDemoPageMetadata(effectSlug, options = {}) {
  const entries = await getAllSanityEffectEntries();
  const entry = entries.find((e) => e.effectSlug === effectSlug);
  const registryEntry = getPublicEffectBySlug(effectSlug);
  const displayTitle =
    options.title ||
    entry?.title ||
    registryEntry?.title ||
    titleizeSlug(effectSlug);
  const detailPath = entry?.categorySlug
    ? `/effects/${entry.categorySlug}/${effectSlug}`
    : `/demo/${effectSlug}`;
  const image = resolveOgImageUrl(entry?.coverImage || effectSlug, {
    defaultDirectory: "vault-listing-images",
    defaultExtension: "png",
  }) || "/seo/homepage.png";

  if (!entry?.categorySlug) {
    return createPageMetadata({
      title: `${displayTitle} Demo | Hyperiux Vault`,
      description: `Interactive demo for ${displayTitle} from the Hyperiux Vault component library.`,
      path: `/demo/${effectSlug}`,
      canonicalPath: detailPath,
      openGraphPath: `/demo/${effectSlug}`,
      languagesPath: `/demo/${effectSlug}`,
      image,
    });
  }

  return createPageMetadata({
    title: `${displayTitle} Demo | Hyperiux Vault`,
    description: `Interactive demo for ${displayTitle}. View full documentation, code, and installation on the Hyperiux Vault effect page.`,
    path: `/demo/${effectSlug}`,
    canonicalPath: detailPath,
    openGraphPath: `/demo/${effectSlug}`,
    languagesPath: `/demo/${effectSlug}`,
    image,
  });
}
