#!/usr/bin/env node
/**
 * Builds the exploded-view manifest for a template from its section designs
 * exported from Figma. The /templates/[slug] page reads it.
 *
 * 1. In Figma, export each section of the homepage as its own frame image
 *    (PNG or JPG, 1x or 2x), one folder per device you have designs for:
 *
 *      design/templates-exploded/<slug>/desktop/01-hero.png
 *      design/templates-exploded/<slug>/desktop/02-about.png
 *      design/templates-exploded/<slug>/phone/01-hero.png
 *
 *    Devices: desktop, tablet, phone (any you have). Files are stacked in
 *    file-name order, top to bottom. The name after the number becomes the
 *    layer's label, matched to its name and notes in
 *    src/app/(app)/(workspace)/templates/[slug]/template-sections.js.
 *
 * 2. node scripts/build-exploded-manifest.mjs <slug> [<slug> ...]
 *
 * Writes web-sized WebP copies and manifest.json to
 * public/assets/templates-exploded/<slug>/, replacing what was there, plus
 * full-desktop.webp: the desktop sections stacked into one page, which the
 * listing card scrolls through on hover.
 */

import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "design/templates-exploded");
const OUT = path.join(ROOT, "public/assets/templates-exploded");
const DEVICES = ["desktop", "tablet", "phone"];
// Width of the saved images: enough for the 3D slabs, small enough to load fast.
const OUT_WIDTH = { desktop: 1200, tablet: 820, phone: 600 };
const IMAGE = /\.(png|jpe?g|webp)$/i;
const FULL_WIDTH = 720; // the listing card's full-page image

const labelOf = (file) =>
  path
    .basename(file, path.extname(file))
    .replace(/^\d+[\s._-]*/, "") // "01-hero" -> "hero"
    .replace(/[_-]+/g, " ")
    .trim();

async function build(slug) {
  const manifest = { slug, source: "figma", devices: {} };
  const outDir = path.join(OUT, slug);
  // Clear only what this script (or the old live-page capture) generated.
  for (const old of [...DEVICES, ...DEVICES.map((d) => `${d}.webp`), "manifest.json", "full-desktop.webp"]) {
    await rm(path.join(outDir, old), { recursive: true, force: true });
  }

  for (const device of DEVICES) {
    const dir = path.join(SOURCE, slug, device);
    const files = await readdir(dir).then((f) => f.filter((n) => IMAGE.test(n)).sort(), () => []);
    if (!files.length) continue;
    await mkdir(path.join(outDir, device), { recursive: true });

    const sections = [];
    for (const [i, file] of files.entries()) {
      const name = labelOf(file) || `Section ${i + 1}`;
      const outName = `${String(i + 1).padStart(2, "0")}-${name.toLowerCase().replace(/\s+/g, "-")}.webp`;
      const { data, info } = await sharp(path.join(dir, file))
        .resize({ width: OUT_WIDTH[device], withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      await writeFile(path.join(outDir, device, outName), data);
      sections.push({ name, src: `/assets/templates-exploded/${slug}/${device}/${outName}`, width: info.width, height: info.height });
    }
    manifest.devices[device] = { sections };
    console.log(`${slug} · ${device}: ${sections.length} sections`);

    if (device === "desktop") {
      // Stack the sections at one width into a single full page.
      const parts = await Promise.all(
        files.map((file) => sharp(path.join(dir, file)).resize({ width: FULL_WIDTH }).toBuffer({ resolveWithObject: true })),
      );
      const height = parts.reduce((sum, p) => sum + p.info.height, 0);
      let top = 0;
      const composite = parts.map((p) => {
        const layer = { input: p.data, left: 0, top };
        top += p.info.height;
        return layer;
      });
      const full = await sharp({ create: { width: FULL_WIDTH, height, channels: 3, background: "#ffffff" } })
        .composite(composite)
        .webp({ quality: 78 })
        .toBuffer();
      await writeFile(path.join(outDir, "full-desktop.webp"), full);
      manifest.full = { src: `/assets/templates-exploded/${slug}/full-desktop.webp`, width: FULL_WIDTH, height };
    }
  }

  if (!Object.keys(manifest.devices).length) {
    throw new Error(`No exports found in ${path.relative(ROOT, path.join(SOURCE, slug))}/<device>/`);
  }
  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error("Usage: node scripts/build-exploded-manifest.mjs <slug> [<slug> ...]");
  process.exit(1);
}
for (const slug of slugs) await build(slug);
