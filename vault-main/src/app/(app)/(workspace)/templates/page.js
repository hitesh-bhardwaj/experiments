import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { getTemplatesWithShots } from "@/lib/template-shots";
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

export default async function TemplatesPage() {
  const templates = await getTemplatesWithShots();

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      <FAQJSONLD faqs={templatesFaqItems} />
      <TemplatesListing templates={templates} description={TEMPLATES_DESCRIPTION} faqItems={templatesFaqItems} />
    </>
  );
}
