import fs from "node:fs/promises";
import path from "node:path";
import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { TEMPLATES_DESCRIPTION, templatesFaqItems } from "./content";
import { TemplatesListing } from "./TemplatesListing";

// No dynamic API (auth/cookies/headers) is called on this page, so Next
// would otherwise statically prerender it once at build/deploy time - the
// view counts baked into that HTML would then be frozen forever, never
// reflecting real views recorded afterward via recordTemplateView(). Forces
// a fresh getTemplateViewCounts() read on every request instead.
export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Interactive React & Next.js Website Templates | Hyperiux Vault",
  description: "Interactive React and Next.js website templates with layout, motion, scrolling and transitions composed together. Source code and Figma included.",
  path: "/templates",
  image: TEMPLATES_OG_IMAGE,
});

// The full-page desktop design built from the template's Figma exports
// (scripts/build-exploded-manifest.mjs), for the card and corridor hover.
async function readFullShot(slug) {
  try {
    const file = path.join(process.cwd(), "public/assets/templates/templates-exploded", slug, "manifest.json");
    return JSON.parse(await fs.readFile(file, "utf8")).full || null;
  } catch {
    return null;
  }
}

export default async function TemplatesPage() {
  const viewCounts = await getTemplateViewCounts(TEMPLATES.map((template) => template.slug));
  const fullShots = await Promise.all(TEMPLATES.map((template) => readFullShot(template.slug)));
  const templates = TEMPLATES.map((template, i) => ({
    ...template,
    fullShot: fullShots[i],
    viewCount: viewCounts[template.slug] || 0,
  }));

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      <FAQJSONLD faqs={templatesFaqItems} />
      <TemplatesListing templates={templates} description={TEMPLATES_DESCRIPTION} faqItems={templatesFaqItems} />
    </>
  );
}
