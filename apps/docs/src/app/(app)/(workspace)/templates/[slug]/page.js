import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTemplateBySlug, getRelatedTemplates, TEMPLATES_OG_IMAGE } from "@/lib/mock-templates";
import { createPageMetadata } from "@/lib/seo-metadata";
import { getTemplateAccessDecision } from "@/lib/template-access";
import { getTemplateViewCounts } from "@/lib/template-views";
import { BreadcrumbsJSONLD, WebpageJsonLd } from "@/lib/json-ld";
import { TemplateDetail } from "./template-detail";

// Shared by generateMetadata and the page body below, same split as
// getEffectPageMetadata() on the effect detail page - the JSON-LD rendered
// in the page body needs the exact same metadata object (title/description/
// url) that generateMetadata already produced for the <head> tags, so it's
// built once instead of the two staying independently in sync by hand.
function getTemplatePageMetadata(template, slug) {
  return createPageMetadata({
    title: `${template.title} | Hyperiux Vault Templates`,
    description: template.tagline,
    path: `/templates/${slug}`,
    image: TEMPLATES_OG_IMAGE,
  });
}

export async function generateStaticParams() {
  const { TEMPLATES } = await import("@/lib/mock-templates");

  return TEMPLATES.map((template) => ({ slug: template.slug }));
}

// Already forced dynamic today by the auth() call below (a Clerk/Next
// dynamic API opts the whole route out of static rendering, generateStaticParams
// above notwithstanding) - stated explicitly so the related-template view
// counts stay live even if that call is ever removed or reworked, rather
// than silently regressing into the same build-time-frozen count bug fixed
// on /templates/page.js.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);

  if (!template) {
    return createPageMetadata({
      title: "Template Not Found | Hyperiux Vault",
      description: "This template could not be found.",
      path: `/templates/${slug}`,
      image: TEMPLATES_OG_IMAGE,
      robots: { index: false, follow: false },
    });
  }

  return getTemplatePageMetadata(template, slug);
}

export default async function TemplateDetailPage({ params }) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);

  if (!template) notFound();

  const { userId } = await auth();
  const templateAccess = await getTemplateAccessDecision({
    clerkUserId: userId,
    templateSlug: slug,
    includedInAnnualPro: template.pricing?.includedInAnnualPro ?? false,
  });

  const relatedTemplates = getRelatedTemplates(slug);
  const relatedViewCounts = await getTemplateViewCounts(
    relatedTemplates.map((related) => related.slug)
  );

  const pageMetadata = getTemplatePageMetadata(template, slug);

  return (
    <>
      <WebpageJsonLd metadata={pageMetadata} />
      <BreadcrumbsJSONLD pathname={pageMetadata.url} />

      {/* TemplateDetail reads useSearchParams() (to resume a purchase after a
          signed-out "Buy" click bounces through /sign-in and back) - Next
          requires a Suspense boundary around any client component that does. */}
      <Suspense fallback={null}>
        <TemplateDetail
          template={template}
          relatedTemplates={relatedTemplates.map((related) => ({
            ...related,
            viewCount: relatedViewCounts[related.slug] || 0,
          }))}
          templateAccess={templateAccess}
        />
      </Suspense>
    </>
  );
}
