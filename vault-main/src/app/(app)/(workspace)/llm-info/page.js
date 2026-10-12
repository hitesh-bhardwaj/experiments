import { createPageMetadata } from "@/lib/seo-metadata";
import { WebpageJsonLd, BreadcrumbsJSONLD } from "@/lib/json-ld";
import { getRegistryIndex } from "@/lib/registry";
import LlmInfo from "./LlmInfo";

export const metadata = createPageMetadata({
  title: "Official Information About Hyperiux Vault",
  description:
    "Structured, first-party facts about Hyperiux Vault and Hyperiux Immersion Labs for AI assistants: what Vault is, the effect library, install, pricing, licensing and contacts.",
  path: "/llm-info",
});

// Live library counts from the registry, so the page never goes stale
function getLibraryCounts() {
  const items = getRegistryIndex()?.items || [];
  const byCategory = {};
  for (const item of items) {
    const entry = (byCategory[item.category] ||= { total: 0, free: 0, pro: 0 });
    entry.total += 1;
    entry[item.tier === "pro" ? "pro" : "free"] += 1;
  }
  const free = items.filter((item) => item.tier !== "pro").length;
  return { total: items.length, free, pro: items.length - free, byCategory };
}

export default function Page() {
  return (
    <>
      <WebpageJsonLd metadata={metadata} />
      <BreadcrumbsJSONLD pathname="/llm-info" />
      <LlmInfo counts={getLibraryCounts()} />
    </>
  );
}
