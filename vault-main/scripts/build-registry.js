import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, "../../registry/effects");
const OUTPUT_PATH = path.join(__dirname, "../public/r");
// Same filesystem as OUTPUT_PATH (both under public/) so the final swap can
// use fs.renameSync, which is atomic on POSIX - a crash mid-build leaves
// this directory behind (cleaned up at the start of the next run) but never
// leaves OUTPUT_PATH itself in a partial state.
const TMP_OUTPUT_PATH = path.join(__dirname, "../public/r.tmp");
const PUBLIC_PATH = path.join(__dirname, "../public");
const PUBLIC_ASSET_REGEX =
  /(?<![\w])["'`]((?:\/(?:assets|models|valley|601|svgs|img)\/[^"'`)\s]+)|(?:\/(?:showreel|eye-loop|hyperiux-wordmark|hyperiux)\.(?:mp4|svg)))["'`]/g;

// Controls the order categories appear in the listing.
// Categories not listed here will appear at the end alphabetically.
const CATEGORY_ORDER = [
  "scroll",
  "cursor",
  "backgrounds",
  "transitions",
  "text",
  "buttons",
  "carousels",
  "components",
  "navigation",
  "loaders",
  "webgl",
];

function toPascalCase(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function detectExport(content, preferredName) {
  const namedExportRegex = /export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g;
  const namedExports = [...content.matchAll(namedExportRegex)].map((match) => match[1]);

  const defaultNamed = content.match(
    /export\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/
  );

  // export default SomeIdentifier; -- a component declared earlier in the
  // file (const/function) and re-exported as default by reference, rather
  // than inline. Missing this pattern was the root cause of the
  // animated-faq mis-detection (it picked up an unrelated helper export
  // instead).
  const defaultIdentifier = content.match(
    /export\s+default\s+([A-Za-z_$][\w$]*)\s*;/
  );

  const preferredLower = preferredName?.toLowerCase();
  const namedMatch = namedExports.find(
    (name) => name.toLowerCase() === preferredLower
  );

  // A named export matching the effect's own name wins outright, even if a
  // default export also exists elsewhere in the file (helper exports are
  // common alongside the main component). Case-insensitive so acronym
  // casing (e.g. source "AnimatedFAQ" vs toPascalCase's "AnimatedFaq")
  // still matches instead of silently falling through.
  if (namedMatch) {
    return {
      exportName: namedMatch,
      exportKind: "named",
    };
  }

  if (defaultNamed) {
    return {
      exportName: defaultNamed[1],
      exportKind: "default",
    };
  }

  if (defaultIdentifier) {
    return {
      exportName: defaultIdentifier[1],
      exportKind: "default",
    };
  }

  if (/export\s+default\b/.test(content)) {
    return {
      exportName: preferredName,
      exportKind: "default",
    };
  }

  const exportList = content.match(/export\s*\{([^}]+)\}/);
  if (exportList) {
    const exportedNames = exportList[1]
      .split(",")
      .map((entry) => entry.trim().split(/\s+as\s+/).pop()?.trim())
      .filter(Boolean);

    const listMatch = exportedNames.find(
      (name) => name.toLowerCase() === preferredLower
    );

    if (listMatch) {
      return { exportName: listMatch, exportKind: "named" };
    }

    if (exportedNames.length === 1) {
      return { exportName: exportedNames[0], exportKind: "named" };
    }

    if (exportedNames.length > 1) {
      throw new Error(
        `Ambiguous export for "${preferredName}": "export { ... }" lists multiple ` +
          `names [${exportedNames.join(", ")}] and none match the expected export ` +
          `name. Add exportName/exportKind explicitly to this effect's registry.json.`
      );
    }
  }

  // Exactly one named export with no preferred-name match is unambiguous --
  // there's only one thing it could be. More than one is a guess, so fail
  // the build instead of silently picking namedExports[0] (the bug that
  // shipped animated-faq with exportName "FAQGroup" instead of "AnimatedFAQ").
  if (namedExports.length === 1) {
    return {
      exportName: namedExports[0],
      exportKind: "named",
    };
  }

  if (namedExports.length > 1) {
    throw new Error(
      `Ambiguous export for "${preferredName}": found multiple named exports ` +
        `[${namedExports.join(", ")}] and none match the expected export name ` +
        `"${preferredName}". Add exportName/exportKind explicitly to this effect's registry.json.`
    );
  }

  return null;
}

function collectPublicAssets(fileContents) {
  const seen = new Set();
  const assets = [];

  for (const file of fileContents) {
    for (const match of file.content.matchAll(PUBLIC_ASSET_REGEX)) {
      const publicPath = match[1].split(/[?#]/)[0];
      if (seen.has(publicPath)) continue;
      seen.add(publicPath);

      const sourcePath = path.join(PUBLIC_PATH, publicPath.slice(1));
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) continue;

      assets.push({
        path: publicPath.slice(1),
        type: "registry:asset",
        target: `public/${publicPath.slice(1)}`,
        source: publicPath,
      });
    }
  }

  return assets;
}

async function buildRegistry() {
  console.log("Building registry...");

  // Clear any stale temp dir left behind by a previously killed/failed run,
  // then build entirely into it. OUTPUT_PATH itself is untouched until the
  // atomic swap at the very end of a fully successful run.
  fs.rmSync(TMP_OUTPUT_PATH, { recursive: true, force: true });
  fs.mkdirSync(TMP_OUTPUT_PATH, { recursive: true });

  const index = {
    items: [],
  };

  // Walk through registry directories, sorted by CATEGORY_ORDER
  const allCategories = fs.readdirSync(REGISTRY_PATH);
  const categories = [
    ...CATEGORY_ORDER.filter((c) => allCategories.includes(c)),
    ...allCategories
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort(),
  ];

  for (const category of categories) {
    const categoryPath = path.join(REGISTRY_PATH, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    // Sort effects within category by optional `order` field in registry.json (ascending), then alphabetically
    const effectDirs = fs.readdirSync(categoryPath);
    const effects = effectDirs.sort((a, b) => {
      const aJson = path.join(categoryPath, a, "registry.json");
      const bJson = path.join(categoryPath, b, "registry.json");
      const aOrder = fs.existsSync(aJson)
        ? (JSON.parse(fs.readFileSync(aJson, "utf-8")).order ?? 99)
        : 99;
      const bOrder = fs.existsSync(bJson)
        ? (JSON.parse(fs.readFileSync(bJson, "utf-8")).order ?? 99)
        : 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.localeCompare(b);
    });

    for (const effect of effects) {
      const effectPath = path.join(categoryPath, effect);
      if (!fs.statSync(effectPath).isDirectory()) continue;

      const registryJsonPath = path.join(effectPath, "registry.json");
      if (!fs.existsSync(registryJsonPath)) {
        console.warn(`No registry.json found for ${effect}, skipping...`);
        continue;
      }

      // Read registry metadata
      const registryJson = JSON.parse(fs.readFileSync(registryJsonPath, "utf-8"));

      // previewUrl must always resolve to the effect's real demo route.
      // Catches drift like "/border-beam" or "/webgl/fractal-glass" before
      // it ships, instead of leaving a 404'ing link live.
      const expectedPreviewUrl = `/demo/${registryJson.name}`;
      if (registryJson.previewUrl && registryJson.previewUrl !== expectedPreviewUrl) {
        throw new Error(
          `Invalid previewUrl for "${registryJson.name}" in ${registryJsonPath}: ` +
            `found "${registryJson.previewUrl}", expected "${expectedPreviewUrl}".`
        );
      }

      // Find component files (JS/JSX and CSS)
      const discoveredFiles = fs
        .readdirSync(effectPath)
        .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts") || f.endsWith(".jsx") || f.endsWith(".js") || f.endsWith(".css"))
        .filter((f) => f !== "registry.json");
      const registryFileEntries = Array.isArray(registryJson.files)
        ? registryJson.files.filter((file) => file.type !== "registry:asset")
        : [];
      const files = registryFileEntries.length
        ? registryFileEntries.map((file) => file.path)
        : discoveredFiles;

      const useSubfolder = registryJson.subfolder === true;
      const subfolderPrefix = useSubfolder ? `${registryJson.name}/` : "";

      const fileContents = files.map((fileName) => {
        const filePath = path.join(effectPath, fileName);
        const content = fs.readFileSync(filePath, "utf-8");
        const isCss = fileName.endsWith(".css");
        const isModuleCss = fileName.endsWith(".module.css");
        const registryFile = registryFileEntries.find((file) => file.path === fileName);

        return {
          path: fileName,
          type: registryFile?.type || (isCss ? "registry:style" : "registry:component"),
          target: registryFile?.target || (isCss
            ? isModuleCss
              ? `components/hyperiux/${subfolderPrefix}${fileName}`
              : `styles/${fileName}`
            : `components/hyperiux/${subfolderPrefix}${fileName}`),
          content,
        };
      });

      // Entry component first: effect detail "Component Code" and CLI import hint use files[0].
      const entryBase = registryJson.name;
      const preferredExportName = registryJson.exportName || toPascalCase(registryJson.name);
      fileContents.sort((a, b) => {
        const score = (entry) => {
          if (registryJson.main && entry.path === registryJson.main) return -100;
          if (registryJson.entry && entry.path === registryJson.entry) return -100;
          if (entry.path === `${entryBase}.tsx` || entry.path === `${entryBase}.ts` || entry.path === `${entryBase}.jsx` || entry.path === `${entryBase}.js`) return -90;
          if (entry.path === `${effect}.tsx` || entry.path === `${effect}.ts` || entry.path === `${effect}.jsx` || entry.path === `${effect}.js`) return -80;
          if (entry.path.endsWith(".css")) return 100;

          const baseName = entry.path.replace(/\.(tsx|ts|jsx|js|css)$/, "");
          const nameParts = new Set(entryBase.split("-").filter(Boolean));
          const overlap = baseName
            .split("-")
            .filter((part) => nameParts.has(part)).length;
          // Helper files (e.g. createSuspendedRaf) can have multiple named
          // exports that don't match the effect - treat as non-entry, don't throw.
          let hasExport = 20;
          try {
            hasExport = detectExport(entry.content, preferredExportName) ? 0 : 20;
          } catch {
            hasExport = 20;
          }

          return hasExport - overlap;
        };
        const d = score(a) - score(b);
        if (d !== 0) return d;
        return a.path.localeCompare(b.path);
      });

      const entryFile = fileContents.find((file) => file.type === "registry:component");
      // registry.json's own exportName/exportKind override short-circuits
      // before detectExport ever runs, so an effect that already declares
      // its export explicitly never depends on the entry file being
      // unambiguous (avoids the same throw-before-override-checked bug the
      // scoring pass above has).
      const exportInfo =
        !registryJson.exportName && entryFile
          ? detectExport(entryFile.content, preferredExportName)
          : null;
      const exportName = registryJson.exportName || exportInfo?.exportName;
      const exportKind = registryJson.exportKind || exportInfo?.exportKind;

      if (!exportName || !exportKind) {
        throw new Error(
          `Unable to detect public export for ${registryJson.name}. Add exportName/exportKind to ${registryJsonPath}.`
        );
      }

      const registryAssetFiles = Array.isArray(registryJson.files)
        ? registryJson.files.filter((file) => file.type === "registry:asset")
        : [];
      const assetFiles = registryFileEntries.length
        ? registryAssetFiles
        : collectPublicAssets(fileContents);

      // Resolve categories: support both legacy `category` string and new `categories` array
      const primaryCategory = registryJson.category || category;
      const categories_list = registryJson.categories
        ? registryJson.categories
        : [primaryCategory];

      if (!("tier" in registryJson) || registryJson.tier == null || registryJson.tier === "") {
        throw new Error(
          `Missing required "tier" field in ${registryJsonPath}. Every effect registry.json must declare an explicit tier.`
        );
      }

      const tier = registryJson.tier;
      const isPro = tier === "pro" || tier === "paid";

      // For pro effects, strip file content from the public JSON.
      // The CLI fetches full source via the authenticated /api/cli/effects/[slug] route.
      const publicFiles = isPro
        ? [...fileContents, ...assetFiles].map(({ content: _content, ...rest }) => rest)
        : [...fileContents, ...assetFiles];

      // title and description kept as fallbacks for the detail page when Sanity content is absent.
      // coverImage/videoUrl/previewUrl/addedAt now live in Sanity, but `tier` and `version` must
      // stay here: the CLI's fetchPublicEffect() reads `tier` straight off this file to decide
      // whether to fall through to the authenticated pro route (content is stripped above when
      // isPro), and reads `version`/`changelog` for `hyperiux outdated`/`diff`/`update`.
      const registryItem = {
        name: registryJson.name,
        type: registryJson.type || "registry:component",
        title: registryJson.title,
        description: registryJson.description,
        dependencies: registryJson.dependencies || [],
        registryDependencies: registryJson.registryDependencies || [],
        exportName,
        exportKind,
        tier,
        version: registryJson.version || "1.0.0",
        changelog: registryJson.changelog || [],
        ...(Array.isArray(registryJson.props) && registryJson.props.length
          ? { props: registryJson.props }
          : {}),
        ...(registryJson.remixer ? { remixer: registryJson.remixer } : {}),
        files: publicFiles,
      };

      // Write individual effect JSON
      const outputFile = path.join(TMP_OUTPUT_PATH, `${registryJson.name}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(registryItem, null, 2));
      console.log(`  Created ${registryJson.name}.json`);

      // category/categories kept for getEffectsByCategory() which drives per-category counts.
      // All other display fields (title, description, coverImage, videoUrl, addedAt,
      // previewUrl) are now sourced from Sanity and merged at runtime. `tier` stays -
      // the CLI's `list`/install-gating reads it straight off this index and has no
      // access to Sanity.
      index.items.push({
        name: registryJson.name,
        type: registryJson.type || "registry:component",
        category: primaryCategory,
        categories: categories_list,
        dependencies: registryJson.dependencies || [],
        registryDependencies: registryJson.registryDependencies || [],
        exportName,
        exportKind,
        version: registryJson.version || "1.0.0",
        tier,
      });
    }
  }

  // Write index
  const indexFile = path.join(TMP_OUTPUT_PATH, "index.json");
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  console.log("  Created index.json");

  // Atomic swap - only reached if every effect above processed without
  // throwing. OUTPUT_PATH is replaced in one rename, so readers never see a
  // partial mix of old and new output, and a crash before this point leaves
  // the previous OUTPUT_PATH completely untouched.
  fs.rmSync(OUTPUT_PATH, { recursive: true, force: true });
  fs.renameSync(TMP_OUTPUT_PATH, OUTPUT_PATH);

  console.log(`\nRegistry built successfully! ${index.items.length} effects.`);
}

buildRegistry().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
