import { Breadcrumb } from "@/components/ui/Breadcrumb";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { createPageMetadata } from "@/lib/seo-metadata";
import { TEMPLATES, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { getTemplateViewCounts } from "@/lib/template-views";
import { TemplatesGrid } from "./TemplatesGrid";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import { BreadcrumbsJSONLD, FAQJSONLD, WebpageJsonLd } from "@/lib/json-ld";


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

const DESCRIPTION =
  "Start with the interaction layer already composed across layout, motion and behaviour, with React or Next.js source and Figma files ready to adapt to your project.";

const faqItems = [
  {
    id: "templates-faq-1",
    question: "What are Vault Templates?",
    answer: (
      <>
        Vault Templates are React and Next.js website starting points where layout, typography, motion, scrolling, transitions and responsive behaviour work together from the beginning.
      </>
    ),
    defaultOpen: true,
  },
  {
    id: "templates-faq-2",
    question: "How are Vault Templates different from Vault Effects?",
    answer: (
      <>
       Vault Effects solve individual interaction needs such as cursors, transitions, loaders, text animation or scroll behaviour. Templates apply the same thinking across an entire website, so interaction is part of the starting composition rather than something added later.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-3",
    question: "Can I customise a Vault Template?",
    answer: (
      <>
        Yes. Vault Templates are starting points, not fixed visual identities. You receive the source code and Figma file, so you can adapt the layout, styling, content, motion and interaction behaviour around your project.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-4",
    question: "What do I get with a Vault Template?",
    answer: (
      <>
        Each Template includes its source code and Figma file. Template-specific dependencies and technical details are listed on its detail page.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-5",
    question: "Are Vault Templates built for React and Next.js?",
    answer: (
      <>
        Yes. Vault Templates are built for React and Next.js. Dependencies vary by Template, so check its detail page for the animation, scrolling and rendering libraries used by that build.

      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-6",
    question: "Are Vault Templates included with Vault Pro?",
    answer: (
      <>
        Yes. Vault Templates are included with Vault Pro Yearly, so subscribers can access them without purchasing each Template separately.

      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-7",
    question: "Can I purchase a Template separately?",
    answer: (
      <>
Yes. Each Template can also be purchased individually without Vault Pro Yearly. Pricing is shown on its detail page.
      </>
    ),
    defaultOpen: false,
  },
  {
    id: "templates-faq-8",
    question: "What licence do Vault Templates use?",
    answer: (
      <>
Vault Templates are licensed under the Mozilla Public License 2.0 (MPL-2.0), the licence used for Vault&apos;s paid and Pro items. Free items use MIT.
      </>
    ),
    defaultOpen: false,
  },
];

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

        <div className="category-fadeup flex max-w-[55vw] flex-col text-lg text-muted max-[1025px]:max-w-full max-md:text-base">
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
