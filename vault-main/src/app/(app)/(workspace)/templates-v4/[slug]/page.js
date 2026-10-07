import { Suspense } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TEMPLATES, TEMPLATES_OG_IMAGE, getTemplateBySlug } from "@/lib/mock-templates";
import { createPageMetadata } from "@/lib/seo-metadata";
import { getTemplateAccessDecision } from "@/lib/template-access";
import { getTemplateViewCounts } from "@/lib/template-views";
import { getRegistryIndex } from "@/lib/registry";
import { getEffectHref } from "@/lib/categories";
import { catalogueOf, sampleHref } from "../tokens";
import { TEMPLATE_SECTIONS, resolveSections } from "./template-sections";
import { TemplateDetailV4 } from "./TemplateDetailV4";

// Sample detail page: the v4 design's template view (public/v4/Templates —
// Hyperiux Vault (1).html, #/t/<slug>) merged with the live /templates/[slug]
// page. Kept out of search until it replaces it.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  return createPageMetadata({
    title: template ? `${template.title} (v4 sample) | Hyperiux Vault Templates` : "Template Not Found | Hyperiux Vault",
    description: template?.tagline || "This template could not be found.",
    path: `/templates-v4/${slug}`,
    canonicalPath: `/templates/${slug}`,
    image: TEMPLATES_OG_IMAGE,
    robots: { index: false, follow: false },
  });
}

async function readCapture(slug) {
  try {
    const file = path.join(process.cwd(), "public/assets/templates-exploded", slug, "manifest.json");
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

const titleCase = (name) => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default async function TemplateDetailV4Page({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const { userId } = await auth();
  const templateAccess = await getTemplateAccessDecision({
    clerkUserId: userId,
    templateSlug: slug,
    includedInAnnualPro: template.pricing?.includedInAnnualPro ?? false,
  });

  // Vault effects used by this template, linked when they're in the registry.
  const registry = getRegistryIndex()?.items || [];
  const effectsByName = {};
  for (const name of TEMPLATE_SECTIONS[slug]?.effects || []) {
    const item = registry.find((e) => e.name === name);
    effectsByName[name] = item
      ? { name, title: item.title, href: getEffectHref(item), tier: item.tier }
      : { name, title: titleCase(name), href: null };
  }

  // Exploded view layers per device, named from the template's README.
  // Two manifest shapes: Figma exports (one image per section, stacked here)
  // or a stitched capture of the live page (sections are slices of one image).
  const capture = await readCapture(slug);
  const devices = {};
  for (const [device, data] of Object.entries(capture?.devices || {})) {
    if (data.sections?.[0]?.src) {
      let y = 0;
      const layers = data.sections.map((s) => {
        const layer = { src: s.src, w: s.width, h: s.height, y, label: s.name, name: s.name };
        y += s.height;
        return layer;
      });
      devices[device] = {
        source: "figma",
        width: Math.max(...layers.map((l) => l.w)),
        height: y,
        sections: resolveSections(slug, layers, effectsByName),
      };
    } else {
      devices[device] = {
        source: "capture",
        src: data.src,
        viewport: data.viewport,
        width: data.width,
        height: data.height,
        sections: resolveSections(slug, data.sections, effectsByName),
      };
    }
  }

  // More templates: same credit catalogue first.
  const related = TEMPLATES.filter((t) => t.slug !== slug)
    .sort((a, b) => (catalogueOf(b) === catalogueOf(template)) - (catalogueOf(a) === catalogueOf(template)))
    .slice(0, 2);
  const viewCounts = await getTemplateViewCounts(related.map((t) => t.slug));

  return (
    // TemplateDetailV4 reads useSearchParams() to resume a purchase after sign-in.
    <Suspense fallback={null}>
      <TemplateDetailV4
        template={{ ...template, href: sampleHref(slug) }}
        templateAccess={templateAccess}
        devices={devices}
        effects={Object.values(effectsByName)}
        stack={TEMPLATE_SECTIONS[slug]?.stack || template.tags || []}
        related={await Promise.all(
          related.map(async (t) => ({
            ...t,
            href: sampleHref(t.slug),
            viewCount: viewCounts[t.slug] || 0,
            fullShot: (await readCapture(t.slug))?.full || null,
          })),
        )}
      />
    </Suspense>
  );
}
