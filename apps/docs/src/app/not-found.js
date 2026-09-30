import dynamic from "next/dynamic";
import { getSearchIndexEffects } from "@/lib/search-index";

// Split out so its CSS and the Manrope 800 face for the digits load only when
// a 404 actually renders - as a root boundary, a static import would have
// them preloaded on every page. Still server-rendered.
const SiteNotFound = dynamic(() =>
  import("@/homepage-v3/components/SiteNotFound"),
);

// Every real destination "did you mean" can suggest: the public routes plus
// every effect page. Account-only areas (dashboard, admin, CLI auth) and the
// experimental /extras pages are left out on purpose.
const MAIN_PAGES = [
  { label: "Home", href: "/" },
  { label: "Effects", href: "/effects" },
  { label: "Templates", href: "/templates" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Tech", href: "/tech" },
  { label: "Docs", href: "/docs" },
  { label: "Installation", href: "/docs/installation" },
  { label: "CLI", href: "/docs/cli" },
  { label: "Dependencies", href: "/docs/dependencies" },
  { label: "License", href: "/docs/license" },
  { label: "MCP", href: "/docs/mcp" },
  { label: "Legal", href: "/legal" },
  { label: "License Agreement", href: "/legal/license-agreement" },
  { label: "Privacy Policy", href: "/legal/privacy-policy" },
  { label: "Refund Policy", href: "/legal/refund-policy" },
  { label: "Terms of Service", href: "/legal/terms-of-service" },
  { label: "Sign in", href: "/sign-in" },
  { label: "Sign up", href: "/sign-up" },
];

async function getEffectPages() {
  try {
    const effects = await getSearchIndexEffects();
    return effects.map((effect) => ({
      label: effect.title || effect.name,
      href: effect.href,
    }));
  } catch {
    // The effect index lives in Sanity; if it can't be reached, the 404
    // still works and suggests from the main routes.
    return [];
  }
}

export default async function NotFound() {
  const pages = [...MAIN_PAGES, ...(await getEffectPages())];
  return <SiteNotFound pages={pages} />;
}
