import fs from "node:fs/promises";
import path from "node:path";
import { TEMPLATES } from "@/lib/mock-templates";

// The full-page desktop design built from a template's Figma exports
// (scripts/build-exploded-manifest.mjs), for the card and corridor hover.
export async function readFullShot(slug) {
  try {
    const file = path.join(process.cwd(), "public/assets/templates/templates-exploded", slug, "manifest.json");
    return JSON.parse(await fs.readFile(file, "utf8")).full || null;
  } catch {
    return null;
  }
}

// Every template in the catalogue, with its full-page shot
export async function getTemplatesWithShots() {
  const fullShots = await Promise.all(TEMPLATES.map((template) => readFullShot(template.slug)));
  return TEMPLATES.map((template, i) => ({ ...template, fullShot: fullShots[i] }));
}
