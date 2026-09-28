#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(process.env.HYPERIUX_WORKFLOW_ROOT || path.join(__dirname, ".."));
const DOCS_COMPONENTS_DIR = path.join(ROOT, "apps", "docs", "src", "components");
const REGISTRY_EFFECTS_DIR = path.join(ROOT, "registry", "effects");
const ROOT_INDEX_FILE = path.join(ROOT, "registry", "index.json");
const DOCS_PUBLIC_REGISTRY_DIR = path.join(ROOT, "apps", "docs", "public", "r");
const EFFECT_SLUGS_FILE = path.join(ROOT, "apps", "docs", "src", "lib", "effect-slugs.js");

const COMMANDS = new Set(["new", "sync", "rename", "move", "delete", "diff", "revert", "verify"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

// Docs previews use the private R2 asset bucket, but distributed registry code
// must point at images anyone can load after installing. Rewrites happen on the
// way into registry/, so docs keep R2 and the shipped effect ships public URLs.
const R2_IMAGE_HOST_RE =
  /https:\/\/pub-[a-z0-9]+\.r2\.dev\/[^"'`\s)]+\.(?:jpe?g|png|webp|avif|gif)/gi;
// Which public placeholder service the rewritten URLs point at. Override per
// run with --image-source, or set a different default here; add a provider by
// giving it an entry that maps a 0-based index to a URL.
const PUBLIC_IMAGE_SOURCES = {
  picsum: (index) => `https://picsum.photos/seed/${index + 1}/800/600`,
  unsplash: (index) =>
    `https://images.unsplash.com/photo-${UNSPLASH_PHOTO_IDS[index % UNSPLASH_PHOTO_IDS.length]}?w=800&h=600&fit=crop`,
  placeholder: (index) =>
    `https://placehold.co/800x600?text=Image+${index + 1}`,
};
const DEFAULT_IMAGE_SOURCE = "picsum";

// Stable, permissively-licensed Unsplash photo ids used when --image-source=unsplash.
const UNSPLASH_PHOTO_IDS = [
  "1506744038136-46273834b3fb",
  "1494548162494-384bba4ab999",
  "1470071459604-3b5ec3a7fe05",
  "1447752875215-b2761acb3c5d",
  "1433086966358-54859d0ed716",
  "1439066615861-d1af74d74000",
  "1426604966848-d7adac402bff",
  "1472214103451-9374bd1c798e",
  "1441974231531-c6227db76b6e",
  "1518495973542-4542c06a5843",
];

function resolveImageSource(options = {}) {
  const name = options.imageSource || DEFAULT_IMAGE_SOURCE;
  const source = PUBLIC_IMAGE_SOURCES[name];
  if (!source) {
    fail(
      `Unknown --image-source "${name}". Available: ${Object.keys(PUBLIC_IMAGE_SOURCES).join(", ")}.`
    );
  }
  return source;
}

// Same URL always maps to the same replacement, so a list of N distinct images
// stays N distinct images and repeats stay repeats.
function toDistributableContent(relativePath, buffer, imageSource = PUBLIC_IMAGE_SOURCES[DEFAULT_IMAGE_SOURCE]) {
  if (!/\.(tsx?|jsx?)$/i.test(relativePath)) return buffer;
  const text = buffer.toString("utf8");
  if (!R2_IMAGE_HOST_RE.test(text)) {
    R2_IMAGE_HOST_RE.lastIndex = 0;
    return buffer;
  }
  R2_IMAGE_HOST_RE.lastIndex = 0;
  const seen = new Map();
  const out = text.replace(R2_IMAGE_HOST_RE, (url) => {
    if (!seen.has(url)) seen.set(url, imageSource(seen.size));
    return seen.get(url);
  });
  return Buffer.from(out, "utf8");
}
const EXCLUDED_FILE_RE = /(^Demo\.jsx$|\.demo\.jsx$|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|^README\.md$|\.md$)/i;
const PACKAGE_IMPORT_IGNORE = new Set([
  "react",
  "react-dom",
  "next",
  "node:fs",
  "node:path",
  "node:process",
  "node:url",
]);

function main() {
  const { command, options } = parseCli(process.argv.slice(2));

  if (!COMMANDS.has(command)) {
    fail(`Unknown command "${command}". Use one of: ${[...COMMANDS].join(", ")}`);
  }

  if (command === "new") return createNewComponent(options);
  if (command === "sync") return syncComponent(options);
  if (command === "rename") return renameComponent(options);
  if (command === "move") return moveComponent(options);
  if (command === "delete") return deleteComponent(options);
  if (command === "diff") return diffComponent(options);
  if (command === "revert") return revertComponent(options);
  if (command === "verify") return verifyComponent(options);
}

function parseCli(argv) {
  let command = argv[0];
  let rest = argv.slice(1);

  if (!command || command.startsWith("--")) {
    command = process.env.npm_lifecycle_event?.replace(/^component:/, "");
    rest = argv;
  }

  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) fail(`Unexpected argument "${arg}"`);

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = toCamelCase(rawKey);
    if (rawKey.startsWith("no-")) {
      options[toCamelCase(rawKey.slice(3))] = false;
      continue;
    }

    const next = rest[index + 1];
    if (inlineValue !== undefined) {
      options[key] = coerceValue(inlineValue);
    } else if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = coerceValue(next);
      index += 1;
    }
  }

  return { command, options };
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function createNewComponent(options) {
  const slug = requireOption(options, "slug");
  const category = requireOption(options, "category");
  const tier = requireOption(options, "tier");
  const title = requireOption(options, "title");
  const description = requireOption(options, "description");
  const version = options.version || "1.0.0";
  const date = options.date || today();
  const summary = options.summary || "Initial release";
  const docsDir = docsComponentDir(slug);
  const registryDir = registryComponentDir(category, slug);

  validateSlug(slug);
  validateVersion(version);
  validateCategory(category);
  validateTier(tier);
  requirePath(docsDir, `Docs component folder not found: ${relative(docsDir)}`);
  requirePath(path.join(ROOT, "apps", "docs", "scripts", "build-registry.js"), "Missing apps/docs registry build script.");
  requirePath(path.join(ROOT, "scripts", "build-registry.js"), "Missing root registry build script.");
  if (fs.existsSync(registryDir) && !options.overwrite) {
    fail(`Registry folder already exists: ${relative(registryDir)}. Use component:sync or pass --overwrite.`);
  }

  const files = discoverDistributableFiles(docsDir);
  const dependencies = parseList(options.dependencies) ?? detectDependencies(files, docsDir);
  const exportInfo = detectExportInfo(path.join(docsDir, options.main || "index.jsx"), options.exportName);
  const registryJson = makeRegistryJson({
    slug,
    version,
    title,
    description,
    category,
    tier,
    dependencies,
    date,
    summary,
    breaking: false,
    main: options.main || "index.jsx",
    exportName: options.exportName || exportInfo.exportName,
    exportKind: options.exportKind || exportInfo.exportKind,
    files: makeFileEntries(files, slug),
  });
  const packageJson = makePackageJson(registryJson, options.packageVersion || version);
  const freeMirror = freeMirrorPlan(options, tier);

  printDryRun("component:new", options, [
    ["docs source", relative(docsDir)],
    ["files", files.map((file) => file.relativePath).join(", ")],
    ["registry folder", relative(registryDir)],
    ["registry.json", JSON.stringify(registryJson, null, 2)],
    ["package.json", JSON.stringify(packageJson, null, 2)],
    ["free mirror", freeMirror ? relative(freeMirror.destDir) : "not required"],
    ["public registry command", "npm --prefix apps/docs run build:registry"],
    ["tarball command", "npm run build:registry"],
    ["verify command", `npm run component:verify -- --slug ${slug}`],
  ]);
  if (options.dryRun) return;

  ensureFreeMirrorReady(freeMirror, options);
  fs.rmSync(registryDir, { recursive: true, force: true });
  fs.mkdirSync(registryDir, { recursive: true });
  copyDistributableFiles(files, registryDir, resolveImageSource(options));
  writeJson(path.join(registryDir, "registry.json"), registryJson);
  writeJson(path.join(registryDir, "package.json"), packageJson);
  updateRootIndex(registryJson, category);
  syncFreeMirror(freeMirror, registryDir, options);
  runBuilds(options);
  if (!options.skipVerify) verifyComponent({ slug, freeRepoPath: options.freeRepoPath });
}

function syncComponent(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const current = findComponent(slug);
  if (!current) {
    const docsDir = docsComponentDir(slug);
    if (!fs.existsSync(docsDir)) {
      fail(`No existing registry entry or docs folder found for "${slug}". If this is a rename, use component:rename --from old-slug --to ${slug}.`);
    }
    fail(`No existing registry entry found for "${slug}". Use component:new for first-time distribution artifacts.`);
  }
  const docsDir = docsComponentDir(slug);
  requirePath(docsDir, `Docs component folder not found: ${relative(docsDir)}. If this is a rename, use component:rename --from ${slug} --to new-slug.`);

  const nextVersion = resolveSyncVersion(current.registry.version, options);
  const date = options.date || today();
  const shouldWriteChangelog = nextVersion !== current.registry.version;
  if (nextVersion !== current.registry.version && !options.summary) {
    fail("Missing required --summary when changing the component version.");
  }
  const files = discoverDistributableFiles(docsDir);
  const dependencies = parseList(options.dependencies) ?? detectDependencies(files, docsDir);
  const exportInfo = detectExportInfo(path.join(docsDir, current.registry.main || "index.jsx"), current.registry.exportName);
  const registryJson = {
    ...current.registry,
    version: nextVersion,
    dependencies,
    previewUrl: `/demo/${slug}`,
    importPath: `@/components/effects/${slug}`,
    target: `src/components/effects/${slug}`,
    main: current.registry.main || "index.jsx",
    exportName: options.exportName || current.registry.exportName || exportInfo.exportName,
    exportKind: options.exportKind || current.registry.exportKind || exportInfo.exportKind,
    files: makeFileEntries(files, slug),
    changelog: shouldWriteChangelog
      ? prependChangelog(current.registry.changelog, {
          version: nextVersion,
          date,
          summary: options.summary || "Synced component files",
          breaking: options.breaking ?? options.bump === "major",
        })
      : current.registry.changelog,
  };
  const packageJson = makePackageJson(registryJson, options.packageVersion || nextVersion, readJsonIfExists(path.join(current.dir, "package.json")));
  const staleFiles = listStaleRegistryFiles(current.dir, files);
  const freeMirror = freeMirrorPlan(options, registryJson.tier);

  printDryRun("component:sync", options, [
    ["current", `${current.category}/${slug}@${current.registry.version} (${registryJson.tier})`],
    ["next version", nextVersion],
    ["files copied", files.map((file) => file.relativePath).join(", ")],
    ["stale registry files", staleFiles.length ? staleFiles.map(relative).join(", ") : "none"],
    ["changelog entry", shouldWriteChangelog ? JSON.stringify(registryJson.changelog[0], null, 2) : "unchanged"],
    ["public registry command", "npm --prefix apps/docs run build:registry"],
    ["tarball command", "npm run build:registry"],
    ["free mirror", freeMirror ? relative(freeMirror.destDir) : "not required"],
  ]);
  if (options.dryRun) return;

  ensureFreeMirrorReady(freeMirror, options);
  if (options.prune) staleFiles.forEach((file) => fs.rmSync(file, { force: true }));
  fs.mkdirSync(current.dir, { recursive: true });
  copyDistributableFiles(files, current.dir, resolveImageSource(options));
  writeJson(path.join(current.dir, "registry.json"), registryJson);
  writeJson(path.join(current.dir, "package.json"), packageJson);
  updateRootIndex(registryJson, current.category);
  syncFreeMirror(freeMirror, current.dir, options);
  runBuilds(options);
  if (!options.skipVerify) verifyComponent({ slug, freeRepoPath: options.freeRepoPath });
}

function renameComponent(options) {
  const from = requireOption(options, "from");
  const to = requireOption(options, "to");
  validateSlug(from);
  validateSlug(to);
  const current = findComponent(from);
  if (!current) fail(`No registry entry found for "${from}".`);
  if (findComponent(to)) fail(`Target slug already exists: "${to}".`);

  const nextVersion = resolveNextVersion(current.registry.version, options);
  const date = options.date || today();
  const summary = requireOption(options, "summary");
  const destDir = registryComponentDir(current.category, to);
  if (fs.existsSync(destDir)) fail(`Target registry folder already exists: ${relative(destDir)}`);

  const registryJson = rewriteSlugMetadata({
    ...current.registry,
    name: to,
    version: nextVersion,
    changelog: prependChangelog(current.registry.changelog, {
      version: nextVersion,
      date,
      summary,
      breaking: options.breaking ?? options.bump === "major",
    }),
  }, from, to);
  const packageJson = makePackageJson(registryJson, options.packageVersion || nextVersion, readJsonIfExists(path.join(current.dir, "package.json")));
  const freeMirror = freeMirrorPlan(options, registryJson.tier);
  const docsFrom = docsComponentDir(from);
  const docsTo = docsComponentDir(to);

  printDryRun("component:rename", options, [
    ["current registry folder", relative(current.dir)],
    ["new registry folder", relative(destDir)],
    ["docs source rename", options.moveDocsSource ? `${relative(docsFrom)} -> ${relative(docsTo)}` : "not requested"],
    ["registry name", `${from} -> ${to}`],
    ["package name", `@hyperiux/${from} -> @hyperiux/${to}`],
    ["previewUrl", registryJson.previewUrl],
    ["importPath", registryJson.importPath],
    ["target", registryJson.target],
    ["alias", options.alias === false ? "not requested" : `${from} -> ${to}`],
    ["free mirror", freeMirror ? "required" : "not required"],
  ]);
  if (options.dryRun) return;

  ensureFreeMirrorReady(freeMirror, options);
  fs.renameSync(current.dir, destDir);
  writeJson(path.join(destDir, "registry.json"), registryJson);
  writeJson(path.join(destDir, "package.json"), packageJson);
  removeRootIndexEntry(from);
  updateRootIndex(registryJson, current.category);
  if (options.moveDocsSource) fs.renameSync(docsFrom, docsTo);
  if (options.alias !== false) addSlugAlias(from, to);
  syncFreeMirrorRename(freeMirror, current.category, from, to, destDir, options);
  runBuilds(options);
  if (!options.skipVerify) verifyComponent({ slug: to, freeRepoPath: options.freeRepoPath, renamedFrom: from, aliasExpected: options.alias !== false });
}

function moveComponent(options) {
  const slug = requireOption(options, "slug");
  const from = requireOption(options, "from");
  const to = requireOption(options, "to");
  validateSlug(slug);
  validateCategory(to);
  const current = findComponent(slug);
  if (!current) fail(`No registry entry found for "${slug}".`);
  if (current.category !== from) fail(`Current category is "${current.category}", not "${from}".`);
  const destDir = registryComponentDir(to, slug);
  if (fs.existsSync(destDir)) fail(`Destination registry folder already exists: ${relative(destDir)}`);

  const nextVersion = resolveNextVersion(current.registry.version, options);
  const registryJson = {
    ...current.registry,
    category: to,
    categories: current.registry.categories?.map((category) => (category === from ? to : category)),
    version: nextVersion,
    changelog: prependChangelog(current.registry.changelog, {
      version: nextVersion,
      date: options.date || today(),
      summary: requireOption(options, "summary"),
      breaking: options.breaking ?? options.bump === "major",
    }),
  };
  const packageJson = makePackageJson(registryJson, options.packageVersion || nextVersion, readJsonIfExists(path.join(current.dir, "package.json")));
  const freeMirror = freeMirrorPlan(options, registryJson.tier);

  printDryRun("component:move", options, [
    ["current registry folder", relative(current.dir)],
    ["destination registry folder", relative(destDir)],
    ["category", `${from} -> ${to}`],
    ["registryPath", `registry/effects/${to}/${slug}/registry.json`],
    ["free mirror", freeMirror ? "required" : "not required"],
  ]);
  if (options.dryRun) return;

  ensureFreeMirrorReady(freeMirror, options);
  fs.renameSync(current.dir, destDir);
  writeJson(path.join(destDir, "registry.json"), registryJson);
  writeJson(path.join(destDir, "package.json"), packageJson);
  updateRootIndex(registryJson, to);
  syncFreeMirrorMove(freeMirror, from, to, slug, destDir, options);
  runBuilds(options);
  if (!options.skipVerify) verifyComponent({ slug, freeRepoPath: options.freeRepoPath, movedFrom: from, movedTo: to });
}

function deleteComponent(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const current = findComponent(slug);
  if (!current) fail(`No registry entry found for "${slug}".`);

  const docsDir = docsComponentDir(slug);
  const publicFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, `${slug}.json`);
  const distFiles = listDistFilesForSlug(slug);
  const freeMirror = freeMirrorPlan({ ...options, slug, category: current.category }, current.registry.tier);
  const mirrorDir = freeMirror
    ? path.join(freeMirror.repoPath, "registry", "effects", current.category, slug)
    : null;
  const existingPaths = [
    current.dir,
    docsDir,
    publicFile,
    ...distFiles,
    ...(mirrorDir ? [mirrorDir] : []),
  ].filter((file) => fs.existsSync(file));

  console.log("component:delete");
  console.log("\ncomponent:");
  console.log(`${current.category}/${slug} (${current.registry.tier})`);
  console.log("\npaths to delete:");
  console.log(existingPaths.length ? existingPaths.map(relativeOrAbsolute).join("\n") : "none");
  console.log("\nmetadata to update:");
  console.log([
    relative(ROOT_INDEX_FILE),
    relative(path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json")),
    relative(path.join(ROOT, "registry", "dist", "registry-index.json")),
    relative(EFFECT_SLUGS_FILE),
    ...(freeMirror ? [path.join(freeMirror.repoPath, "registry", "index.json")] : []),
  ].join("\n"));
  console.log("\nNote: this permanently deletes the docs source folder and registry artifacts for the slug.");

  if (!options.yes) {
    console.log("\nNo files changed. Re-run with --yes to apply this deletion.");
    return;
  }

  ensureFreeMirrorReady(freeMirror, options);
  for (const file of existingPaths) {
    fs.rmSync(file, { recursive: true, force: true });
  }
  removeRootIndexEntry(slug);
  removePublicIndexEntry(slug);
  removeDistIndexEntries(slug);
  removeSlugAliasGroup(slug);
  if (freeMirror) {
    removeMirrorIndexEntry(freeMirror.repoPath, slug);
    runMirrorBuilds(freeMirror.repoPath);
  }
  if (!options.skipBuild) {
    runBuilds({ ...options, skipVerify: true });
  }

  console.log(`Deleted component ${slug}.`);
}

function diffComponent(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const current = findComponent(slug);
  if (!current) fail(`No registry entry found for "${slug}".`);

  const docsDir = docsComponentDir(slug);
  const registryJson = current.registry;
  const pkg = readJsonIfExists(path.join(current.dir, "package.json"));
  const publicJson = readJsonIfExists(path.join(DOCS_PUBLIC_REGISTRY_DIR, `${slug}.json`));
  const rootEntry = readRootIndex().find((entry) => entry.name === slug);
  const rows = [
    ["component", `${current.category}/${slug}`],
    ["versions", `registry=${registryJson.version || "missing"} package=${pkg?.version || "missing"} public=${publicJson?.version || "missing"} root=${rootEntry?.version || "missing"}`],
  ];

  if (fs.existsSync(docsDir)) {
    const docsFiles = discoverDistributableFiles(docsDir);
    rows.push(["docs vs registry files", formatFileDiff(compareSourceToRegistry(docsFiles, current.dir, resolveImageSource(options)))]);
  } else {
    rows.push(["docs source", `missing: ${relative(docsDir)}`]);
  }

  rows.push(["registry metadata", formatMetadataDiff(registryJson, pkg, publicJson, rootEntry)]);

  if (registryJson.tier === "free" && !options.skipFreeMirror) {
    const mirrorDir = path.join(resolveFreeRepoPath(options), "registry", "effects", current.category, slug);
    rows.push(["free mirror", fs.existsSync(mirrorDir) ? formatFileDiff(compareDirectories(current.dir, mirrorDir)) : `missing: ${mirrorDir}`]);
    rows.push(["free mirror index drift", formatFileDiff(findMirrorIndexDrift(resolveFreeRepoPath(options)))]);
  }

  rows.push(["distribution git changes", gitNameStatus(revertPathsForComponent(current, options)).join("\n") || "none"]);
  rows.push(["docs source git changes", gitNameStatus([docsDir]).join("\n") || "none"]);

  console.log("component:diff");
  for (const [label, value] of rows) {
    console.log(`\n${label}:`);
    console.log(value || "none");
  }
}

function revertComponent(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const current = findComponent(slug);
  if (!current) fail(`No registry entry found for "${slug}".`);

  const paths = revertPathsForComponent(current, options).filter((file) => fs.existsSync(file));
  const trackedPaths = paths.filter((file) => isGitTracked(file));
  const untrackedPaths = paths.filter((file) => !isGitTracked(file));

  if (!trackedPaths.length) {
    console.log(`No tracked revert paths found for ${slug}.`);
    if (untrackedPaths.length) {
      console.log("\nuntracked generated paths not restored:");
      console.log(untrackedPaths.map(relative).join("\n"));
    }
    return;
  }

  console.log("component:revert");
  console.log("\ntracked paths to restore from git:");
  console.log(trackedPaths.map(relative).join("\n"));
  if (untrackedPaths.length) {
    console.log("\nuntracked generated paths skipped:");
    console.log(untrackedPaths.map(relative).join("\n"));
  }
  console.log("\nNote: this restores tracked files only. It does not remove untracked generated files.");

  if (!options.yes) {
    console.log("\nNo files changed. Re-run with --yes to apply this restore.");
    return;
  }

  execFileSync("git", ["restore", "--", ...trackedPaths.map((file) => relative(file))], { cwd: ROOT, stdio: "inherit" });
  console.log(`Reverted tracked distribution${options.includeDocs ? " and docs source" : ""} files for ${slug}.`);
}

function verifyDiffCheckPaths(result, registry) {
  return [
    result.dir,
    ROOT_INDEX_FILE,
    path.join(DOCS_PUBLIC_REGISTRY_DIR, `${registry.name}.json`),
    path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json"),
    path.join(ROOT, "registry", "dist", "registry-index.json"),
    path.join(ROOT, "registry", "dist", `hyperiux-${registry.name}-${registry.version}.tgz`),
  ].filter((file) => fs.existsSync(file));
}

function verifyComponent(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const result = findComponent(slug);
  const errors = [];
  if (!result) fail(`No registry entry found for "${slug}".`);

  const registryFile = path.join(result.dir, "registry.json");
  const packageFile = path.join(result.dir, "package.json");
  const publicFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, `${slug}.json`);
  const publicIndexFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json");
  const registry = readJson(registryFile);
  const pkg = readJsonIfExists(packageFile);
  const publicJson = readJsonIfExists(publicFile);
  const publicIndex = readJsonIfExists(publicIndexFile);
  const rootEntry = readRootIndex().find((entry) => entry.name === slug);

  if (!fs.existsSync(registryFile)) errors.push(`Missing ${relative(registryFile)}`);
  if (!pkg) errors.push(`Missing ${relative(packageFile)}`);
  for (const file of registry.files || []) {
    if (file.type === "registry:asset") continue;
    if (!fs.existsSync(path.join(result.dir, file.path))) errors.push(`Missing registry file ${relative(path.join(result.dir, file.path))}`);
  }
  if (!publicJson) errors.push(`Missing ${relative(publicFile)}`);
  if (!publicIndex?.items?.some((item) => item.name === slug)) errors.push(`${relative(publicIndexFile)} does not contain "${slug}"`);
  if (!rootEntry) errors.push(`${relative(ROOT_INDEX_FILE)} does not contain "${slug}"`);
  if (rootEntry?.registryPath !== `registry/effects/${result.category}/${slug}/registry.json`) errors.push(`Root registryPath is stale for "${slug}"`);
  if (pkg?.version !== registry.version) errors.push(`package.json version ${pkg.version} does not match registry.json ${registry.version}`);
  if (publicJson?.version && publicJson.version !== registry.version) errors.push(`public registry version ${publicJson.version} does not match registry.json ${registry.version}`);

  const tarball = path.join(ROOT, "registry", "dist", `hyperiux-${slug}-${registry.version}.tgz`);
  if (!fs.existsSync(tarball)) errors.push(`Missing tarball ${relative(tarball)}`);

  if (registry.tier === "free" && !options.skipFreeMirror) {
    const freeDir = path.join(resolveFreeRepoPath(options), "registry", "effects", result.category, slug);
    if (!fs.existsSync(freeDir)) errors.push(`Missing free mirror folder ${freeDir}`);
    if (fs.existsSync(freeDir)) {
      const mirrorDiffs = compareDirectories(result.dir, freeDir);
      if (mirrorDiffs.length) errors.push(`Free mirror differs from source:\n${mirrorDiffs.join("\n")}`);
    }
    const mirrorDrift = findMirrorIndexDrift(resolveFreeRepoPath(options));
    if (mirrorDrift.length) errors.push(`Free mirror registry/index.json drift:\n${mirrorDrift.join("\n")}`);
  }
  if (registry.tier === "pro" && publicJson?.files?.some((file) => "content" in file)) {
    errors.push(`Pro public JSON still contains file content fields: ${relative(publicFile)}`);
  }
  if (options.renamedFrom) {
    if (findComponent(options.renamedFrom)) errors.push(`Old slug still exists as a primary registry item: ${options.renamedFrom}`);
    if (options.aliasExpected && !slugAliasExists(options.renamedFrom, slug)) errors.push(`Missing alias ${options.renamedFrom} -> ${slug}`);
  }
  if (options.movedFrom && fs.existsSync(registryComponentDir(options.movedFrom, slug))) {
    errors.push(`Old category folder still contains ${slug}`);
  }
  if (options.movedTo && !fs.existsSync(registryComponentDir(options.movedTo, slug))) {
    errors.push(`New category folder does not contain ${slug}`);
  }

  const diffCheckPaths = options.fullDiffCheck
    ? []
    : verifyDiffCheckPaths(result, registry);
  try {
    execFileSync("git", ["diff", "--check", ...(diffCheckPaths.length ? ["--", ...diffCheckPaths.map(relative)] : [])], {
      cwd: ROOT,
      stdio: "pipe",
    });
  } catch (error) {
    errors.push(`git diff --check failed:\n${String(error.stdout || error.stderr || error.message).trim()}`);
  }

  if (errors.length) fail(`Verification failed for "${slug}":\n- ${errors.join("\n- ")}`);
  console.log(`Verification passed for ${slug}.`);
}

function discoverDistributableFiles(sourceDir) {
  const allFiles = walkFiles(sourceDir)
    .map((filePath) => ({
      absolutePath: filePath,
      relativePath: slash(path.relative(sourceDir, filePath)),
      extension: path.extname(filePath),
    }))
    .filter((file) => SOURCE_EXTENSIONS.has(file.extension))
    .filter((file) => !EXCLUDED_FILE_RE.test(path.basename(file.relativePath)));

  const byRelative = new Map(allFiles.map((file) => [file.relativePath, file]));
  const missingImports = [];

  for (const file of allFiles.filter((entry) => entry.extension !== ".css")) {
    const content = fs.readFileSync(file.absolutePath, "utf8");
    for (const specifier of findImportSpecifiers(content).filter((value) => value.startsWith("."))) {
      const resolved = resolveLocalImport(path.dirname(file.absolutePath), specifier);
      if (!resolved) continue;
      const relativeImport = slash(path.relative(sourceDir, resolved));
      if (SOURCE_EXTENSIONS.has(path.extname(resolved)) && !byRelative.has(relativeImport)) {
        const matchingCaseFile = [...byRelative.keys()].find(
          (candidate) => candidate.toLowerCase() === relativeImport.toLowerCase()
        );
        if (matchingCaseFile) {
          missingImports.push(`${file.relativePath} imports ${relativeImport}, but the file is named ${matchingCaseFile}. Match the import casing exactly.`);
        } else {
          missingImports.push(`${file.relativePath} imports excluded file ${relativeImport}`);
        }
      }
    }
  }

  if (missingImports.length) fail(`Distributable file discovery found missing local imports:\n- ${missingImports.join("\n- ")}`);

  const INDEX_FILES = new Set(["index.tsx", "index.ts", "index.jsx", "index.js"]);
  const sorted = allFiles.sort((a, b) => {
    if (INDEX_FILES.has(a.relativePath) && !INDEX_FILES.has(b.relativePath)) return -1;
    if (INDEX_FILES.has(b.relativePath) && !INDEX_FILES.has(a.relativePath)) return 1;
    return a.relativePath.localeCompare(b.relativePath);
  });
  if (!sorted.length) fail(`No distributable .ts, .tsx, .js, .jsx, or .css files found in ${relative(sourceDir)}`);
  return sorted;
}

function detectDependencies(files, sourceDir) {
  const deps = new Set();
  for (const file of files.filter((entry) => entry.extension !== ".css")) {
    const content = fs.readFileSync(path.join(sourceDir, file.relativePath), "utf8");
    for (const specifier of findImportSpecifiers(content)) {
      if (specifier.startsWith(".") || specifier.startsWith("@/")) continue;
      const packageName = packageNameFromSpecifier(specifier);
      if (!PACKAGE_IMPORT_IGNORE.has(packageName)) deps.add(packageName);
    }
  }
  return [...deps].sort();
}

function findImportSpecifiers(content) {
  const specifiers = [];
  const importExportRe = /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportRe = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let match;
  while ((match = importExportRe.exec(content))) specifiers.push(match[1]);
  while ((match = dynamicImportRe.exec(content))) specifiers.push(match[1]);
  return specifiers;
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function resolveLocalImport(fromDir, specifier) {
  const base = path.resolve(fromDir, specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.css`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.jsx"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function detectExportInfo(mainFile, explicitName) {
  requirePath(mainFile, `Main file not found: ${relative(mainFile)}`);
  const content = fs.readFileSync(mainFile, "utf8");
  const defaultNamed = content.match(/export\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/);
  const defaultIdentifier = content.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
  if (defaultNamed) return { exportName: defaultNamed[1], exportKind: "default" };
  if (defaultIdentifier) return { exportName: defaultIdentifier[1], exportKind: "default" };
  const named = [...content.matchAll(/export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  if (explicitName && named.includes(explicitName)) return { exportName: explicitName, exportKind: "named" };
  if (named.length === 1) return { exportName: named[0], exportKind: "named" };
  if (/export\s+default\b/.test(content)) return { exportName: explicitName, exportKind: "default" };
  fail(`Unable to detect export from ${relative(mainFile)}. Pass --export-name and --export-kind.`);
}

function makeRegistryJson({ slug, version, title, description, category, tier, dependencies, date, summary, breaking, main, exportName, exportKind, files }) {
  return {
    name: slug,
    version,
    changelog: [{ version, date, summary, breaking }],
    type: "registry:component",
    title,
    description,
    category,
    dependencies,
    registryDependencies: [],
    previewUrl: `/demo/${slug}`,
    tier,
    subfolder: true,
    main,
    exportName,
    exportKind,
    importPath: `@/components/effects/${slug}`,
    target: `src/components/effects/${slug}`,
    files,
  };
}

function makePackageJson(registryJson, version, existing = {}) {
  const files = [...new Set([
    registryJson.main,
    ...(registryJson.files || []).filter((file) => file.type !== "registry:asset").map((file) => file.path),
    "registry.json",
  ])];
  return {
    ...existing,
    name: `@hyperiux/${registryJson.name}`,
    version,
    description: registryJson.description,
    main: registryJson.main,
    files,
    keywords: [registryJson.category || "effect", "hyperiux"],
    dependencies: Object.fromEntries((registryJson.dependencies || []).map((dependency) => [dependency, existing.dependencies?.[dependency] || "*"])),
  };
}

function makeFileEntries(files, slug) {
  return files.map((file) => ({
    path: file.relativePath,
    target: `src/components/effects/${slug}/${file.relativePath}`,
  }));
}

function prependChangelog(changelog = [], entry) {
  return [entry, ...changelog.filter((item) => item.version !== entry.version)];
}

function resolveNextVersion(currentVersion, options) {
  if (options.version && options.bump) fail("--version and --bump are mutually exclusive.");
  if (options.version) {
    validateVersion(options.version);
    return options.version;
  }
  const bump = requireOption(options, "bump");
  if (!["patch", "minor", "major"].includes(bump)) fail("--bump must be patch, minor, or major.");
  return bumpVersion(currentVersion || "1.0.0", bump);
}

function resolveSyncVersion(currentVersion, options) {
  if (options.versionBump === false) {
    if (options.version || options.bump) fail("--no-version-bump cannot be combined with --version or --bump.");
    return currentVersion;
  }

  if (!options.version && !options.bump) {
    fail("Pass --bump patch|minor|major, --version x.y.z, or --no-version-bump.");
  }

  return resolveNextVersion(currentVersion, options);
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map((part) => Number.parseInt(part, 10));
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updateRootIndex(registryJson, category) {
  const entries = readRootIndex().filter((entry) => entry.name !== registryJson.name);
  const entry = {
    ...registryJson,
    registryPath: `registry/effects/${category}/${registryJson.name}/registry.json`,
  };
  entries.push(entry);
  entries.sort((a, b) => a.name.localeCompare(b.name));
  writeJson(ROOT_INDEX_FILE, entries);
}

function removeRootIndexEntry(slug) {
  writeJson(ROOT_INDEX_FILE, readRootIndex().filter((entry) => entry.name !== slug));
}

function removePublicIndexEntry(slug) {
  const publicIndexFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json");
  const publicIndex = readJsonIfExists(publicIndexFile);
  if (!publicIndex?.items) return;
  writeJson(publicIndexFile, {
    ...publicIndex,
    items: publicIndex.items.filter((entry) => entry.name !== slug),
  });
}

function removeDistIndexEntries(slug) {
  const distIndexFile = path.join(ROOT, "registry", "dist", "registry-index.json");
  const distIndex = readJsonIfExists(distIndexFile);
  if (!Array.isArray(distIndex)) return;
  writeJson(distIndexFile, distIndex.filter((entry) => {
    const tarball = entry.tarball || "";
    const name = entry.name || "";
    return name !== `@hyperiux/${slug}` && !tarball.includes(`hyperiux-${slug}-`);
  }));
}

function removeMirrorIndexEntry(repoPath, slug) {
  const indexFile = path.join(repoPath, "registry", "index.json");
  const indexJson = readJsonIfExists(indexFile);
  if (!indexJson) return;
  if (Array.isArray(indexJson)) {
    writeJson(indexFile, indexJson.filter((entry) => entry.name !== slug));
    return;
  }
  if (Array.isArray(indexJson.items)) {
    writeJson(indexFile, {
      ...indexJson,
      items: indexJson.items.filter((entry) => entry.name !== slug),
    });
  }
}

function findComponent(slug) {
  for (const category of listCategories()) {
    const dir = registryComponentDir(category, slug);
    const registryFile = path.join(dir, "registry.json");
    if (fs.existsSync(registryFile)) {
      return { category, dir, registry: readJson(registryFile) };
    }
  }
  const rootEntry = readRootIndex().find((entry) => entry.name === slug);
  if (rootEntry?.registryPath) {
    const registryFile = path.join(ROOT, rootEntry.registryPath);
    if (fs.existsSync(registryFile)) {
      return {
        category: rootEntry.category || path.basename(path.dirname(path.dirname(registryFile))),
        dir: path.dirname(registryFile),
        registry: readJson(registryFile),
      };
    }
  }
  return null;
}

function listCategories() {
  return fs.readdirSync(REGISTRY_EFFECTS_DIR)
    .filter((entry) => !entry.startsWith("_"))
    .filter((entry) => fs.statSync(path.join(REGISTRY_EFFECTS_DIR, entry)).isDirectory())
    .sort();
}

function copyDistributableFiles(files, destDir, imageSource) {
  for (const file of files) {
    const dest = path.join(destDir, file.relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const content = toDistributableContent(
      file.relativePath,
      fs.readFileSync(file.absolutePath),
      imageSource
    );
    fs.writeFileSync(dest, content);
  }
}

function listStaleRegistryFiles(registryDir, sourceFiles) {
  const sourceSet = new Set(sourceFiles.map((file) => file.relativePath));
  return walkFiles(registryDir)
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .filter((file) => !sourceSet.has(slash(path.relative(registryDir, file))));
}

function compareSourceToRegistry(sourceFiles, registryDir, imageSource) {
  const diffs = [];
  const sourceByRelative = new Map(sourceFiles.map((file) => [file.relativePath, file]));
  const registryFiles = walkFiles(registryDir)
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .map((file) => slash(path.relative(registryDir, file)));
  const registrySet = new Set(registryFiles);

  for (const [relativePath, sourceFile] of sourceByRelative) {
    const registryFile = path.join(registryDir, relativePath);
    if (!registrySet.has(relativePath)) {
      diffs.push(`missing in registry: ${relativePath}`);
      continue;
    }
    const sourceContent = toDistributableContent(
      relativePath,
      fs.readFileSync(sourceFile.absolutePath),
      imageSource
    );
    const registryContent = fs.readFileSync(registryFile);
    if (!sourceContent.equals(registryContent)) diffs.push(`content differs: ${relativePath}`);
  }

  for (const registryFile of registryFiles) {
    if (!sourceByRelative.has(registryFile)) diffs.push(`stale in registry: ${registryFile}`);
  }

  return diffs;
}

function formatMetadataDiff(registryJson, pkg, publicJson, rootEntry) {
  const diffs = [];
  if (!pkg) diffs.push("missing package.json");
  if (!publicJson) diffs.push("missing public registry JSON");
  if (!rootEntry) diffs.push("missing root registry/index.json entry");
  if (pkg && pkg.version !== registryJson.version) diffs.push(`package version ${pkg.version} != registry ${registryJson.version}`);
  if (publicJson && publicJson.version !== registryJson.version) diffs.push(`public version ${publicJson.version} != registry ${registryJson.version}`);
  if (rootEntry && rootEntry.version !== registryJson.version) diffs.push(`root index version ${rootEntry.version} != registry ${registryJson.version}`);
  if (rootEntry?.registryPath && rootEntry.registryPath !== `registry/effects/${registryJson.category}/${registryJson.name}/registry.json`) {
    diffs.push(`root registryPath ${rootEntry.registryPath} does not match registry category/name`);
  }
  return formatFileDiff(diffs);
}

function formatFileDiff(diffs) {
  return diffs.length ? diffs.map((diff) => `- ${diff}`).join("\n") : "none";
}

function gitNameStatus(paths) {
  if (!paths.length) return [];
  try {
    const output = execFileSync("git", ["diff", "--name-status", "--", ...paths.map((file) => relative(file))], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return output.trim().split("\n").filter(Boolean);
  } catch (error) {
    return [String(error.stderr || error.message).trim()];
  }
}

function isGitTracked(file) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", relative(file)], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function revertPathsForComponent(current, options) {
  const slug = current.registry.name;
  const distFiles = [
    ...listDistFilesForSlug(slug),
    path.join(ROOT, "registry", "dist", "registry-index.json"),
  ];

  return [
    current.dir,
    ROOT_INDEX_FILE,
    path.join(DOCS_PUBLIC_REGISTRY_DIR, `${slug}.json`),
    path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json"),
    ...distFiles,
    ...(options.includeDocs ? [docsComponentDir(slug)] : []),
  ];
}

function listDistFilesForSlug(slug) {
  const distDir = path.join(ROOT, "registry", "dist");
  if (!fs.existsSync(distDir)) return [];
  return fs.readdirSync(distDir)
    .filter((file) => file.startsWith(`hyperiux-${slug}-`) && file.endsWith(".tgz"))
    .map((file) => path.join(distDir, file));
}

function rewriteSlugMetadata(registryJson, from, to) {
  return {
    ...registryJson,
    previewUrl: `/demo/${to}`,
    importPath: `@/components/effects/${to}`,
    target: `src/components/effects/${to}`,
    files: (registryJson.files || []).map((file) => ({
      ...file,
      target: file.target?.replaceAll(from, to),
    })),
  };
}

function addSlugAlias(alias, canonicalSlug) {
  const content = fs.readFileSync(EFFECT_SLUGS_FILE, "utf8");
  if (slugAliasExists(alias, canonicalSlug)) return;
  const insertion = `  {\n    slug: "${canonicalSlug}",\n    aliases: ["${alias}"],\n  },\n`;
  const next = content.replace(/const effectSlugAliasGroups = \[\n/, `const effectSlugAliasGroups = [\n${insertion}`);
  fs.writeFileSync(EFFECT_SLUGS_FILE, next);
}

function slugAliasExists(alias, canonicalSlug) {
  if (!fs.existsSync(EFFECT_SLUGS_FILE)) return false;
  const content = fs.readFileSync(EFFECT_SLUGS_FILE, "utf8");
  const groupRe = new RegExp(`slug:\\s*["']${escapeRegExp(canonicalSlug)}["'][\\s\\S]*?aliases:\\s*\\[[\\s\\S]*?["']${escapeRegExp(alias)}["']`, "m");
  return groupRe.test(content);
}

function removeSlugAliasGroup(slug) {
  if (!fs.existsSync(EFFECT_SLUGS_FILE)) return;
  const content = fs.readFileSync(EFFECT_SLUGS_FILE, "utf8");
  const groupRe = new RegExp(`\\n?\\s*\\{\\s*slug:\\s*["']${escapeRegExp(slug)}["'],\\s*aliases:\\s*\\[[\\s\\S]*?\\],\\s*\\},`, "m");
  const next = content.replace(groupRe, "");
  if (next !== content) fs.writeFileSync(EFFECT_SLUGS_FILE, next);
}

function freeMirrorPlan(options, tier) {
  if (tier !== "free" || options.skipFreeMirror) return null;
  const repoPath = resolveFreeRepoPath(options);
  return { repoPath, destDir: path.join(repoPath, "registry", "effects", options.category || "", options.slug || options.to || "") };
}

function ensureFreeMirrorReady(plan, options) {
  if (!plan || options.skipFreeMirror) return;
  requirePath(plan.repoPath, `Free-tier mirror repo not found: ${plan.repoPath}. Pass --skip-free-mirror to skip intentionally.`);
}

function syncFreeMirror(plan, registryDir, options) {
  if (!plan || options.skipFreeMirror) return;
  const registryJson = readJson(path.join(registryDir, "registry.json"));
  const destDir = path.join(plan.repoPath, "registry", "effects", registryJson.category, registryJson.name);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(registryDir, destDir, { recursive: true });
  runMirrorBuilds(plan.repoPath);
}

function syncFreeMirrorRename(plan, category, from, to, registryDir, options) {
  if (!plan || options.skipFreeMirror) return;
  const oldDir = path.join(plan.repoPath, "registry", "effects", category, from);
  fs.rmSync(oldDir, { recursive: true, force: true });
  syncFreeMirror(plan, registryDir, options);
}

function syncFreeMirrorMove(plan, from, to, slug, registryDir, options) {
  if (!plan || options.skipFreeMirror) return;
  const oldDir = path.join(plan.repoPath, "registry", "effects", from, slug);
  fs.rmSync(oldDir, { recursive: true, force: true });
  syncFreeMirror(plan, registryDir, options);
}

function runBuilds(options) {
  if (options.skipBuild) return;
  execFileSync("npm", ["--prefix", "apps/docs", "run", "build:registry"], { cwd: ROOT, stdio: "inherit" });
  execFileSync("npm", ["run", "build:registry"], { cwd: ROOT, stdio: "inherit" });
}

function runMirrorBuilds(repoPath) {
  const drift = findMirrorIndexDrift(repoPath);
  if (drift.length) {
    fail(`Free mirror registry/index.json drift:\n- ${drift.join("\n- ")}`);
  }
  console.log("Free mirror folder/index consistency passed.");
}

function printDryRun(title, options, rows) {
  if (!options.dryRun) return;
  console.log(`${title} dry run`);
  for (const [label, value] of rows) {
    console.log(`\n${label}:`);
    console.log(value || "(none)");
  }
}

function readRootIndex() {
  return readJsonIfExists(ROOT_INDEX_FILE) || [];
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonIfExists(file) {
  if (!fs.existsSync(file)) return null;
  return readJson(file);
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(entryPath);
    if (entry.isFile()) return [entryPath];
    return [];
  });
}

function compareDirectories(sourceDir, mirrorDir) {
  const sourceFiles = new Set(walkFiles(sourceDir).map((file) => slash(path.relative(sourceDir, file))));
  const mirrorFiles = new Set(walkFiles(mirrorDir).map((file) => slash(path.relative(mirrorDir, file))));
  const diffs = [];

  for (const file of sourceFiles) {
    if (!mirrorFiles.has(file)) {
      diffs.push(`missing in mirror: ${file}`);
      continue;
    }

    const sourceContent = fs.readFileSync(path.join(sourceDir, file));
    const mirrorContent = fs.readFileSync(path.join(mirrorDir, file));
    if (!sourceContent.equals(mirrorContent)) diffs.push(`content differs: ${file}`);
  }

  for (const file of mirrorFiles) {
    if (!sourceFiles.has(file)) diffs.push(`extra in mirror: ${file}`);
  }

  return diffs;
}

function findMirrorIndexDrift(repoPath) {
  const effectsDir = path.join(repoPath, "registry", "effects");
  const indexFile = path.join(repoPath, "registry", "index.json");
  if (!fs.existsSync(effectsDir) || !fs.existsSync(indexFile)) return [];

  const indexJson = readJson(indexFile);
  const indexItems = Array.isArray(indexJson) ? indexJson : indexJson.items || [];
  const indexedSlugs = new Set(indexItems.map((item) => item.name));
  const folderEntries = [];

  for (const category of fs.readdirSync(effectsDir)) {
    const categoryDir = path.join(effectsDir, category);
    if (!fs.statSync(categoryDir).isDirectory()) continue;
    for (const slug of fs.readdirSync(categoryDir)) {
      const componentDir = path.join(categoryDir, slug);
      if (fs.statSync(componentDir).isDirectory()) {
        folderEntries.push({ category, slug });
      }
    }
  }

  const folderSlugs = new Set(folderEntries.map((entry) => entry.slug));
  return [
    ...folderEntries
      .filter((entry) => !indexedSlugs.has(entry.slug))
      .map((entry) => `orphan mirror folder: registry/effects/${entry.category}/${entry.slug}`),
    ...[...indexedSlugs]
      .filter((slug) => !folderSlugs.has(slug))
      .map((slug) => `index entry missing mirror folder: ${slug}`),
  ];
}

function docsComponentDir(slug) {
  return path.join(DOCS_COMPONENTS_DIR, slug);
}

function registryComponentDir(category, slug) {
  return path.join(REGISTRY_EFFECTS_DIR, category, slug);
}

function resolveFreeRepoPath(options) {
  return path.resolve(ROOT, options.freeRepoPath || "../hyperiux-components");
}

function requireOption(options, key) {
  if (options[key] === undefined || options[key] === "") fail(`Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}.`);
  return options[key];
}

function requirePath(file, message) {
  if (!fs.existsSync(file)) fail(message);
}

function validateSlug(slug) {
  if (!SLUG_RE.test(slug)) fail(`Invalid slug "${slug}". Use lowercase hyphenated names only.`);
}

function validateCategory(category) {
  if (!listCategories().includes(category)) fail(`Invalid category "${category}". Existing categories: ${listCategories().join(", ")}`);
}

function validateTier(tier) {
  if (!["free", "pro"].includes(tier)) fail('--tier must be "free" or "pro".');
}

function validateVersion(version) {
  if (!VERSION_RE.test(version)) fail(`Invalid semver version "${version}".`);
}

function parseList(value) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value;
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function relative(file) {
  return slash(path.relative(ROOT, file)) || ".";
}

function relativeOrAbsolute(file) {
  const rel = relative(file);
  return rel.startsWith("..") ? file : rel;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

main();
