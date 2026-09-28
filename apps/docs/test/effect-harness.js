import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const REGISTRY_INDEX = path.join(REPO_ROOT, "registry/index.json");

// jsdom has no GPU - a real WebGL context isn't available, and faking one
// well enough to satisfy three.js's capability probing risks masking real
// bugs behind a wrong-but-passing mock. Effects depending on "three" (any
// category - several cursor/background effects use it outside the "webgl"
// folder) get an import-only contract check instead of a full render; see
// registry-effects.render.test.jsx.
function usesThreeJs(entry) {
  return Boolean(entry.dependencies?.includes("three"));
}

export function getRegistryEffects() {
  const index = JSON.parse(fs.readFileSync(REGISTRY_INDEX, "utf8"));
  return index.map((entry) => {
    const dir = path.dirname(path.join(REPO_ROOT, entry.registryPath));
    return {
      name: entry.name,
      title: entry.title,
      category: entry.category,
      tier: entry.tier,
      exportName: entry.exportName,
      exportKind: entry.exportKind,
      mainPath: path.join(dir, entry.main),
      skipRender: usesThreeJs(entry),
    };
  });
}
