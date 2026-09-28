#!/usr/bin/env node
/**
 * Injects `generateMetadata` into every demo/[effectSlug]/page.js.
 *
 * - Server component pages  → adds import + generateMetadata export in-place.
 * - Client component pages  → renames page.js → _DemoContent.jsx and creates a
 *   thin server wrapper page.js that re-exports the content + metadata.
 */

const fs = require("fs");
const path = require("path");

const demoDir = path.join(__dirname, "../src/app/demo");
const METADATA_IMPORT =
  `import { getDemoPageMetadata } from "@/lib/demo-metadata";\n`;

const CLIENT_PAGES = new Set([
  "blur-text",
  "circular-split-roll",
  "grid-lift",
]);

function buildMetadataExport(effectSlug) {
  return (
    `\nexport async function generateMetadata() {\n` +
    `  return getDemoPageMetadata("${effectSlug}");\n` +
    `}\n`
  );
}

function insertAfterLastImport(source, toInsert) {
  const lines = source.split("\n");
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i].trim())) lastImportLine = i;
  }
  if (lastImportLine === -1) return toInsert + source;
  lines.splice(lastImportLine + 1, 0, toInsert);
  return lines.join("\n");
}

const dirs = fs
  .readdirSync(demoDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

let updated = 0;
let skipped = 0;

for (const dir of dirs) {
  const pagePath = path.join(demoDir, dir, "page.js");
  if (!fs.existsSync(pagePath)) { skipped++; continue; }

  let source = fs.readFileSync(pagePath, "utf8");

  if (source.includes("generateMetadata")) { skipped++; continue; }

  const effectSlug = dir;

  // ── Client component page ──────────────────────────────────────────────────
  if (CLIENT_PAGES.has(effectSlug)) {
    const contentPath = path.join(demoDir, dir, "_DemoContent.jsx");
    fs.renameSync(pagePath, contentPath);

    const wrapperSource =
      `import { getDemoPageMetadata } from "@/lib/demo-metadata";\n` +
      `import DemoContent from "./_DemoContent";\n` +
      `\n` +
      `export async function generateMetadata() {\n` +
      `  return getDemoPageMetadata("${effectSlug}");\n` +
      `}\n` +
      `\n` +
      `export default function Page() {\n` +
      `  return <DemoContent />;\n` +
      `}\n`;

    fs.writeFileSync(pagePath, wrapperSource);
    console.log(`[client-wrap] ${dir}`);
    updated++;
    continue;
  }

  // ── Server component page ──────────────────────────────────────────────────
  const withImport = insertAfterLastImport(source, METADATA_IMPORT);
  const withExport = withImport + buildMetadataExport(effectSlug);
  fs.writeFileSync(pagePath, withExport);
  console.log(`[server]      ${dir}`);
  updated++;
}

console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
