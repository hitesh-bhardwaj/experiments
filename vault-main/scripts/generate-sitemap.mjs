#!/usr/bin/env node
/**
 * Regenerates vault-main/public/sitemap.xml from registry/index.json.
 *
 * Static site pages (home, pricing, category listing pages, docs, legal)
 * are read from the current sitemap.xml and kept as-is. All per-effect
 * <url> entries (demo pages + article pages) are dropped and rebuilt from
 * the registry, so removed/renamed effects don't leave stale entries and
 * new effects are always included. Template pages, template demos and blog
 * posts are rebuilt the same way: templates from mock-templates.js, blog posts
 * from Sanity (if Sanity can't be reached, the existing blog entries are kept).
 *
 * Run manually: node scripts/generate-sitemap.mjs
 * Runs automatically before `npm run build` in vault-main (see "prebuild").
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const REGISTRY_INDEX = path.join(ROOT, "registry", "index.json");
const SITEMAP_PATH = path.join(ROOT, "vault-main", "public", "sitemap.xml");
const MOCK_TEMPLATES_PATH = path.join(ROOT, "vault-main", "src", "lib", "mock-templates.js");
const SITE_URL = "https://vault.hyperiux.com";
const SANITY_API_VERSION = "2024-01-01";

// npm's prebuild doesn't load .env files; Vercel builds already have the env set
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(ROOT, "vault-main", file);
  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // unreadable env file: fall through to whatever the environment has
    }
  }
}

// Mirrors the `id` -> `slug` mapping in vault-main/src/lib/categories.js.
// Keep in sync if that file's category slugs change.
const CATEGORY_SLUGS = {
  featured: "featured",
  text: "text-animations",
  backgrounds: "backgrounds",
  buttons: "buttons",
  carousels: "carousels",
  scroll: "scroll-effects",
  components: "components",
  navigation: "navigation",
  cursor: "cursor-effects",
  transitions: "page-transitions",
  loaders: "loaders",
  webgl: "webgl-effects",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function categorySlug(category) {
  return CATEGORY_SLUGS[category] || category;
}

function buildUrlBlock(loc, { priority = "0.6400", changefreq = "daily", updatedAt } = {}) {
  const lastmod = new Date(updatedAt || Date.now()).toISOString().replace(/\.\d+Z$/, "+00:00");
  return [
    "  <url>",
    `       <loc>${loc}</loc>`,
    `       <lastmod>${lastmod}</lastmod>`,
    `       <changefreq>${changefreq}</changefreq>`,
    `       <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

// Every published blog post's slug and last edit, or null if Sanity is not
// configured or can't be reached (the caller then keeps the existing entries).
async function fetchBlogPosts() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  if (!projectId) {
    console.warn("sitemap: NEXT_PUBLIC_SANITY_PROJECT_ID is not set, keeping the existing blog entries.");
    return null;
  }
  const query = '*[_type == "blogPost" && defined(slug.current)]{"slug": slug.current, _updatedAt} | order(_updatedAt desc)';
  const url = `https://${projectId}.api.sanity.io/v${SANITY_API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const token = process.env.SANITY_API_TOKEN;
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { result } = await response.json();
    return Array.isArray(result) ? result : null;
  } catch (error) {
    console.warn(`sitemap: couldn't fetch blog posts from Sanity (${error.message}), keeping the existing blog entries.`);
    return null;
  }
}

async function main() {
  const registry = readJson(REGISTRY_INDEX);
  const { TEMPLATES } = await import(MOCK_TEMPLATES_PATH);
  const existingXml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const blogPosts = await fetchBlogPosts();

  // Keep every existing <url> block whose <loc> is NOT an effect demo/article
  // page (i.e. not /demo/<slug> and not /effects/<category>/<slug>) and not
  // a template page (/templates or /templates/<slug>) - both are rebuilt
  // fresh below the same way effects are, so a removed/renamed template
  // doesn't leave a stale entry and a new one is always included.
  const blocks = existingXml.match(/<url>[\s\S]*?<\/url>/g) || [];
  const staticBlocks = blocks.filter((block) => {
    const loc = (block.match(/<loc>(.*?)<\/loc>/) || [])[1] || "";
    const isDemo = /^https?:\/\/[^/]+\/demo\//.test(loc);
    const isEffectArticle = /^https?:\/\/[^/]+\/effects\/[^/]+\/[^/]+\/?$/.test(loc);
    const isTemplatePage = /^https?:\/\/[^/]+\/(templates|template-demo)(\/|$)/.test(loc);
    // Blog posts are rebuilt from Sanity; if that failed, keep the ones we have
    const isBlogPost = blogPosts !== null && /^https?:\/\/[^/]+\/blog\/[^/]+\/?$/.test(loc);
    return !isDemo && !isEffectArticle && !isTemplatePage && !isBlogPost;
  });

  const effectBlocks = registry.flatMap((effect) => {
    const slug = effect.name;
    const catSlug = categorySlug(effect.category);
    const demoUrl = effect.previewUrl
      ? `${SITE_URL}${effect.previewUrl}`
      : `${SITE_URL}/demo/${slug}`;
    const articleUrl = `${SITE_URL}/effects/${catSlug}/${slug}`;

    return [
      buildUrlBlock(demoUrl, { priority: "0.6400" }),
      buildUrlBlock(articleUrl, { priority: "0.6400" }),
    ];
  });

  const templateBlocks = [
    buildUrlBlock(`${SITE_URL}/templates`, { priority: "0.6400" }),
    ...TEMPLATES.map((template) =>
      buildUrlBlock(`${SITE_URL}/templates/${template.slug}`, { priority: "0.6400" })
    ),
    ...TEMPLATES.map((template) =>
      buildUrlBlock(`${SITE_URL}/template-demo/${template.slug}`, { priority: "0.6400" })
    ),
  ];

  const blogBlocks = (blogPosts || []).map((post) =>
    buildUrlBlock(`${SITE_URL}/blog/${post.slug}`, { priority: "0.6400", changefreq: "monthly", updatedAt: post._updatedAt })
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml-stylesheet type="text/css" href="https://www.xml-sitemaps.com/css/sitemap.css"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    "",
    ...staticBlocks,
    ...effectBlocks,
    ...templateBlocks,
    ...blogBlocks,
    "</urlset>",
    "",
  ].join("\n");

  fs.writeFileSync(SITEMAP_PATH, xml);
  console.log(
    `sitemap.xml updated: ${staticBlocks.length} static pages, ${registry.length} effects (${effectBlocks.length} demo+article urls), ${TEMPLATES.length} templates (${templateBlocks.length} urls), ${blogPosts ? `${blogBlocks.length} blog posts from Sanity` : "blog posts kept from the existing sitemap"}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
