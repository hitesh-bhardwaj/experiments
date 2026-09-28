#!/usr/bin/env node
// Scaffolds a brand-new template's starting folder under
// apps/docs/src/app/(marketing)/template-demo/<slug>/ - the "start
// building" counterpart to package-template.mjs's "package what you've
// already built" (npm run template:update). See
// md/template-qc-checklist.md for the full shipping gate a new template
// has to clear before it's ready for that command.
//
// Usage: npm run template:create <slug> ["Title Case Name"]
//   npm run template:create aria-clinic
//   npm run template:create aria-clinic "Aria Clinic"
//
// What this does NOT do: touch package-template.mjs's TEMPLATES manifest
// or mock-templates.js's TEMPLATES array - both need real decisions
// (pricing, dependencies, category, tagline) that can't be sensibly
// auto-filled for a template that doesn't exist yet. This prints the
// snippets to paste into each instead of guessing at them.

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import fssync from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..");
const DOCS_ROOT = path.join(REPO_ROOT, "apps/docs");
const TEMPLATE_DEMO_ROOT = path.join(DOCS_ROOT, "src/app/(marketing)/template-demo");
const SCAFFOLDS_FILE = path.join(DOCS_ROOT, "src/lib/template-scaffolds.js");

function usageError(message) {
  console.error(message);
  console.error('Usage: npm run template:create <slug> ["Title Case Name"]');
  process.exit(1);
}

function titleCase(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function pageTemplate(title, slug) {
  return `import type { Metadata } from "next";
import "./${slug}.css";

// Starting point for this template - build its sections here the same way
// template-demo/elenavoss/ does (each section its own file, composed in
// this page.tsx). See md/template-qc-checklist.md for the full shipping
// gate before this is ready to package.

const TITLE = "${title}";
const DESCRIPTION = "TODO: one-sentence description for <title>/meta description.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-[#050505] px-8 text-center text-white">
      <h1 className="text-[6vw] font-medium leading-tight">${title}</h1>
      <p className="max-w-lg text-white/60">
        Start building this template&apos;s sections here.
      </p>
    </main>
  );
}
`;
}

function cssTemplate(title) {
  return `/* ${title} - scoped styles that don't fit as Tailwind utilities
   (custom fonts, keyframes, etc). See elenavoss.css for the pattern this
   repo's other templates follow. */
`;
}

function readmeTemplate(title, slug) {
  return `# ${title}

TODO: one-paragraph description - what this template is for, who it's for,
what's included. Built from [Hyperiux Vault](https://vault.hyperiux.com)
effects arranged into a full site.

## What's included

- TODO: list each major section as you build it

## Requirements

- Node.js 18.18+ (LTS recommended)
- npm, pnpm, or yarn

## Running it locally

This template lives inside the Hyperiux monorepo, at
\`apps/docs/src/app/(marketing)/template-demo/${slug}/\`.

\`\`\`bash
cd apps/docs
npm install
npm run dev
\`\`\`

Then open **http://localhost:3000/template-demo/${slug}**.

## Customizing

- TODO

## License

This template is licensed for use per your Hyperiux purchase agreement. See
[vault.hyperiux.com](https://vault.hyperiux.com) for full license terms. Do
not redistribute or resell the source files outside of your licensed usage.
`;
}

function packageManifestSnippet(slug, title) {
  return `  ${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : JSON.stringify(slug)}: {
    title: "${title}",
    description: "TODO",
    dependencies: {
      // gsap: "^3.15.0",
      // "@gsap/react": "^2.1.2",
      // lenis: "^1.3.23",
    },
    extraFiles: [],
    sourceRewrites: [],
    needsGlbLoader: false,
  },`;
}

function mockTemplateSnippet(slug, title) {
  return `  {
    slug: "${slug}",
    title: "${title}",
    category: "TODO",
    tier: "pro",
    pricing: { standaloneOneTime: 39, includedInAnnualPro: true },
    tags: [],
    installCount: 0,
    screenshots: ["/assets/templates-listing/${slug}.png"],
    href: "/templates/${slug}",
    previewHref: "/template-demo/${slug}",
    publishedAt: "TODO",
    updatedAt: "TODO",
    tagline: "TODO",
    overview: ["TODO"],
  },`;
}

// Safe, mechanical addition only - a null placeholder entry, same shape
// package-template.mjs's updateScaffoldUrl() already expects to find and
// rewrite once this template's first real zip is uploaded via
// `npm run template:update <slug>`. Skips silently (with a warning) rather
// than guessing at file structure if the object shape ever changes.
async function addScaffoldPlaceholder(slug) {
  const source = await fs.readFile(SCAFFOLDS_FILE, "utf8");
  const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : JSON.stringify(slug);

  if (new RegExp(`(^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`).test(source)) {
    console.log(`[${slug}] template-scaffolds.js already has an entry for this slug - left as-is.`);
    return;
  }

  const closingBrace = /\n};\n/;
  if (!closingBrace.test(source)) {
    console.warn(
      `[${slug}] couldn't find TEMPLATE_SCAFFOLD_BLOB_URLS's closing brace in template-scaffolds.js - add "${key}: null," in there by hand.`
    );
    return;
  }

  const updated = source.replace(closingBrace, `\n  ${key}: null,\n};\n`);
  await fs.writeFile(SCAFFOLDS_FILE, updated, "utf8");
  console.log(`[${slug}] added a placeholder entry to template-scaffolds.js.`);
}

async function createTemplate(slug, titleArg) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    usageError(`Invalid slug "${slug}" - use lowercase kebab-case (e.g. "aria-clinic").`);
  }

  const targetDir = path.join(TEMPLATE_DEMO_ROOT, slug);
  if (fssync.existsSync(targetDir)) {
    usageError(`Already exists: ${path.relative(REPO_ROOT, targetDir)}`);
  }

  const title = titleArg || titleCase(slug);

  await fs.mkdir(path.join(targetDir, "assets"), { recursive: true });
  await fs.writeFile(path.join(targetDir, "assets/.gitkeep"), "");
  await fs.writeFile(path.join(targetDir, "page.tsx"), pageTemplate(title, slug));
  await fs.writeFile(path.join(targetDir, `${slug}.css`), cssTemplate(title));
  await fs.writeFile(path.join(targetDir, "README.md"), readmeTemplate(title, slug));

  console.log(`[${slug}] created ${path.relative(REPO_ROOT, targetDir)}/`);

  await addScaffoldPlaceholder(slug);

  console.log(`
[${slug}] next steps:
  1. Build the template's sections in template-demo/${slug}/ (see
     template-demo/elenavoss/ for a fully-built reference, and
     md/template-qc-checklist.md for the full shipping gate).
  2. Add a manifest entry to TEMPLATES in scripts/package-template.mjs:

${packageManifestSnippet(slug, title)}

  3. Add a listing entry to TEMPLATES in apps/docs/src/lib/mock-templates.js:

${mockTemplateSnippet(slug, title)}

  4. Once it clears QC, run: npm run template:update ${slug}
`);
}

const slug = process.argv[2];
// Joined, not just argv[3]: `npm run template:create slug "Some Title"`
// without a `--` separator (a very natural thing to type) has npm forward
// the quoted title as several separate argv entries, not one - joining
// them back with spaces makes this work whether or not `--` was used.
const titleArg = process.argv.slice(3).join(" ") || undefined;
if (!slug) usageError("Missing <slug> argument.");

createTemplate(slug, titleArg).catch((error) => {
  console.error(error);
  process.exit(1);
});
