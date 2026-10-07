import fs from "node:fs/promises";
import path from "node:path";
import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";
import { TEMPLATES_DESCRIPTION, templatesFaqItems } from "../templates/content";
import { TemplatesListingV4 } from "./TemplatesListingV4";
import { sampleHref } from "./tokens";

// Sample page: the v4 Templates design (public/v4/Templates — Hyperiux Vault
// (1).html) merged with the live /templates page. Kept out of search until it
// replaces /templates.
export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Templates (v4 sample) | Hyperiux Vault",
  description: "Interactive React and Next.js website templates with layout, motion, scrolling and transitions composed together. Source code and Figma included.",
  path: "/templates-v4",
  canonicalPath: "/templates",
  image: TEMPLATES_OG_IMAGE,
  robots: { index: false, follow: false },
});

// The full-page desktop design built from the template's Figma exports
// (scripts/build-exploded-manifest.mjs), for the card and corridor hover.
async function readFullShot(slug) {
  try {
    const file = path.join(process.cwd(), "public/assets/templates-exploded", slug, "manifest.json");
    return JSON.parse(await fs.readFile(file, "utf8")).full || null;
  } catch {
    return null;
  }
}

export default async function TemplatesV4Page() {
  const viewCounts = await getTemplateViewCounts(TEMPLATES.map((template) => template.slug));
  const fullShots = await Promise.all(TEMPLATES.map((template) => readFullShot(template.slug)));
  const templates = TEMPLATES.map((template, i) => ({
    ...template,
    fullShot: fullShots[i],
    href: sampleHref(template.slug), // cards and the corridor open the sample detail page
    viewCount: viewCounts[template.slug] || 0,
  }));

  return (
    <TemplatesListingV4
      templates={templates}
      description={TEMPLATES_DESCRIPTION}
      faqItems={templatesFaqItems}
    />
  );
}
