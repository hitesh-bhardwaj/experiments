import "server-only";
import { cache } from "react";
import { getPublicEffectBySlug, getRegistryIndex } from "@/lib/registry";
import { getAllSanityEffectGuides, getSanityBlogEntries } from "@/lib/sanity";
import { effectCategories, getEffectCategoryBySlug } from "@/lib/categories";
import { getEffectRouteSlug } from "@/lib/effect-slugs";
import { TEMPLATES } from "@/lib/mock-templates";

// One catalogue of every Vault effect for people, crawlers and AI tools:
// /ai-components (the page), /ai-components.json, /llms.txt and /llms-full.txt.
//
// Sources, in order of trust:
//   registry (public/r)  - the effect list, Free/Pro, dependencies, documented props
//   Sanity effectContent - title, summary, SEO description, tags, FAQ and the
//                          written guide sections (Best Used For, Not For, ...)
// Nothing is guessed: a field with no source is left empty.
//
// Pro source never leaves this module. Only the "Usage Code" snippet is kept;
// the guide's "Component Code" block is dropped (see readGuide).

export const SITE = "https://vault.hyperiux.com";

export const INSTALL = {
  init: "npx hyperiux init",
  add: "npx hyperiux add <effect-name>",
  login: "npx hyperiux login",
  npm: "https://www.npmjs.com/package/hyperiux",
};

export const MCP = {
  command: "npx -y hyperiux-mcp-server",
  claudeCode: "claude mcp add hyperiux -- npx -y hyperiux-mcp-server",
  config: { mcpServers: { hyperiux: { command: "npx", args: ["-y", "hyperiux-mcp-server"] } } },
};

export const REQUIREMENTS = [
  ["Framework", "React 18+ or Next.js 14+"],
  ["Styling", "Tailwind CSS v3 or v4"],
  ["Runtime", "Node.js 18.17+ (20+ recommended)"],
  ["Language", "JavaScript or TypeScript (every effect ships .jsx and .tsx)"],
];

// The guide's h2 headings and the field each one fills
const SECTIONS = {
  "Overview": "overview",
  "Example Production Use Case": "exampleUseCase",
  "Best Used For": "bestFor",
  "Not For": "notFor",
  "Performance Budget": "performance",
  "Accessibility and Mobile": "accessibility",
  "Accessibility & Mobile": "accessibility",
  "Common Mistakes": "commonMistakes",
};

const BULLET = /^\s*[•\-*]\s+/;

// Sanity body (text blocks and code blocks under h2 headings) -> named sections
export function readGuide(body = []) {
  const guide = { usage: null };
  let heading = null;

  for (const block of body || []) {
    if (block?._type === "block" && block.style === "h2") {
      heading = String(block.text || "").trim();
      continue;
    }

    if (block?._type === "effectCodeBlock") {
      // Usage snippet only. "Component Code" (the full source) is never kept.
      if (heading === "Usage Code" && block.code && !guide.usage) guide.usage = block.code.trim();
      continue;
    }

    const field = SECTIONS[heading];
    const text = String(block?.text || "").trim();
    if (!field || !text) continue;
    (guide[field] ||= []).push(text.replace(BULLET, ""));
  }

  return guide;
}

const routeSlug = (value) => getEffectRouteSlug(value) || value;

function categoryFor(...slugs) {
  for (const slug of slugs) {
    const category = slug && getEffectCategoryBySlug(slug);
    if (category && category.id !== "featured") return category;
  }
  return null;
}

function propsOf(registryEffect) {
  return (registryEffect?.props || []).map((prop) => ({
    name: prop.name,
    type: prop.type || null,
    default: prop.default === undefined ? null : prop.default,
    description: prop.description || null,
  }));
}

/**
 * Pure builder (tested in ai-catalogue.test.js). getAiCatalogue() below feeds
 * it the live registry and Sanity data.
 */
export function buildAiCatalogue({ registryItems = [], guides = [], getRegistryEffect = () => null, templates = [], blogPosts = [] }) {
  const guideBySlug = new Map(guides.map((guide) => [routeSlug(guide.effectSlug), guide]));

  const effects = registryItems.map((item) => {
    const slug = item.name;
    const guide = guideBySlug.get(routeSlug(slug)) || {};
    const registryEffect = getRegistryEffect(slug) || {};
    const sections = readGuide(guide.body);
    const category = categoryFor(guide.categorySlug, item.category, item.categories?.[0]);
    const categorySlug = category?.slug || guide.categorySlug || item.category || "effects";
    // The registry decides Free vs Pro everywhere access is checked
    const tier = (item.tier || registryEffect.tier || guide.tier) === "pro" ? "pro" : "free";

    return {
      slug,
      title: guide.title || registryEffect.title || slug,
      category: { id: category?.id || categorySlug, slug: categorySlug, name: category?.name || categorySlug },
      tier,
      summary: guide.summary || registryEffect.description || null,
      description: guide.seoDescription?.trim() || null,
      tags: guide.tags || [],
      dependencies: item.dependencies || registryEffect.dependencies || [],
      install: `npx hyperiux add ${slug}`,
      usage: sections.usage,
      props: propsOf(registryEffect),
      overview: sections.overview || [],
      exampleUseCase: sections.exampleUseCase || [],
      bestFor: sections.bestFor || [],
      notFor: sections.notFor || [],
      performance: sections.performance || [],
      accessibility: sections.accessibility || [],
      commonMistakes: sections.commonMistakes || [],
      faq: (guide.faq || []).filter((qa) => qa?.question && qa?.answer).map((qa) => ({ question: qa.question.trim(), answer: qa.answer.trim() })),
      relatedTitles: guide.relatedEffectNames || [],
      access: tier === "free"
        ? "Free Core: full source with a free account."
        : "Pro: full source on a Pro or Pro+ plan (run npx hyperiux login first).",
      docsUrl: `${SITE}/effects/${categorySlug}/${slug}`,
      demoUrl: `${SITE}/demo/${slug}`,
    };
  });

  // Related effects arrive as titles; link the ones that are in the catalogue
  const byTitle = new Map(effects.map((effect) => [effect.title.toLowerCase(), effect]));
  for (const effect of effects) {
    effect.related = effect.relatedTitles
      .map((title) => byTitle.get(String(title).toLowerCase()))
      .filter((related) => related && related.slug !== effect.slug)
      .map((related) => ({ slug: related.slug, title: related.title, docsUrl: related.docsUrl }));
    delete effect.relatedTitles;
  }

  // Categories in the site's own order, with live counts
  const categories = effectCategories
    .filter((category) => category.id !== "featured")
    .map((category) => {
      const items = effects.filter((effect) => effect.category.id === category.id);
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        count: items.length,
        free: items.filter((effect) => effect.tier === "free").length,
        url: `${SITE}/effects/${category.slug}`,
      };
    })
    .filter((category) => category.count > 0);

  const order = new Map(categories.map((category, index) => [category.id, index]));
  effects.sort((a, b) => (order.get(a.category.id) ?? 99) - (order.get(b.category.id) ?? 99) || a.title.localeCompare(b.title));

  const free = effects.filter((effect) => effect.tier === "free").length;

  return {
    name: "Hyperiux Vault",
    url: `${SITE}/ai-components`,
    site: SITE,
    description:
      "Hyperiux Vault is a library of production-ready interaction effects for React and Next.js: scroll systems, text animations, cursor effects, page transitions, WebGL scenes, carousels, buttons, navigation, backgrounds and loaders. Every effect installs as editable source code with the hyperiux CLI.",
    company: "Hyperiux Immersion Labs Private Limited",
    totals: { effects: effects.length, free, pro: effects.length - free, categories: categories.length, templates: templates.length },
    requirements: REQUIREMENTS.map(([name, value]) => ({ name, value })),
    install: INSTALL,
    mcp: MCP,
    categories,
    effects,
    templates: templates.map((template) => ({
      slug: template.slug,
      title: template.title,
      category: template.category || null,
      url: `${SITE}/templates/${template.slug}`,
      demoUrl: `${SITE}/template-demo/${template.slug}`,
    })),
    blogPosts: blogPosts
      .filter((post) => post?.slug && post?.title)
      .map((post) => ({ title: post.title, url: `${SITE}/blog/${post.slug}` })),
  };
}

// Built once per request (React cache); the routes and the page revalidate hourly.
export const getAiCatalogue = cache(async () => {
  const [guides, blog] = await Promise.all([
    getAllSanityEffectGuides(),
    getSanityBlogEntries({ pageSize: 100 }),
  ]);

  return buildAiCatalogue({
    registryItems: getRegistryIndex()?.items || [],
    guides,
    getRegistryEffect: getPublicEffectBySlug,
    templates: TEMPLATES,
    blogPosts: blog?.posts || [],
  });
});

// ---------------------------------------------------------------------------
// llms.txt (https://llmstxt.org): a short, linked index. /llms-full.txt has
// every effect's full record.
// ---------------------------------------------------------------------------

const MAIN_PAGES = [
  ["Home", "/", "Hyperiux Vault - React & Next.js interaction effects"],
  ["Official information about Hyperiux Vault", "/llm-info", "Structured facts for AI assistants - company, product, install, pricing, licensing"],
  ["AI component catalogue", "/ai-components", "Every effect with use cases, dependencies, accessibility notes, usage code and props"],
  ["All effects", "/effects", "Browse and search the full library"],
  ["Pricing", "/pricing", "Free plan, plus Pro and Pro+ billed quarterly or yearly"],
  ["Templates", "/templates", "Complete interactive website templates, unlocked with template credits on Pro and Pro+"],
  ["Docs", "/docs", "Overview of how the Vault and CLI work"],
  ["Blog", "/blog", "Notes on building React and Next.js interaction effects"],
  ["Community", "/community", "Waitlist for the Vault community - live teardowns, early access, critique"],
];

const DOCS = [
  ["Documentation home", "/docs", "Overview of how the Vault and CLI work"],
  ["Installation", "/docs/installation", "Install Hyperiux Vault effects in your project"],
  ["CLI reference", "/docs/cli", "CLI commands, Pro authentication, and tokens"],
  ["MCP server", "/docs/mcp", "Hyperiux MCP server for AI coding assistants (Claude Code, Cursor, Codex CLI)"],
  ["Dependencies", "/docs/dependencies", "Peer dependencies effects rely on (GSAP, Motion, Three.js)"],
  ["License", "/docs/license", "Free Core and Pro usage terms"],
];

const LEGAL = [
  ["License Agreement", "/legal/license-agreement"],
  ["Privacy Policy", "/legal/privacy-policy"],
  ["Refund Policy", "/legal/refund-policy"],
  ["Terms of Service", "/legal/terms-of-service"],
];

const tierLabel = (tier) => (tier === "pro" ? "Pro" : "Free");
const oneLine = (text) => String(text || "").replace(/\s+/g, " ").trim();

function header(c) {
  return [
    `# ${c.name}`,
    "",
    `> ${c.description}`,
    "",
    `${c.name} is built by ${c.company} (Noida, India). Free effects can be installed by anyone with a free account; the full library needs a Pro or Pro+ plan. Every effect ships as real source code (React components using GSAP, Motion, Three.js, or CSS) that developers own and customize - not a locked-in package import.`,
    "",
    "Key facts:",
    `- Website: ${c.site}`,
    `- Official information for AI assistants: ${c.site}/llm-info`,
    `- Component catalogue: ${c.url} (JSON: ${c.site}/ai-components.json)`,
    `- Install CLI: \`${c.install.init}\`, then \`${c.install.add}\` (Pro effects: \`${c.install.login}\` first)`,
    `- MCP server for AI coding tools: \`${c.mcp.command}\` (Claude Code: \`${c.mcp.claudeCode}\`)`,
    `- npm package: ${c.install.npm}`,
    `- Requirements: ${c.requirements.map((r) => r.value).join("; ")}`,
    "",
    `Library size: ${c.totals.effects} effects (${c.totals.free} free, ${c.totals.pro} Pro) in ${c.totals.categories} categories, and ${c.totals.templates} templates.`,
    "",
  ];
}

function linkList(title, rows) {
  return [`## ${title}`, "", ...rows.map(([name, path, note]) => `- [${name}](${SITE}${path})${note ? `: ${note}` : ""}`), ""];
}

function tail(c) {
  return [
    "## Templates",
    "",
    `- [All templates](${SITE}/templates): Interactive React & Next.js website templates, each with source code and a Figma file`,
    ...c.templates.map((t) => `- [${t.title}](${t.url})${t.category ? `: ${t.category} template` : ""} · [live demo](${t.demoUrl})`),
    "",
    ...(c.blogPosts.length ? ["## Blog posts", "", ...c.blogPosts.map((post) => `- [${post.title}](${post.url})`), ""] : []),
    ...linkList("Legal", LEGAL),
    "## Optional",
    "",
    `- [Full catalogue as text](${SITE}/llms-full.txt): Every effect with use cases, constraints, accessibility notes, usage code and props`,
    `- [Sitemap](${SITE}/sitemap.xml): Full URL index including every individual effect page`,
    `- [Sign up](${SITE}/sign-up): Create a free account to copy and install free effects`,
    "",
  ];
}

export function toLlmsTxt(c) {
  const lines = [...header(c), ...linkList("Main pages", MAIN_PAGES), ...linkList("Docs", DOCS)];

  lines.push("## Effect categories", "");
  for (const category of c.categories) lines.push(`- [${category.name}](${category.url}): ${category.count} effects (${category.free} free)`);
  lines.push(`- [Free effects](${SITE}/effects/free): Effects available on the free plan (free account required)`);
  lines.push(`- [Pro effects](${SITE}/effects/pro): Effects unlocked with a Pro or Pro+ plan`, "");

  for (const category of c.categories) {
    lines.push(`## Effects: ${category.name}`, "");
    for (const effect of c.effects.filter((e) => e.category.id === category.id)) {
      lines.push(`- [${effect.title}](${effect.docsUrl}): ${tierLabel(effect.tier)}${effect.summary ? `. ${oneLine(effect.summary)}` : ""} · [live demo](${effect.demoUrl})`);
    }
    lines.push("");
  }

  return [...lines, ...tail(c)].join("\n");
}

const bullets = (label, items) => (items.length ? [`${label}:`, ...items.map((item) => `- ${oneLine(item)}`), ""] : []);
const paragraph = (label, items) => (items.length ? [`${label}: ${items.map(oneLine).join(" ")}`, ""] : []);

export function toLlmsFullTxt(c) {
  const lines = [...header(c)];

  for (const category of c.categories) {
    lines.push(`## ${category.name} (${category.count})`, "");
    for (const e of c.effects.filter((effect) => effect.category.id === category.id)) {
      lines.push(`### ${e.title}`, "");
      lines.push(`- Slug: \`${e.slug}\` · Tier: ${tierLabel(e.tier)} · Category: ${category.name}`);
      lines.push(`- Install: \`${e.install}\``);
      lines.push(`- Docs: ${e.docsUrl} · Live demo: ${e.demoUrl}`);
      lines.push(`- Dependencies: ${e.dependencies.length ? e.dependencies.join(", ") : "none beyond React"}`);
      if (e.tags.length) lines.push(`- Tags: ${e.tags.join(", ")}`);
      lines.push(`- Access: ${e.access}`, "");
      if (e.summary) lines.push(oneLine(e.summary), "");
      lines.push(...bullets("Best used for", e.bestFor));
      lines.push(...paragraph("Not for", e.notFor));
      lines.push(...paragraph("Accessibility and mobile", e.accessibility));
      lines.push(...paragraph("Performance budget", e.performance));
      lines.push(...bullets("Common mistakes", e.commonMistakes));
      if (e.props.length) {
        lines.push("Props:");
        for (const prop of e.props) {
          const meta = [prop.type, prop.default !== null ? `default ${JSON.stringify(prop.default)}` : null].filter(Boolean).join(", ");
          lines.push(`- \`${prop.name}\`${meta ? ` (${meta})` : ""}${prop.description ? `: ${oneLine(prop.description)}` : ""}`);
        }
        lines.push("");
      }
      if (e.usage) lines.push("Usage:", "```jsx", e.usage, "```", "");
      if (e.related.length) lines.push(`Related: ${e.related.map((r) => r.title).join(", ")}`, "");
    }
  }

  return [...lines, ...tail(c)].join("\n");
}
