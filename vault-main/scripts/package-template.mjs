#!/usr/bin/env node
// Packages one live template-demo page (vault-main/src/app/(marketing)/
// template-demo/<slug>/) into a standalone, `npm i`-able Next.js project
// zip - the deliverable a template buyer downloads. See
// md/template-download-purchase-plan.md for the full plan this implements.
//
// Usage: npm run template:update <slug>
// Picks up BLOB_READ_WRITE_TOKEN from vault-main/.env.local automatically
// (see the loadEnvFile calls below) - after editing a template's source,
// this one command rebuilds its zip, uploads the new version to Vercel
// Blob, and rewrites template-scaffolds.js to point at it. Review and
// commit that file change same as any other code change.
//
// What this does NOT do: touch the real vault-main app in any way beyond
// that one rewritten line in template-scaffolds.js. Everything else only
// reads from template-demo/<slug>/ and a few other known-self-contained
// shared files (see TEMPLATES[slug].extraFiles below), and writes to
// dist/template-zips/ and a throwaway build dir under dist/template-build/.

import { fileURLToPath } from "url";
import path from "path";
import fs from "fs/promises";
import fssync from "fs";
// archiver v8 exports classes, not the old archiver("zip") factory
import { ZipArchive } from "archiver";
import { execFileSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, "..", "..");
const DOCS_ROOT = path.join(REPO_ROOT, "vault-main");
const SCAFFOLD_DIR = path.join(__dirname, "template-scaffold");
const BUILD_ROOT = path.join(REPO_ROOT, "dist/template-build");
const ZIP_ROOT = path.join(REPO_ROOT, "dist/template-zips");
// Source .fig files live here, NOT under BUILD_ROOT - packageTemplate()
// wipes each buildDir on every run (fs.rm below), so anything that needs to
// survive re-runs has to live outside it. Not committed to git either
// (dist/ is gitignored - these files are tens to hundreds of MB), so this is
// the one stable place a template's .fig file is expected to already sit
// before running template:update for it.
const FIGMA_ROOT = path.join(REPO_ROOT, "dist/template-figma");
const SCAFFOLDS_FILE = path.join(DOCS_ROOT, "src/lib/template-scaffolds.js");

// Auto-loads BLOB_READ_WRITE_TOKEN (and anything else) from vault-main's own
// env files so `npm run template:update <slug>` works as a single command -
// without this, every run needed BLOB_READ_WRITE_TOKEN=... prefixed by hand.
// Real env vars (already exported in the shell) always win - never
// overwrites a key that's already set. .env.local first since that's where
// this token actually lives; .env is a lower-priority fallback, same
// precedence order Next.js itself uses.
//
// Hand-rolled rather than process.loadEnvFile(): confirmed by direct test
// that Node's built-in parser silently stops reading the ENTIRE file at the
// first line that isn't valid KEY=value syntax - a real risk here since
// vault-main/.env.local has accumulated ad-hoc notes (test card numbers, a
// bare token) that aren't KEY=value lines. This parser instead just skips
// any line it doesn't recognize and keeps going.
function loadEnvFileTolerant(filePath) {
  let content;
  try {
    content = fssync.readFileSync(filePath, "utf8");
  } catch {
    return; // Missing file is fine - not every checkout has both.
  }

  for (const line of content.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    const quoted = rawValue.match(/^(['"])(.*)\1$/);
    process.env[key] = quoted ? quoted[2] : rawValue;
  }
}

for (const envFile of [".env.local", ".env"]) {
  loadEnvFileTolerant(path.join(DOCS_ROOT, envFile));
}

// Versions pinned to match vault-main/package.json exactly - this repo's
// AGENTS.md warns Next/React/TS are intentionally non-default versions with
// breaking API changes, so a buyer's standalone project needs the same
// pins, not "latest".
const COMMON_DEPENDENCIES = {
  next: "16.3.1",
  react: "19.2.7",
  "react-dom": "19.2.7",
};
const COMMON_DEV_DEPENDENCIES = {
  typescript: "^6.0.3",
  "@types/node": "^26.1.2",
  "@types/react": "^19.2.18",
  "@types/react-dom": "^19.2.4",
  tailwindcss: "^4",
  "@tailwindcss/postcss": "^4.3.0",
  postcss: "^8.5.23",
};

const TSCONFIG = {
  compilerOptions: {
    target: "ES2017",
    ignoreDeprecations: "6.0",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "react-jsx",
    incremental: true,
    plugins: [{ name: "next" }],
  },
  include: [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
  ],
  exclude: ["node_modules"],
};

// Per-template manifest. `extraFiles` lists shared files (outside the
// template's own template-demo/<slug>/ folder) that need to be copied in
// and have their OWN `@/...` imports rewritten to relative paths.
// `sourceRewrites` handles the other half: files already copied by
// copyDir() (part of the template's own source) that reference one of
// those extraFiles via its old "@/..." alias, which needs rewriting to
// wherever that extraFile actually lands.
const TEMPLATES = {
  elenavoss: {
    title: "Elena Voss - Creative Web Designer Portfolio Template",
    description:
      "A single-page portfolio template for creative web designers - award-winning work, services, testimonials, and client showcase, built with GSAP scroll animations.",
    dependencies: {
      gsap: "^3.15.0",
      "@gsap/react": "^2.1.2",
      lenis: "^1.3.23",
      "lucide-react": "^0.577.0",
      zod: "^4.4.3",
      // Pre-existing gap, unrelated to the src/ restructure -
      // Testimonials.tsx's slide/scale transition uses Framer Motion but it
      // was never listed here, so every build (before this restructure too)
      // would have failed at `next build` with "Can't resolve 'motion'".
      motion: "^12.40.0",
    },
    extraFiles: [],
    sourceRewrites: [],
    needsGlbLoader: false,
    figmaFile: "ElenaVoss.fig",
  },
  lumera: {
    title: "Lumera - Luxury Real Estate Template",
    description:
      "A single-page luxury real estate template for Dubai property launches - residences, amenities, gallery, nearby highlights, and enquiry flows, built with GSAP scroll animations.",
    dependencies: {
      gsap: "^3.15.0",
      "@gsap/react": "^2.1.2",
      lenis: "^1.3.23",
      "lucide-react": "^0.577.0",
      zod: "^4.4.3",
      motion: "^12.40.0",
    },
    // Fully self-contained as of this template's own reducedMotion.ts /
    // LenisSmoothScroll.tsx / ScrollTopOnLoad.tsx (confirmed via grep - no
    // "@/..." aliased imports anywhere in this template), same as kyntra
    // below. Used to pull LenisScroll.jsx and lib/motion.js in from the
    // shared app-level files; that's no longer true.
    extraFiles: [],
    sourceRewrites: [],
    needsGlbLoader: false,
    figmaFile: "Lumera.fig",
  },
  "oris-dental": {
    title: "Oris Dental - Modern Dental Clinic Template",
    description:
      "A modern dental clinic template built around an interactive 3D teeth visualizer, with treatment showcases, patient reviews, and online appointment booking.",
    dependencies: {
      gsap: "^3.15.0",
      lenis: "^1.3.23",
      three: "^0.182.0",
      "@react-three/fiber": "^9.6.0",
      "@react-three/drei": "^10.7.7",
      // Pre-existing gap, unrelated to the src/ restructure - effects/
      // char-stagger-button/index.tsx imports lucide-react but it was never
      // listed here, so every build (before this restructure too) would
      // have failed at `next build` with "Can't resolve 'lucide-react'".
      "lucide-react": "^0.577.0",
    },
    // Same pre-existing gap as the lucide-react one above: strict-mode
    // TypeScript needs a declaration for "three" itself (teeth-3d/TeethCanvas.tsx
    // does `import * as THREE from 'three'` directly), and this happened to
    // build clean without it, but only because @react-three/drei's own
    // dependency tree hoisted a copy in - not something to rely on.
    devDependencies: {
      "@types/three": "^0.182.0",
    },
    // LenisScroll.jsx/motion.js/ScrollTopOnLoad.jsx are no longer pulled in
    // from the shared app-level files (this template now ships its own
    // LenisSmoothScroll.tsx/ScrollTopOnLoad.tsx, confirmed via grep - no
    // "@/..." aliased imports left anywhere in this template) - only the 3D
    // model remains a real cross-boundary dependency, since it lives in
    // vault-main/public/ (served by URL, not bundled) rather than inside
    // template-demo/oris-dental/ itself.
    extraFiles: [
      {
        from: "vault-main/public/templates/oris-dental/teeth-compressed.glb",
        to: "public/assets/teeth-compressed.glb",
        rewriteImports: [],
      },
    ],
    sourceRewrites: [
      {
        // MODEL_URL used to be a bundler import of a file inside this
        // template's own assets/ (hence needsGlbLoader's webpack rule);
        // it's since moved to a plain public/ URL string served by the
        // live app - rewritten here to the standalone project's own
        // public/assets/ (everything public-served lives under that one
        // folder, per the src/ restructure - see mapTemplatePathToCodePath).
        file: "teeth-3d/TeethCanvas.tsx",
        find: "'/templates/oris-dental/teeth-compressed.glb'",
        replace: "'/assets/teeth-compressed.glb'",
      },
    ],
    needsGlbLoader: false,
    figmaFile: "OrisDental.fig",
  },
  kyntra: {
    title: "Kyntra - Home Service Booking App Landing Page",
    description:
      "A single-page app landing template for home maintenance and service booking - animated app mockups, appliance/warranty tracking, a step-by-step onboarding walkthrough, and testimonials, built with GSAP scroll animations.",
    dependencies: {
      gsap: "^3.15.0",
      "@gsap/react": "^2.1.2",
      lenis: "^1.3.23",
      "lucide-react": "^0.577.0",
      motion: "^12.40.0",
      zod: "^4.4.3",
      // Pre-existing gap, unrelated to the src/ restructure -
      // components/shader/gradient.tsx (Hero.tsx's background) imports both
      // but neither was listed here, so every build (before this restructure
      // too) would have failed at `next build` with "Can't resolve".
      three: "^0.182.0",
      "@react-three/fiber": "^9.6.0",
    },
    // Unlike oris-dental, kyntra has no @react-three/drei in its dependency
    // tree to accidentally hoist a copy of this in - without declaring it
    // explicitly, `next build`'s TypeScript pass fails outright here.
    devDependencies: {
      "@types/three": "^0.182.0",
    },
    // Fully self-contained: LenisSmoothScroll.tsx and ScrollTopOnLoad.tsx
    // live inside kyntra's own template-demo/ folder (confirmed via grep -
    // no "@/..." aliased imports anywhere in this template), unlike
    // lumera/oris-dental which pull those in from shared app-level files.
    extraFiles: [],
    sourceRewrites: [],
    needsGlbLoader: false,
    figmaFile: "Kyntra.fig",
  },
};

function usageError(message) {
  console.error(message);
  console.error("Usage: node scripts/package-template.mjs <slug>");
  console.error(`Known slugs: ${Object.keys(TEMPLATES).join(", ")}`);
  process.exit(1);
}

async function copyDir(src, dest, { skip = [] } = {}) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (skip.includes(entry.name)) continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, { skip });
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Every downloadable template moves from a flat dump (template-demo/<slug>/
// with page.tsx, every component, assets/, and effects/ all sitting
// together) into a conventional Next.js src/ layout: src/app/ holds only
// page.tsx, layout.tsx, globals.css and the template's own top-level
// stylesheet(s); src/assets/ holds every image/font/etc. that's imported as
// a JS module (kept as real imports, not moved to public/, so next/image
// keeps auto-detecting width/height and generating blur placeholders - only
// truly public-URL assets like a fetched 3D model belong in public/);
// everything else (every other component file, and folders like effects/,
// teeth-3d/, or - for a template like kyntra that already nests its own
// components/ folder - that folder's contents merged directly in) lands in
// src/components/.
//
// Takes a path relative to the template's own source root (e.g. "Header.tsx",
// "assets/logo.svg", "components/Hero.tsx", "effects/foo/Bar.tsx") and
// returns its new path relative to Code/. Deliberately keyed off path
// SEGMENTS only, never file extension, so it works the same whether or not
// the caller already resolved a module import to a real file (see
// resolveRelativeImportTarget below, which often can't).
function mapTemplatePathToCodePath(relPath) {
  const parts = relPath.split("/");
  const [first, ...rest] = parts;

  if (first === "page.tsx") return "src/app/page.tsx";
  if (first === "assets") return ["src", "assets", ...rest].join("/");
  // A template's own top-level stylesheet (oris-dental.css, kyntra-styles.css,
  // lumera's fonts.css + lumera-styles.css, ...) - anything ending in .css
  // sitting at the template's own root, not nested in a subfolder.
  if (rest.length === 0 && first.endsWith(".css")) return ["src", "app", first].join("/");
  // A template that already nests its own components/ folder (kyntra) -
  // merge its contents directly into src/components/ rather than nesting a
  // redundant components/components/.
  if (first === "components") return ["src", "components", ...rest].join("/");
  // Root-level docs (README.md is handled separately and never reaches this
  // function; PERFORMANCE.md and anything else like it) stay at Code/'s own
  // root rather than getting swept into src/components/.
  if (rest.length === 0 && first.endsWith(".md")) return first;

  return ["src", "components", ...parts].join("/");
}

const REWRITABLE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

// Resolves a relative import/url() specifier (e.g. "./assets/x.svg",
// "../Header", "./effects/foo") against the file that contains it, both
// given as paths relative to the template's own source root - returns the
// target's path the same way, or null if it points outside the template
// source entirely (nothing in these templates does, but bail safely rather
// than mis-rewrite if one ever does).
function resolveRelativeImportTarget(importerRelPath, specifier) {
  const importerDir = path.posix.dirname(importerRelPath);
  const resolved = path.posix.normalize(path.posix.join(importerDir, specifier));
  if (resolved.startsWith("..")) return null;
  return resolved;
}

function toRelativeSpecifier(fromDir, targetRelPath) {
  let rel = path.posix.relative(fromDir, targetRelPath);
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

// Rewrites every relative import/url() in `content` (a file that lived at
// `importerOldRelPath` relative to the template source root) so it points
// at the right place under the new src/ layout, computed purely from where
// that file and its target both land post-restructure - not pattern-matched
// against "assets/", so it naturally does nothing to an import that's
// already the correct distance away (e.g. a template that already nests its
// components in their own folder) and correctly adjusts one that isn't.
function rewriteRelativeSpecifiers(content, importerOldRelPath) {
  const importerNewRelPath = mapTemplatePathToCodePath(importerOldRelPath);
  const importerNewDir = path.posix.dirname(importerNewRelPath);

  const rewriteOne = (specifier) => {
    const targetOldRelPath = resolveRelativeImportTarget(importerOldRelPath, specifier);
    if (targetOldRelPath === null) return specifier;
    const targetNewRelPath = mapTemplatePathToCodePath(targetOldRelPath);
    return toRelativeSpecifier(importerNewDir, targetNewRelPath);
  };

  // `\(?\s*` after "import" covers dynamic `import("./x")` calls (e.g.
  // next/dynamic's `dynamic(() => import("./components/Foo"))`) as well as
  // plain `import "./x"`/`from "./x"` - without it, a dynamic import's
  // specifier was silently left unrewritten (caught by an actual `next
  // build` against the restructured output, not just a path-log check).
  let result = content.replace(
    /((?:from|import)\s*\(?\s*)(['"])(\.[^'"]*)\2/g,
    (whole, prefix, quote, specifier) => `${prefix}${quote}${rewriteOne(specifier)}${quote}`
  );
  result = result.replace(
    /url\(\s*(['"]?)(\.[^'")]*)\1\s*\)/g,
    (whole, quote, specifier) => `url(${quote}${rewriteOne(specifier)}${quote})`
  );
  // `new URL("./assets/x.mp4", import.meta.url)` - the bundler-URL pattern
  // used for video assets too large/unwieldy for a plain `import` (see
  // lumera's ShowCase.tsx/Bringing.tsx). Distinct from CSS `url(...)` above
  // (case-sensitive, and always paired with `import.meta.url`), so it needs
  // its own pass rather than folding into that one.
  result = result.replace(
    /(new\s+URL\s*\(\s*)(['"])(\.[^'"]*)\2/g,
    (whole, prefix, quote, specifier) => `${prefix}${quote}${rewriteOne(specifier)}${quote}`
  );
  return result;
}

// Replaces the old flat copyDir(sourceDir, Code/app/) with one that fans
// files out across src/app/, src/assets/, and src/components/ per
// mapTemplatePathToCodePath, rewriting every relative import/url() it
// touches along the way. `skip` behaves the same as copyDir's.
async function copyTemplateSource(sourceDir, codeDir, { skip = [] } = {}) {
  async function walk(dir, relBase) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.includes(entry.name)) continue;

      const srcPath = path.join(dir, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(srcPath, relPath);
        continue;
      }

      const destRelPath = mapTemplatePathToCodePath(relPath);
      const destPath = path.join(codeDir, destRelPath);
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      if (REWRITABLE_EXTENSIONS.has(path.extname(entry.name))) {
        const content = await fs.readFile(srcPath, "utf8");
        await fs.writeFile(destPath, rewriteRelativeSpecifiers(content, relPath), "utf8");
      } else {
        // Binary (images, fonts, .glb, ...) - raw copy, never decoded as text.
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  await walk(sourceDir, "");
}

// The source README.md is otherwise accurate/worth keeping (Customizing,
// Motion & accessibility sections) - only its "Running it locally" section
// is wrong, since it assumes the monorepo-nested route path. Targeted
// replace rather than a from-scratch README template, so per-template
// authored content survives.
//
// Not every template's README needs every fix here (confirmed by reading
// all three): elenavoss and oris-dental both have the broken monorepo-path
// section, lumera's "Getting started" section never referenced it to begin
// with; oris-dental's folder-tree diagram starts with its own slug as a
// bare dir name (elenavoss's does too), lumera has no such diagram; lumera
// already ships its own "## License" section, the other two don't. So each
// fix is applied only when its corresponding pattern is actually present,
// rather than assuming every template needs every fix.
function fixReadme(source, slug) {
  const brokenSection = /## Running it locally\n\n[\s\S]*?(?=\n## )/;
  const fixedSection = `## Running it locally

This is a standalone Next.js project - no monorepo, no workspace setup.

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open **http://localhost:3000**.

`;

  let result = source;
  if (brokenSection.test(result)) {
    result = result.replace(brokenSection, fixedSection);
  }

  const folderTreeHeader = new RegExp(`^${slug}/\\n├── page\\.tsx`, "m");
  result = result.replace(folderTreeHeader, "app/\n├── page.tsx");

  // Full folder-structure tree rewrite for the src/app + src/assets +
  // src/components restructure (see mapTemplatePathToCodePath). Whole-block
  // literal replacement, not a regex rewrite of the old tree, since the
  // structural change (splitting one flat app/ into three top-level
  // folders) is bigger than a targeted find/replace can express cleanly -
  // same "only patch a template whose README actually has this exact
  // block" discipline as the rest of this function.
  if (slug === "oris-dental") {
    const oldTree = `app/
├── page.tsx                    # Composes every section, in order
├── Header.tsx                  # Fixed nav, scroll-aware hide/show
├── Hero.tsx                    # 3D interactive tooth visualizer & intro copy
├── AboutOris.tsx                # Practice overview + animated slot counters
├── DentalTreatments.tsx         # Scroll-pinned stacked card deck of treatments
├── WhyOris.tsx                  # Why choose us feature card with animated metrics
├── CareComfort.tsx              # Care & comfort feature section
├── ParallaxSectionBreak.tsx     # Full-bleed parallax statement break
├── Reviews.tsx                  # Ribbon review strips + section break
├── PassionMeetPurpose.tsx       # Grid gallery showcasing clinic & doctors
├── BookAppointment.tsx          # Appointment booking card + contact form
├── Footer.tsx                   # Interactive dot canvas footer with brand wordmark
├── Loader.tsx                   # Watermark fill progress loading screen
├── OrisWrapper.tsx              # Lenis smooth scroll root wrapper
├── LenisSmoothScroll.tsx        # Lenis provider
├── ScrollTopOnLoad.tsx          # Resets scroll position on route load
├── oris-dental.css              # Custom font faces and scoped typographic tokens
├── assets/                      # Images, self-hosted fonts, review cards
│   ├── OrisDental.svg           # Brand logo watermark
│   ├── fonts/                   # Self-hosted AeonikPro font files (woff2)
│   └── reviews/                 # Review ribbon cards
├── teeth-3d/                    # 3D tooth visualizer (Three.js + drei)
│   ├── TeethCanvas.tsx
│   ├── ToothShield.tsx
│   ├── DotsCanvas.tsx
│   └── MouseTilt.tsx
└── effects/                     # Extracted self-contained effects
    ├── dot-fill-button/
    ├── circular-button/
    ├── slot-counter/
    ├── text-fill/
    ├── split-text-lines/
    ├── patient-card/
    ├── contact-form/
    └── smooth-carousel/
\`\`\`

The 3D tooth model itself ships as a static asset at \`Code/public/teeth-compressed.glb\`
(referenced by URL from \`teeth-3d/TeethCanvas.tsx\`, not bundled).`;

    const newTree = `src/
├── app/
│   ├── page.tsx                 # Composes every section, in order
│   └── oris-dental.css          # Custom font faces and scoped typographic tokens
├── assets/                      # Images, self-hosted fonts, review cards
│   ├── OrisDental.svg           # Brand logo watermark
│   ├── fonts/                   # Self-hosted AeonikPro font files (woff2)
│   └── reviews/                 # Review ribbon cards
└── components/
    ├── Header.tsx                  # Fixed nav, scroll-aware hide/show
    ├── Hero.tsx                    # 3D interactive tooth visualizer & intro copy
    ├── AboutOris.tsx                # Practice overview + animated slot counters
    ├── DentalTreatments.tsx         # Scroll-pinned stacked card deck of treatments
    ├── WhyOris.tsx                  # Why choose us feature card with animated metrics
    ├── CareComfort.tsx              # Care & comfort feature section
    ├── ParallaxSectionBreak.tsx     # Full-bleed parallax statement break
    ├── Reviews.tsx                  # Ribbon review strips + section break
    ├── PassionMeetPurpose.tsx       # Grid gallery showcasing clinic & doctors
    ├── BookAppointment.tsx          # Appointment booking card + contact form
    ├── Footer.tsx                   # Interactive dot canvas footer with brand wordmark
    ├── Loader.tsx                   # Watermark fill progress loading screen
    ├── OrisWrapper.tsx              # Lenis smooth scroll root wrapper
    ├── LenisSmoothScroll.tsx        # Lenis provider
    ├── ScrollTopOnLoad.tsx          # Resets scroll position on route load
    ├── teeth-3d/                    # 3D tooth visualizer (Three.js + drei)
    │   ├── TeethCanvas.tsx
    │   ├── ToothShield.tsx
    │   ├── DotsCanvas.tsx
    │   └── MouseTilt.tsx
    └── effects/                     # Extracted self-contained effects
        ├── dot-fill-button/
        ├── circular-button/
        ├── slot-counter/
        ├── text-fill/
        ├── split-text-lines/
        ├── patient-card/
        ├── contact-form/
        └── smooth-carousel/
\`\`\`

The 3D tooth model itself ships as a static asset at \`Code/public/assets/teeth-compressed.glb\`
(referenced by URL from \`src/components/teeth-3d/TeethCanvas.tsx\`, not bundled).`;

    if (!result.includes(oldTree)) {
      throw new Error(
        `[${slug}] fixReadme's oris-dental folder-tree block wasn't found verbatim - the README changed, update this replacement text.`
      );
    }
    result = result.replace(oldTree, newTree);
  }

  if (slug === "kyntra") {
    const oldTree = `app/
├── page.tsx                    # Composes every section, in order
├── kyntra-styles.css            # Color tokens and @font-face declarations
├── assets/                      # Images, icons, self-hosted fonts
│   ├── fonts/
│   ├── features/
│   ├── smarter/
│   ├── testimonial/
│   └── blogs/
└── components/`;

    const newTree = `src/
├── app/
│   ├── page.tsx                 # Composes every section, in order
│   └── kyntra-styles.css        # Color tokens and @font-face declarations
├── assets/                      # Images, icons, self-hosted fonts
│   ├── fonts/
│   ├── features/
│   ├── smarter/
│   ├── testimonial/
│   └── blogs/
└── components/`;

    if (!result.includes(oldTree)) {
      throw new Error(
        `[${slug}] fixReadme's kyntra folder-tree header wasn't found verbatim - the README changed, update this replacement text.`
      );
    }
    result = result.replace(oldTree, newTree);
  }

  if (slug === "elenavoss") {
    const oldTree = `app/
├── page.tsx              # composes every section, in order
├── Header.tsx             # fixed nav, scroll-aware blur + hide/show
├── Hero.tsx                # intro sequence: image → headline → header
├── Portfolio.tsx           # scroll-pinned project list
├── WhyWorkWithMe.tsx
├── Services.tsx            # horizontal scroll on desktop, grid on mobile
├── Awards.tsx               # hover-reveal award list
├── Line.tsx                 # the interactive divider used in Awards
├── SectionBreak.tsx         # "trusted by" logo strip
├── Clients.tsx               # ripple rings + client logos
├── Testimonials.tsx          # quote carousel
├── Faq.tsx                    # accordion
├── Footer.tsx
├── GetInTouchModal.tsx        # contact modal + its React context provider
├── elenavoss.css               # styles that don't fit as Tailwind utilities
│                                 (fonts, marquee keyframes, divider-line mask)
├── effects/                     # self-contained animation components,
│                                 adapted from Hyperiux Vault for this template
│   ├── animated-form/            # the contact form + its inputs
│   ├── animated-modal/           # the modal shell GetInTouchModal uses
│   ├── animated-faq/             # the FAQ accordion primitives
│   ├── overflow-text-reveal/     # the char/line reveal-on-scroll used everywhere
│   └── dot-fill-button/          # the pill button with the animated dot
└── assets/                       # images, icons, self-hosted fonts`;

    const newTree = `src/
├── app/
│   ├── page.tsx              # composes every section, in order
│   └── elenavoss.css               # styles that don't fit as Tailwind utilities
│                                 (fonts, marquee keyframes, divider-line mask)
├── assets/                       # images, icons, self-hosted fonts
└── components/
    ├── Header.tsx             # fixed nav, scroll-aware blur + hide/show
    ├── Hero.tsx                # intro sequence: image → headline → header
    ├── Portfolio.tsx           # scroll-pinned project list
    ├── WhyWorkWithMe.tsx
    ├── Services.tsx            # horizontal scroll on desktop, grid on mobile
    ├── Awards.tsx               # hover-reveal award list
    ├── Line.tsx                 # the interactive divider used in Awards
    ├── SectionBreak.tsx         # "trusted by" logo strip
    ├── Clients.tsx               # ripple rings + client logos
    ├── Testimonials.tsx          # quote carousel
    ├── Faq.tsx                    # accordion
    ├── Footer.tsx
    ├── GetInTouchModal.tsx        # contact modal + its React context provider
    └── effects/                     # self-contained animation components,
                                    adapted from Hyperiux Vault for this template
        ├── animated-form/            # the contact form + its inputs
        ├── animated-modal/           # the modal shell GetInTouchModal uses
        ├── animated-faq/             # the FAQ accordion primitives
        ├── overflow-text-reveal/     # the char/line reveal-on-scroll used everywhere
        └── dot-fill-button/          # the pill button with the animated dot`;

    if (!result.includes(oldTree)) {
      throw new Error(
        `[${slug}] fixReadme's elenavoss folder-tree block wasn't found verbatim - the README changed, update this replacement text.`
      );
    }
    result = result.replace(oldTree, newTree);
  }

  if (slug === "lumera") {
    const oldTree = `app/
├── page.tsx                    # Composes every section, in order
├── Header.tsx                   # Animated nav with a mobile menu
├── Hero.tsx                     # Full-screen intro with entrance animation
├── About.tsx                    # Brand/positioning section
├── Service.tsx                  # Service/offering highlights
├── Works.tsx                    # Portfolio/project listing
├── Project.tsx                  # Project detail with an infinite carousel
├── ProjectHover.tsx             # Hover-triggered image preview
├── ShowCase.tsx                 # Background video showcase
├── Gallery.tsx                  # Interactive feature gallery
├── Bringing.tsx                 # Supporting video section
├── Highlights.tsx                # Nearby highlights/amenities
├── Roi.tsx                       # Investment/return details
├── CTA.tsx                       # Contact/enquiry call to action
├── EnquiryModal.tsx              # Enquiry modal + form
├── Loader.tsx                    # Entry loading screen
├── LenisSmoothScroll.tsx         # Lenis provider
├── ScrollTopOnLoad.tsx           # Resets scroll position on load
├── reducedMotion.ts              # Shared \`usePrefersReducedMotion\` hook
├── gsapAnimations.tsx            # Shared GSAP animation helpers
├── lumera-styles.css             # Color tokens and custom styles
├── fonts.css                     # Self-hosted @font-face declarations
├── smooth-carousel/              # Custom drag/inertia carousel engine
├── assets/                       # Images, video, icons, self-hosted fonts
│   ├── fonts/
│   └── icons/
└── effects/                      # Self-contained effect components
    ├── animated-form/             # The enquiry form + its inputs
    ├── animated-faq/              # The FAQ accordion primitives
    ├── char-stagger-button/
    ├── draggable-marquee/
    ├── horizontal-feature-reveal/
    ├── mask-text-reveal/
    ├── number-counter/
    ├── parallax-footer/
    └── parallax-image-animation/`;

    const newTree = `src/
├── app/
│   ├── page.tsx                    # Composes every section, in order
│   ├── lumera-styles.css             # Color tokens and custom styles
│   └── fonts.css                     # Self-hosted @font-face declarations
├── assets/                       # Images, video, icons, self-hosted fonts
│   ├── fonts/
│   └── icons/
└── components/
    ├── Header.tsx                   # Animated nav with a mobile menu
    ├── Hero.tsx                     # Full-screen intro with entrance animation
    ├── About.tsx                    # Brand/positioning section
    ├── Service.tsx                  # Service/offering highlights
    ├── Works.tsx                    # Portfolio/project listing
    ├── Project.tsx                  # Project detail with an infinite carousel
    ├── ProjectHover.tsx             # Hover-triggered image preview
    ├── ShowCase.tsx                 # Background video showcase
    ├── Gallery.tsx                  # Interactive feature gallery
    ├── Bringing.tsx                 # Supporting video section
    ├── Highlights.tsx                # Nearby highlights/amenities
    ├── Roi.tsx                       # Investment/return details
    ├── CTA.tsx                       # Contact/enquiry call to action
    ├── EnquiryModal.tsx              # Enquiry modal + form
    ├── Loader.tsx                    # Entry loading screen
    ├── LenisSmoothScroll.tsx         # Lenis provider
    ├── ScrollTopOnLoad.tsx           # Resets scroll position on load
    ├── reducedMotion.ts              # Shared \`usePrefersReducedMotion\` hook
    ├── gsapAnimations.tsx            # Shared GSAP animation helpers
    ├── smooth-carousel/              # Custom drag/inertia carousel engine
    └── effects/                      # Self-contained effect components
        ├── animated-form/             # The enquiry form + its inputs
        ├── animated-faq/              # The FAQ accordion primitives
        ├── char-stagger-button/
        ├── draggable-marquee/
        ├── horizontal-feature-reveal/
        ├── mask-text-reveal/
        ├── number-counter/
        ├── parallax-footer/
        └── parallax-image-animation/`;

    if (!result.includes(oldTree)) {
      throw new Error(
        `[${slug}] fixReadme's lumera folder-tree block wasn't found verbatim - the README changed, update this replacement text.`
      );
    }
    result = result.replace(oldTree, newTree);
  }

  if (!/\n## License\b/.test(result)) {
    // README.md now ships inside Code/ (see "What's in this download"
    // above), one level below LICENSE.md at the download's top level -
    // hence ../LICENSE.md rather than ./LICENSE.md.
    result = result.replace(/$/, `\n## License\n\nSee [\`LICENSE.md\`](../LICENSE.md).\n`);
  }

  return result;
}

function buildPackageJson(slug, manifest) {
  // Next 16 defaults to Turbopack, which hard-errors on a `webpack()`
  // config function ("no `turbopack` config" - see next.config.mjs's
  // needsGlbLoader branch) rather than silently ignoring it. vault-main
  // itself hits the same thing and forces `--webpack` in its own
  // dev/build scripts for exactly this reason - same fix here, for any
  // template whose next.config.mjs ends up with a webpack() block.
  const webpackFlag = manifest.needsGlbLoader ? " --webpack" : "";

  return {
    name: slug,
    version: "1.0.0",
    private: true,
    scripts: {
      dev: `next dev${webpackFlag}`,
      build: `next build${webpackFlag}`,
      start: "next start",
    },
    dependencies: {
      ...COMMON_DEPENDENCIES,
      ...manifest.dependencies,
    },
    devDependencies: {
      ...COMMON_DEV_DEPENDENCIES,
      ...manifest.devDependencies,
    },
  };
}

async function buildNextConfig(manifest) {
  let content = await fs.readFile(
    path.join(SCAFFOLD_DIR, "next.config.mjs"),
    "utf8"
  );

  if (manifest.needsGlbLoader) {
    content = content.replace(
      "const nextConfig = {",
      `const nextConfig = {\n  webpack(config) {\n    config.module.rules.push({ test: /\\.(glb|gltf)$/, type: "asset/resource" });\n    return config;\n  },`
    );
  }

  return content;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Closes the loop this script's own re-upload comment used to leave open:
// paste the printed URL into template-scaffolds.js by hand. Only rewrites
// the one string literal for this slug's TEMPLATE_SCAFFOLD_BLOB_URLS entry
// (matched via the key + a following quoted string, not a full-line
// reconstruction) so the file's own formatting/comments survive untouched.
async function updateScaffoldUrl(slug, newUrl) {
  const source = await fs.readFile(SCAFFOLDS_FILE, "utf8");
  const key = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(slug) ? slug : JSON.stringify(slug);
  const pattern = new RegExp(`(${escapeRegExp(key)}:\\s*)"[^"]*"`);

  if (!pattern.test(source)) {
    console.warn(
      `[${slug}] couldn't find a TEMPLATE_SCAFFOLD_BLOB_URLS["${slug}"] entry in ${path.relative(REPO_ROOT, SCAFFOLDS_FILE)} to update automatically - paste the URL above in by hand.`
    );
    return;
  }

  await fs.writeFile(SCAFFOLDS_FILE, source.replace(pattern, `$1${JSON.stringify(newUrl)}`), "utf8");
  console.log(
    `[${slug}] updated ${path.relative(REPO_ROOT, SCAFFOLDS_FILE)} with the new URL - review and commit that change.`
  );
}

async function packageTemplate(slug) {
  const manifest = TEMPLATES[slug];
  if (!manifest) usageError(`Unknown template slug: "${slug}"`);

  const sourceDir = path.join(DOCS_ROOT, "src/app/(marketing)/template-demo", slug);
  if (!fssync.existsSync(sourceDir)) {
    usageError(`Source folder not found: ${sourceDir}`);
  }

  const buildDir = path.join(BUILD_ROOT, slug);
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });

  // The zip's top level is now Code/ (the runnable project), Figma File/
  // (the source design), and LICENSE.md - not a flat dump of the project at
  // the zip root like before.
  const codeDir = path.join(buildDir, "Code");
  await fs.mkdir(codeDir, { recursive: true });

  console.log(`[${slug}] copying template-demo source into Code/src/ ...`);
  await copyTemplateSource(sourceDir, codeDir, { skip: ["README.md"] });

  for (const extra of manifest.extraFiles) {
    console.log(`[${slug}] copying extra shared file: ${extra.from}`);
    const from = path.join(REPO_ROOT, extra.from);
    // `to` starting with "public/" lands at Code/'s own root (a real Next.js
    // public/ dir, e.g. for a static model/asset served by URL) - everything
    // else is treated as a template-source-relative path and goes through
    // the same src/app|assets|components mapping copyTemplateSource used
    // above, for a source file the template's own code imports.
    const to = extra.to.startsWith("public/")
      ? path.join(codeDir, extra.to)
      : path.join(codeDir, mapTemplatePathToCodePath(extra.to));
    await fs.mkdir(path.dirname(to), { recursive: true });

    if (!extra.rewriteImports?.length) {
      // No text rewriting needed - copy raw bytes so binary files (e.g. a
      // .glb model) survive intact instead of being corrupted by a
      // read-as-utf8/write-as-utf8 round trip.
      await fs.copyFile(from, to);
      continue;
    }

    let content = await fs.readFile(from, "utf8");
    for (const [find, replace] of extra.rewriteImports || []) {
      content = content.split(find).join(replace);
    }
    await fs.writeFile(to, content, "utf8");
  }

  // Files already copied by copyTemplateSource() above (part of the
  // template's own template-demo/<slug>/ source) that reference an
  // extraFile via its old "@/..." alias path - that alias doesn't exist in
  // the generated project (no @/* in tsconfig.json, matching the plan's
  // "every template file uses relative imports only"), so it must be
  // rewritten to the extra file's real relative location, same find/replace
  // approach as extraFiles above. `rewrite.file` is a template-source-relative
  // path, same convention as extraFiles' `to`, so it goes through the same mapping.
  for (const rewrite of manifest.sourceRewrites || []) {
    const target = path.join(codeDir, mapTemplatePathToCodePath(rewrite.file));
    const content = await fs.readFile(target, "utf8");
    if (!content.includes(rewrite.find)) {
      throw new Error(
        `[${slug}] sourceRewrite couldn't find ${JSON.stringify(rewrite.find)} in ${rewrite.file} - source file changed, update this manifest entry.`
      );
    }
    await fs.writeFile(target, content.split(rewrite.find).join(rewrite.replace), "utf8");
  }

  console.log(`[${slug}] writing package.json / tsconfig.json ...`);
  await fs.writeFile(
    path.join(codeDir, "package.json"),
    JSON.stringify(buildPackageJson(slug, manifest), null, 2) + "\n",
    "utf8"
  );
  // package-lock.json next to package.json: npm resolves the full dependency
  // tree (exact versions, tarball URLs, integrity hashes for every direct and
  // transitive package) from the registry without downloading node_modules,
  // so every buyer's `npm install` gets the exact tree this zip was tested
  // against instead of whatever the ^ ranges resolve to on the day.
  console.log(`[${slug}] generating package-lock.json (npm install --package-lock-only) ...`);
  execFileSync(
    "npm",
    ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: codeDir, stdio: "inherit" }
  );

  await fs.writeFile(
    path.join(codeDir, "tsconfig.json"),
    JSON.stringify(TSCONFIG, null, 2) + "\n",
    "utf8"
  );

  console.log(`[${slug}] writing next.config.mjs / postcss.config.mjs / .gitignore ...`);
  await fs.writeFile(
    path.join(codeDir, "next.config.mjs"),
    await buildNextConfig(manifest),
    "utf8"
  );
  await fs.copyFile(
    path.join(SCAFFOLD_DIR, "postcss.config.mjs"),
    path.join(codeDir, "postcss.config.mjs")
  );
  await fs.copyFile(
    path.join(SCAFFOLD_DIR, ".gitignore"),
    path.join(codeDir, ".gitignore")
  );

  console.log(`[${slug}] writing src/app/layout.tsx / src/app/globals.css ...`);
  await fs.mkdir(path.join(codeDir, "src/app"), { recursive: true });
  const layoutSource = await fs.readFile(
    path.join(SCAFFOLD_DIR, "app/layout.tsx"),
    "utf8"
  );
  await fs.writeFile(
    path.join(codeDir, "src/app/layout.tsx"),
    layoutSource
      .replace("__TITLE__", manifest.title)
      .replace("__DESCRIPTION__", manifest.description),
    "utf8"
  );
  // The template's own src/app/globals.css (if any survived the copy - none
  // of the four templates ship one today) would collide with the scaffold's
  // Tailwind entry point of the same name; templates instead import their
  // own scoped stylesheet (e.g. elenavoss.css) directly from page.tsx, so
  // this is always safe to write unconditionally.
  await fs.copyFile(
    path.join(SCAFFOLD_DIR, "app/globals.css"),
    path.join(codeDir, "src/app/globals.css")
  );

  console.log(`[${slug}] writing README.md ...`);
  const sourceReadme = await fs.readFile(path.join(sourceDir, "README.md"), "utf8");
  await fs.writeFile(path.join(codeDir, "README.md"), fixReadme(sourceReadme, slug), "utf8");

  // LICENSE.md sits at the download's top level (alongside Code/ and Figma
  // File/), not inside Code/ - it covers the whole download, not just the
  // source code.
  console.log(`[${slug}] writing LICENSE.md ...`);
  const licenseSource = await fs.readFile(
    path.join(SCAFFOLD_DIR, "LICENSE.md.template"),
    "utf8"
  );
  await fs.writeFile(
    path.join(buildDir, "LICENSE.md"),
    licenseSource.replace("__TITLE__", manifest.title),
    "utf8"
  );

  if (manifest.figmaFile) {
    const figmaSource = path.join(FIGMA_ROOT, slug, manifest.figmaFile);
    if (!fssync.existsSync(figmaSource)) {
      throw new Error(
        `[${slug}] figmaFile "${manifest.figmaFile}" not found at ${path.relative(REPO_ROOT, figmaSource)} - place the .fig export there before packaging.`
      );
    }
    console.log(`[${slug}] copying Figma File/${manifest.figmaFile} ...`);
    const figmaDir = path.join(buildDir, "Figma File");
    await fs.mkdir(figmaDir, { recursive: true });
    await fs.copyFile(figmaSource, path.join(figmaDir, manifest.figmaFile));
  }

  console.log(`[${slug}] zipping ...`);
  await fs.mkdir(ZIP_ROOT, { recursive: true });
  const zipPath = path.join(ZIP_ROOT, `${slug}.zip`);
  await zipDirectory(buildDir, zipPath);
  console.log(`[${slug}] zip written: ${path.relative(REPO_ROOT, zipPath)}`);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const buffer = await fs.readFile(zipPath);
    // addRandomSuffix explicitly true - @vercel/blob@2.x's own default is
    // false (verified against its type defs, despite an earlier assumption
    // here that it defaulted to true), which would silently overwrite the
    // SAME url on every re-run. Vercel Blob is a CDN-backed store built
    // around content at a URL being immutable, so overwriting risks serving
    // a stale cached zip for a while with no reliable way to
    // force-invalidate it. Every re-run instead gets a genuinely new URL;
    // updating a template means pasting that new URL into
    // template-scaffolds.js (a one-line, version-controlled change - same
    // review/deploy path as any other code change, with a clean git history
    // of when each template's shipped content last changed).
    const blob = await put(`templates/${slug}.zip`, buffer, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    console.log(`[${slug}] uploaded to Vercel Blob: ${blob.url}`);
    await updateScaffoldUrl(slug, blob.url);
  } else {
    console.log(
      `[${slug}] BLOB_READ_WRITE_TOKEN not set - zip left on disk only. ` +
        `Upload it manually and paste the resulting URL into template-scaffolds.js's TEMPLATE_SCAFFOLD_BLOB_URLS["${slug}"].`
    );
  }

  return { buildDir, zipPath };
}

function zipDirectory(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const output = fssync.createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

const slug = process.argv[2];
if (!slug) usageError("Missing <slug> argument.");

packageTemplate(slug).catch((error) => {
  console.error(error);
  process.exit(1);
});
