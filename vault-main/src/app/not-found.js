import dynamic from "next/dynamic";
import { getSearchIndexEffects } from "@/lib/search-index";

// Split out so its CSS and the Manrope 800 face for the digits load only when
// a 404 actually renders - as a root boundary, a static import would have
// them preloaded on every page. Still server-rendered.
const SiteNotFound = dynamic(() =>
  import("@/homepage/components/SiteNotFound"),
);

// Only effect pages are suggested on the 404.
async function getEffectPages() {
  try {
    const effects = await getSearchIndexEffects();
    return effects.map((effect) => ({
      label: effect.title || effect.name,
      href: effect.href,
      kind: "effect",
      keywords: [
        effect.category,
        ...(effect.categories || []),
        effect.description,
        ...(effect.dependencies || []),
      ]
        .filter((v) => typeof v === "string")
        .join(" "),
    }));
  } catch {
    // The effect index lives in Sanity; if it can't be reached, the 404
    // still works and suggests from the main routes.
    return [];
  }
}

export default async function NotFound() {
  const pages = await getEffectPages();
  return <SiteNotFound pages={pages} />;
}
