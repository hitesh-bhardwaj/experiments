import fs from "fs";
import path from "path";
import { cache } from "react";
import { getEffectSlugAliases } from "./effect-slugs";

const PUBLIC_REGISTRY_CANDIDATES = [
  path.join(process.cwd(), "public/r"),
  path.join(process.cwd(), "vault-main/public/r"),
];

const PUBLIC_REGISTRY_PATH =
  PUBLIC_REGISTRY_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
  PUBLIC_REGISTRY_CANDIDATES[0];

const PRIVATE_REGISTRY_CANDIDATES = [
  path.join(process.cwd(), "registry/effects"),            // Vercel: cwd = repo root
  path.join(process.cwd(), "../registry/effects"),         // Vercel: cwd = vault-main
  path.join(process.cwd(), "vault-main/registry/effects"), // legacy fallback
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function isCodeFile(filePath = "") {
  return (
    filePath.endsWith(".js") ||
    filePath.endsWith(".jsx") ||
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".css") ||
    filePath.endsWith(".json")
  );
}

function getExistingPrivateRegistryRoot() {
  return PRIVATE_REGISTRY_CANDIDATES.find((candidate) =>
    fs.existsSync(candidate)
  );
}

export function getAllPrivateEffects() {
  const privateRoot = getExistingPrivateRegistryRoot();

  if (!privateRoot) return [];

  const effects = [];
  const categories = fs.readdirSync(privateRoot);

  for (const category of categories) {
    const categoryPath = path.join(privateRoot, category);

    if (!fs.statSync(categoryPath).isDirectory()) continue;

    for (const effectDirName of fs.readdirSync(categoryPath)) {
      const effectDir = path.join(categoryPath, effectDirName);
      const registryPath = path.join(effectDir, "registry.json");

      if (!fs.statSync(effectDir).isDirectory() || !fs.existsSync(registryPath)) {
        continue;
      }

      const registry = readJson(registryPath);

      effects.push({
        ...registry,
        categorySlug: registry.category || category,
        effectSlug: registry.name,
      });
    }
  }

  return effects;
}

// Effect detail pages call this indirectly 2-3x per request (once from
// generateMetadata, again from the page component, again from
// getEffectSource) - each call does a synchronous fs.readdirSync/statSync
// scan across every category directory to find one slug. cache() dedupes
// identical calls within a single request so that scan only happens once.
const findPrivateRegistryPath = cache(function findPrivateRegistryPath(slug) {
  const privateRoot = getExistingPrivateRegistryRoot();

  if (!privateRoot) {
    console.warn("No private registry root found.", {
      cwd: process.cwd(),
      checked: PRIVATE_REGISTRY_CANDIDATES,
    });

    return null;
  }

  const categories = fs.readdirSync(privateRoot);
  const slugAliases = getEffectSlugAliases(slug);

  for (const category of categories) {
    const categoryPath = path.join(privateRoot, category);

    if (!fs.statSync(categoryPath).isDirectory()) {
      continue;
    }

    for (const slugAlias of slugAliases) {
      const effectDir = path.join(categoryPath, slugAlias);
      const registryPath = path.join(effectDir, "registry.json");

      if (fs.existsSync(registryPath)) {
        return {
          effectDir,
          registryPath,
        };
      }
    }

    const effectDirs = fs.readdirSync(categoryPath);

    for (const effectDirName of effectDirs) {
      const effectDir = path.join(categoryPath, effectDirName);
      const registryPath = path.join(effectDir, "registry.json");

      if (
        !fs.statSync(effectDir).isDirectory() ||
        !fs.existsSync(registryPath)
      ) {
        continue;
      }

      const registry = readJson(registryPath);

      if (slugAliases.includes(registry.name)) {
        return {
          effectDir,
          registryPath,
        };
      }
    }
  }

  console.warn(`Private registry not found for "${slug}".`, {
    privateRoot,
  });

  return null;
});

function attachPrivateFileContent(effect, effectDir) {
  // If files list is empty (source registry.json has no files key),
  // discover them by scanning the effect directory - same logic as the build script.
  const files =
    effect.files && effect.files.length > 0
      ? effect.files
      : fs
          .readdirSync(effectDir)
          .filter(
            (f) =>
              (f.endsWith(".tsx") ||
                f.endsWith(".ts") ||
                f.endsWith(".jsx") ||
                f.endsWith(".js") ||
                f.endsWith(".css")) &&
              f !== "registry.json"
          )
          .map((fileName) => {
            const isCss = fileName.endsWith(".css");
            const isModuleCss = fileName.endsWith(".module.css");
            return {
              path: fileName,
              type: isCss ? "registry:style" : "registry:component",
              target: isCss
                ? isModuleCss
                  ? `components/hyperiux/${fileName}`
                  : `styles/${fileName}`
                : `components/hyperiux/${fileName}`,
              targetPath: isCss
                ? isModuleCss
                  ? `components/hyperiux/${fileName}`
                  : `styles/${fileName}`
                : `components/hyperiux/${fileName}`,
            };
          });

  return {
    ...effect,
    files: files.map((file) => {
      if (file.type === "registry:asset") {
        return file;
      }

      const sourcePath = path.join(effectDir, file.path);

      if (!fs.existsSync(sourcePath)) {
        console.warn(`Private registry source file missing: ${sourcePath}`);
        return file;
      }

      if (!isCodeFile(sourcePath)) {
        return file;
      }

      return {
        ...file,
        content: fs.readFileSync(sourcePath, "utf-8"),
      };
    }),
  };
}

export function getRegistryIndex() {
  const indexPath = path.join(PUBLIC_REGISTRY_PATH, "index.json");
  const content = fs.readFileSync(indexPath, "utf-8");

  return JSON.parse(content);
}

export function getEffectTierCounts() {
  const items = getRegistryIndex()?.items || [];

  return items.reduce(
    (counts, effect) => {
      if (effect.tier === "pro") {
        counts.pro += 1;
      } else {
        counts.free += 1;
      }

      return counts;
    },
    { free: 0, pro: 0 }
  );
}

// Kept on the private registry path because it is used by account-plan
// messaging that should reflect install/source access, not only listing data.
export function getFreeEffectsCount() {
  return getAllPrivateEffects().filter((effect) => effect.tier !== "pro").length;
}

// Metadata only - never reads Pro source file contents off disk. Safe to
// call before any auth/plan check (e.g. generateMetadata, or to compute
// isLocked before deciding whether the caller is even allowed to see source).
export function getEffectMetadata(slug) {
  const privateMatch = findPrivateRegistryPath(slug);
  const publicEffect = getPublicEffectBySlug(slug);

  if (privateMatch) {
    const privateEffect = readJson(privateMatch.registryPath);
    return {
      ...publicEffect,
      ...privateEffect,
      categories: privateEffect.categories || publicEffect?.categories,
      coverImage: privateEffect.coverImage ?? publicEffect?.coverImage,
      videoUrl: privateEffect.videoUrl ?? publicEffect?.videoUrl,
    };
  }

  return publicEffect;
}

// Attaches Pro source file contents - only call this after confirming the
// requester is authorized (isLocked === false). Never pass this result to a
// client component prop for a locked/unauthorized request.
export function getEffectSource(slug) {
  const privateMatch = findPrivateRegistryPath(slug);

  if (!privateMatch) {
    return getPublicEffectBySlug(slug);
  }

  const publicEffect = getPublicEffectBySlug(slug);
  const privateEffect = readJson(privateMatch.registryPath);
  const effect = {
    ...publicEffect,
    ...privateEffect,
    categories: privateEffect.categories || publicEffect?.categories,
    coverImage: privateEffect.coverImage ?? publicEffect?.coverImage,
    videoUrl: privateEffect.videoUrl ?? publicEffect?.videoUrl,
  };

  return attachPrivateFileContent(effect, privateMatch.effectDir);
}

// Single content-shaping function for both Pro-effect delivery APIs (CLI
// route and web route) - parameterize on slug only, since both callers need
// the identical response shape. Auth is the caller's job (getEffectAccessDecision
// in effect-access.js); call this only after confirming access.
export function buildEffectDeliveryPayload(slug) {
  const effect = getEffectSource(slug);

  if (!effect) return null;

  return {
    name: effect.name,
    type: effect.type,
    title: effect.title,
    description: effect.description,
    category: effect.category,
    categories: effect.categories || [effect.category || "components"],
    tier: effect.tier || "free",
    version: effect.version || "1.0.0",
    changelog: effect.changelog || [],
    dependencies: effect.dependencies || [],
    registryDependencies: effect.registryDependencies || [],
    exportName: effect.exportName,
    exportKind: effect.exportKind || "named",
    previewUrl: effect.previewUrl,
    coverImage: effect.coverImage,
    videoUrl: effect.videoUrl,
    files: (effect.files || []).map((file) => ({
      path: file.path,
      target: file.target,
      targetPath: file.target || file.targetPath || file.path,
      type: file.type,
      source: file.source,
      encoding: file.encoding,
      content: file.content,
    })),
  };
}

export function getPublicEffectBySlug(slug) {
  for (const slugAlias of getEffectSlugAliases(slug)) {
    const publicEffectPath = path.join(PUBLIC_REGISTRY_PATH, `${slugAlias}.json`);

    if (fs.existsSync(publicEffectPath)) {
      return readJson(publicEffectPath);
    }
  }

  return null;
}

export function getAllEffectSlugs() {
  const index = getRegistryIndex();

  return index.items.map((item) => item.name);
}

export function getEffectsByCategory() {
  const index = getRegistryIndex();
  const categories = {};

  for (const item of index.items) {
    const cats = item.categories?.length
      ? item.categories
      : [item.category || "other"];

    for (const cat of cats) {
      if (!categories[cat]) {
        categories[cat] = [];
      }

      categories[cat].push(item);
    }
  }

  return categories;
}

export function getEffectCode(slug) {
  const effect = getEffectSource(slug);

  if (!effect || !effect.files || effect.files.length === 0) {
    return null;
  }

  const primary =
    effect.files.find((file) => file.path === `${slug}.tsx`) ||
    effect.files.find((file) => file.path === `${slug}.ts`) ||
    effect.files.find((file) => file.path === `${slug}.jsx`) ||
    effect.files.find((file) => file.path === `${slug}.js`) ||
    effect.files.find((file) => file.path.endsWith(".tsx")) ||
    effect.files.find((file) => file.path.endsWith(".ts")) ||
    effect.files.find((file) => file.path.endsWith(".jsx")) ||
    effect.files.find((file) => file.path.endsWith(".js")) ||
    effect.files[0];

  return primary?.content ?? null;
}
