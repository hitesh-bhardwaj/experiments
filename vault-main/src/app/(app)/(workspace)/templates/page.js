import fs from "node:fs/promises";
import path from "node:path";
import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { TEMPLATES_DESCRIPTION, templatesFaqItems } from "./content";
import { TemplatesListing } from "./TemplatesListing";

// Static: the catalogue is a local file. View counts load in the browser
// (/api/templates/views), so the page itself never needs rebuilding.

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
  const fullShots = await Promise.all(TEMPLATES.map((template) => readFullShot(template.slug)));
  const templates = TEMPLATES.map((template, i) => ({ ...template, fullShot: fullShots[i] }));

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      <FAQJSONLD faqs={templatesFaqItems} />
      <TemplatesListing templates={templates} description={TEMPLATES_DESCRIPTION} faqItems={templatesFaqItems} />
    </>
  );
}
