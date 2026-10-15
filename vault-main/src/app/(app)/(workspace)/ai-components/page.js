import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import { getAiCatalogue } from "@/lib/ai-catalogue";
import AiComponents from "./AiComponents";

// Rebuilt hourly from the registry and Sanity
export const revalidate = 3600;

export const metadata = createPageMetadata({
  title: "AI Component Catalogue: React & Next.js Interaction Effects",
  description:
    "A complete, machine-readable catalogue of Hyperiux Vault for people and AI assistants: every React and Next.js interaction effect with use cases, dependencies, accessibility notes, usage code, props and live demos.",
  path: "/ai-components",
});

export default async function Page() {
  const catalogue = await getAiCatalogue();

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hyperiux Vault interaction effects",
    url: catalogue.url,
    numberOfItems: catalogue.effects.length,
    itemListElement: catalogue.effects.map((effect, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareSourceCode",
        name: effect.title,
        identifier: effect.slug,
        description: effect.description || effect.summary || undefined,
        url: effect.docsUrl,
        programmingLanguage: ["JavaScript", "TypeScript"],
        runtimePlatform: "React, Next.js",
      },
    })),
  };

  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/ai-components" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList).replace(/</g, "\\u003c") }}
      />
      <AiComponents catalogue={catalogue} />
    </>
  );
}
