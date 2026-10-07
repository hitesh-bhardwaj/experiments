import { Breadcrumb } from "@/components/ui/Breadcrumb";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";
import { TemplatesGrid } from "./TemplatesGrid";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { TEMPLATES_DESCRIPTION, templatesFaqItems } from "./content";


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

const DESCRIPTION = TEMPLATES_DESCRIPTION;
const faqItems = templatesFaqItems;

export default async function TemplatesPage() {
  const viewCounts = await getTemplateViewCounts(TEMPLATES.map((template) => template.slug));
  const templates = TEMPLATES.map((template) => ({
    ...template,
    viewCount: viewCounts[template.slug] || 0,
  }));

  return (
    <div className="relative min-h-screen text-foreground effects-comp border-b border-white/10">
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname={metadata.url} />
      <FAQJSONLD faqs={faqItems} />

      <div className="px-14 pt-28 pb-12 space-y-8 max-md:px-7 max-md:pt-32 max-md:pb-16">
        <Breadcrumb className="fadeup" />

        <HeadAnim animateOnScroll={false} delay={0.3}>
          <h1
            className="mb-4 w-[85%] leading-normal t96 font-aeonik font-normal text-foreground max-md:w-[90%] max-md:text-4xl"
            style={{ lineHeight: "1.3" }}
          >
            Interaction-First Templates

          </h1>
        </HeadAnim>

        <div className="category-fadeup flex max-w-[55vw] flex-col text-lg text-muted max-lg:max-w-full max-md:text-base">
          <Copy delay={0.6}>
            <p className="mt-3">{DESCRIPTION}</p>
          </Copy>
        </div>
      </div>

      <TemplatesGrid templates={templates} />

      <FAQV3 faqItems={faqItems} translateTop={false} />
    </div>
  );
}
