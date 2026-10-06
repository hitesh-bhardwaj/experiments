#!/usr/bin/env node
// Implements md/new-component-workflow.md: registry sync (Phase 1), codegen
// (Phase 2 - global-remixer swap + registry re-sync + local JSX handoff),
// update (Phase 1 + 2 combined for an already-shipped effect), and revert
// (Phase 3 rollback). Self-contained - does not shell out to
// component-workflow.mjs or sanity-code-sync.mjs.

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(process.env.HYPERIUX_WORKFLOW_ROOT || path.join(__dirname, "..", ".."));
const DOCS_COMPONENTS_DIR = path.join(ROOT, "vault-main", "src", "components");
const DOCS_DEMO_DIR = path.join(ROOT, "vault-main", "src", "app", "(marketing)", "demo");
const REGISTRY_EFFECTS_DIR = path.join(ROOT, "registry", "effects");
const ROOT_INDEX_FILE = path.join(ROOT, "registry", "index.json");
const DIST_DIR = path.join(ROOT, "registry", "dist");
const DIST_INDEX_FILE = path.join(DIST_DIR, "registry-index.json");
const DOCS_PUBLIC_REGISTRY_DIR = path.join(ROOT, "vault-main", "public", "r");
const CODEGEN_DIR = path.join(ROOT, "codegen");
const requireFromScript = createRequire(import.meta.url);

const COMMANDS = new Set(["registry", "codegen", "update", "revert", "ship"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const HEADER_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const EXCLUDED_FILE_RE = /(^Demo\.jsx$|\.demo\.jsx$|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|^README\.md$|\.md$)/i;
const PACKAGE_IMPORT_IGNORE = new Set([
  "react", "react-dom", "next", "node:fs", "node:path", "node:process", "node:url",
]);
const VAULT_HEADER_TEXT = "Built using Hyperiux Vault: https://vault.hyperiux.com";

// vault-main/src/lib/motion.js is app-internal (not shipped in the registry
// package), so any effect that imports from it in the docs/demo source needs
// a self-contained, matchMedia-based equivalent inlined into the registry/
// codegen copy instead - same behavior, no dependency on this app's @/lib.
const REDUCED_MOTION_LIB_IMPORT_RE = /import\s*\{\s*([^}]*?)\s*\}\s*from\s*["']@\/lib\/motion["'];?\n?/;
const REDUCED_MOTION_EXPORTS = new Set(["usePrefersReducedMotion", "prefersReducedMotion"]);
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

let cachedTs = null;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const { command, options } = parseCli(process.argv.slice(2));

  if (!COMMANDS.has(command)) {
    fail(`Unknown command "${command}". Use one of: ${[...COMMANDS].join(", ")}`);
  }

  if (command === "registry") return void printResult("registry", options.slug, await runRegistry(options));
  if (command === "codegen") return void printResult("codegen", options.slug, await runCodegen(options));
  if (command === "update") return void printResult("update", options.slug, await runUpdate(options));
  if (command === "revert") return void runRevert(options);
  if (command === "ship") return void (await runShip(options));
}

async function runShip(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  console.log(`component:ship - ${slug}\n`);

  const registryResult = await runRegistry(options);
  printPhase("Phase 1 registry", registryResult);
  if (!registryResult.ok) return finishShip(slug, 1);

  const codegenResult = await runCodegen(options);
  printPhase("Phase 2 codegen", codegenResult);
  if (!codegenResult.ok) {
    await maybeOfferRevert(slug, options, registryResult);
    return finishShip(slug, 1);
  }

  finishShip(slug, 0);
}

function printPhase(label, result) {
  const mark = result.ok ? "✔" : "✖";
  console.log(`${label.padEnd(20)} ${mark} ${result.summary}`);
  for (const detail of result.details || []) console.log(`  ${detail}`);
}

function finishShip(slug, exitCode) {
  console.log(`\ncomponent:ship ${exitCode === 0 ? "succeeded" : "failed"} for ${slug}`);
  if (exitCode !== 0) process.exitCode = exitCode;
}

async function maybeOfferRevert(slug, options, registryResult) {
  if (!registryResult.wrote) return;
  const answer = await promptYesNoQuestion(
    `\nA later phase failed after the registry was already updated for "${slug}". Revert the registry changes from this run? [y/N] `
  );
  if (!answer) {
    console.log("Not reverting. Fix the issue and re-run `codegen` once ready.");
    return;
  }
  runRevert({ slug, yes: true });
}

// ---------------------------------------------------------------------------
// Phase 1 - Registry sync
// ---------------------------------------------------------------------------

async function runRegistry(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const details = [];
  let wrote = false;

  try {
    const existing = findComponent(slug);
    let registryDir;
    let category;
    let registryJson;

    if (!existing) {
      category = requireOption(options, "category");
      const tier = requireOption(options, "tier");
      const title = requireOption(options, "title");
      const description = requireOption(options, "description");
      validateCategory(category);
      validateTier(tier);

      const docsDir = docsComponentDir(slug);
      requirePath(docsDir, `Docs component folder not found: ${relative(docsDir)}`);
      registryDir = registryComponentDir(category, slug);
      if (fs.existsSync(registryDir) && !options.overwrite) {
        fail(`Registry folder already exists: ${relative(registryDir)}. Pass --overwrite to replace it.`);
      }

      const version = options.version || "1.0.0";
      const files = discoverDistributableFiles(docsDir);
      const dependencies = parseList(options.dependencies) ?? detectDependencies(files, docsDir);
      const mainFile = options.main || detectMainFileName(files);
      const exportInfo = detectExportInfo(path.join(docsDir, mainFile), options.exportName);
      const props = detectPropsFromLocalRemixer(docsDir) ?? [];

      registryJson = makeRegistryJson({
        slug, version, title, description, category, tier, dependencies,
        date: options.date || today(),
        summary: options.summary || "Initial release",
        main: mainFile,
        exportName: options.exportName || exportInfo.exportName,
        exportKind: options.exportKind || exportInfo.exportKind,
        files: makeFileEntries(files, slug),
        props,
      });

      if (options.dryRun) {
        details.push(`dry-run: would create ${relative(registryDir)}`);
        return { ok: true, summary: "dry run - nothing written", details, wrote: false };
      }

      ensureFreeMirrorReady(tier, options);
      fs.rmSync(registryDir, { recursive: true, force: true });
      fs.mkdirSync(registryDir, { recursive: true });
      copyDistributableFilesWithHeader(files, registryDir);
      writeJson(path.join(registryDir, "registry.json"), registryJson);
      writeJson(path.join(registryDir, "package.json"), makePackageJson(registryJson, options.packageVersion || version));
      updateRootIndex(registryJson, category);
      syncFreeMirror(tier, registryDir, options);
      wrote = true;
      details.push(`created ${relative(registryDir)} @ v${version}`);
      if (props.length) details.push(`props (${props.length}) drafted from LocalRemixerDemo usage in the demo page`);
    } else {
      category = existing.category;
      registryDir = existing.dir;
      const docsDir = docsComponentDir(slug);
      requirePath(docsDir, `Docs component folder not found: ${relative(docsDir)}.`);

      const nextVersion = resolveSyncVersion(existing.registry.version, options);
      const shouldWriteChangelog = nextVersion !== existing.registry.version;
      if (shouldWriteChangelog && !options.summary) fail("Missing required --summary when changing the component version.");

      const files = discoverDistributableFiles(docsDir);
      const dependencies = parseList(options.dependencies) ?? detectDependencies(files, docsDir);
      const mainFileName = existing.registry.main || detectMainFileName(files);
      const exportInfo = detectExportInfo(path.join(docsDir, mainFileName), existing.registry.exportName);

      registryJson = {
        ...existing.registry,
        version: nextVersion,
        dependencies,
        previewUrl: `/demo/${slug}`,
        importPath: `@/components/effects/${slug}`,
        target: `src/components/effects/${slug}`,
        main: mainFileName,
        exportName: options.exportName || existing.registry.exportName || exportInfo.exportName,
        exportKind: options.exportKind || existing.registry.exportKind || exportInfo.exportKind,
        files: makeFileEntries(files, slug),
        changelog: shouldWriteChangelog
          ? prependChangelog(existing.registry.changelog, {
              version: nextVersion,
              date: options.date || today(),
              summary: options.summary || "Synced component files",
              breaking: options.breaking ?? options.bump === "major",
            })
          : existing.registry.changelog,
      };

      if (options.dryRun) {
        details.push(`dry-run: would sync ${relative(existing.dir)} -> v${nextVersion}`);
        return { ok: true, summary: "dry run - nothing written", details, wrote: false };
      }

      ensureFreeMirrorReady(registryJson.tier, options);
      copyDistributableFilesWithHeader(files, existing.dir);
      writeJson(path.join(existing.dir, "registry.json"), registryJson);
      writeJson(path.join(existing.dir, "package.json"), makePackageJson(registryJson, options.packageVersion || nextVersion, readJsonIfExists(path.join(existing.dir, "package.json"))));
      updateRootIndex(registryJson, existing.category);
      syncFreeMirror(registryJson.tier, existing.dir, options);
      wrote = true;
      details.push(`synced ${relative(existing.dir)}: v${existing.registry.version} -> v${nextVersion}`);
    }

    if (!options.skipPublicRebuild) {
      const publicResult = buildPublicEffect(registryJson, registryDir, category);
      details.push(`public/r/${slug}.json rebuilt (${publicResult.action}); public/r/index.json entry ${publicResult.indexAction}`);
    }

    if (!options.skipTarball) {
      const tarballResult = buildTarballForEffect(registryDir);
      if (tarballResult) details.push(`dist tarball rebuilt: ${relative(tarballResult.tarball)}`);
    }

    return { ok: true, summary: wrote ? "registry synced" : "no changes needed", details, wrote };
  } catch (error) {
    return { ok: false, summary: error.message, details, wrote };
  }
}

function detectMainFileName(files) {
  const preferred = ["index.tsx", "index.ts", "index.jsx", "index.js"];
  const found = preferred.find((name) => files.some((file) => file.relativePath === name));
  return found || files[0]?.relativePath;
}

function detectPropsFromLocalRemixer(docsDir) {
  const demoDir = path.join(DOCS_DEMO_DIR, path.basename(docsDir));
  if (!fs.existsSync(demoDir)) return null;
  const demoFile = findLocalRemixerUsageFile(demoDir);
  if (!demoFile) return null;

  const content = fs.readFileSync(demoFile, "utf8");
  const propsMatch = content.match(/<LocalRemixerDemo\b[\s\S]*?\bprops\s*=\s*\{(\[[\s\S]*?\])\}/);
  if (!propsMatch) return null;

  try {
    // eslint-disable-next-line no-new-func -- trusted, developer-authored demo source, not user input
    const props = new Function(`"use strict"; return (${propsMatch[1]});`)();
    return Array.isArray(props) ? props : null;
  } catch {
    return null;
  }
}

function findLocalRemixerUsageFile(demoDir) {
  const candidates = walkFiles(demoDir).filter((file) => [".tsx", ".jsx"].includes(path.extname(file)));
  return candidates.find((file) => fs.readFileSync(file, "utf8").includes("LocalRemixerDemo")) || null;
}

// ---------------------------------------------------------------------------
// Phase 2 - Codegen (global-remixer swap + registry re-sync + JSX handoff)
// ---------------------------------------------------------------------------

async function runCodegen(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const details = [];

  try {
    const existing = findComponent(slug);
    if (!existing) fail(`No registry entry found for "${slug}". Run \`registry\` first.`);

    // 1. Swap the demo page's LocalRemixerDemo usage to the global RegistryRemixerDemo.
    const swapResult = swapDemoToGlobalRemixer(slug, existing.category);
    details.push(swapResult.message);

    // 2. Registry-side re-sync, only if source actually differs from what's copied.
    const resync = runRegistryResyncIfChanged(existing);
    details.push(resync.message);
    const current = resync.changed ? findComponent(slug) : existing;

    if (resync.changed && !options.skipPublicRebuild) {
      const publicResult = buildPublicEffect(current.registry, current.dir, current.category);
      details.push(`public/r/${slug}.json rebuilt (${publicResult.action}); public/r/index.json entry ${publicResult.indexAction}`);
    }
    if (resync.changed && !options.skipTarball) {
      const tarballResult = buildTarballForEffect(current.dir);
      if (tarballResult) details.push(`dist tarball rebuilt: ${relative(tarballResult.tarball)}`);
    }

    // 3. Local JSX handoff folder, diffed against what's already there.
    const codegenResult = writeCodegenOutput(slug, current);
    details.push(...codegenResult.details);

    return { ok: true, summary: "codegen complete", details };
  } catch (error) {
    return { ok: false, summary: error.message, details };
  }
}

function swapDemoToGlobalRemixer(slug, category) {
  const demoDir = path.join(DOCS_DEMO_DIR, slug);
  if (!fs.existsSync(demoDir)) return { message: `no demo folder at ${relative(demoDir)} - skipping demo swap` };

  const demoFile = findLocalRemixerUsageFile(demoDir);
  if (!demoFile) return { message: "demo already uses the global Remixer Panel (no LocalRemixerDemo usage found) - skipping" };

  let content = fs.readFileSync(demoFile, "utf8");
  const before = content;

  content = content.replace(
    /import\s+(?:\{\s*LocalRemixerDemo\s*\}|LocalRemixerDemo)\s+from\s+["']@\/components\/local-remixer(?:\/LocalRemixerDemo)?["'];?\n?/,
    'import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";\n'
  );
  content = content.replace(/<LocalRemixerDemo\b([\s\S]*?)>/, (_match, attrs) => {
    const cleanedAttrs = attrs
      .replace(/\bname\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, "")
      .replace(/\bprops\s*=\s*\{\[[\s\S]*?\]\}/, "")
      .replace(/\bremixer\s*=\s*\{[\s\S]*?\}\}/, "")
      .trim();
    return `<RegistryRemixerDemo registry={registry}${cleanedAttrs ? ` ${cleanedAttrs}` : ""}>`;
  });
  content = content.replace(/<\/LocalRemixerDemo>/g, "</RegistryRemixerDemo>");

  // Give the default-exported component a `registry` param if its
  // parameter list doesn't already destructure one, so `registry={registry}`
  // above has something to read from (mirrors the `({ registry }: any)`
  // pattern real demos use). Matched narrowly against the function's own
  // parameter list, not the whole file, so `registry={registry}` in the JSX
  // below doesn't get mistaken for an existing destructure.
  content = content.replace(
    /(export\s+default\s+function\s+[A-Za-z_$][\w$]*\s*\()\s*\)/,
    (match, prefix) => (/\bregistry\b/.test(match) ? match : `${prefix}{ registry }: any)`)
  );

  if (content === before) {
    return { message: `found LocalRemixerDemo in ${relative(demoFile)} but the swap regex made no changes - review this file manually` };
  }

  fs.writeFileSync(demoFile, content);
  const pageResult = ensurePageImportsRegistry(demoDir, slug, category);
  return {
    message: `swapped LocalRemixerDemo -> RegistryRemixerDemo in ${relative(demoFile)} (best-effort - review the JSX attributes)${pageResult ? `; ${pageResult}` : ""}`,
  };
}

function ensurePageImportsRegistry(demoDir, slug, category) {
  const pageFile = ["page.tsx", "page.jsx", "page.js"].map((name) => path.join(demoDir, name)).find((file) => fs.existsSync(file));
  if (!pageFile) return "no page.tsx found to wire up the registry import - add it manually";

  let content = fs.readFileSync(pageFile, "utf8");
  const varName = `${toCamelCase(slug.replace(/-([a-z])/g, "-$1"))}Registry`;
  if (content.includes("registry.json")) return null;

  const registryJsonPath = path.join(REGISTRY_EFFECTS_DIR, category, slug, "registry.json");
  const importPath = slash(path.relative(demoDir, registryJsonPath));
  const importSpecifier = importPath.startsWith(".") ? importPath : `./${importPath}`;
  const importLine = `import ${varName} from "${importSpecifier}";\n`;

  const lines = content.split("\n");
  let lastImportIndex = -1;
  lines.forEach((line, index) => { if (line.startsWith("import ")) lastImportIndex = index; });
  lines.splice(lastImportIndex + 1, 0, importLine.trimEnd());
  content = lines.join("\n");
  content = content.replace(/<DemoContent\s*\/>/, `<DemoContent registry={${varName}} />`);
  content = content.replace(/<DemoContent(\s+)(?!registry=)/, `<DemoContent registry={${varName}} `);

  fs.writeFileSync(pageFile, content);
  return `added registry.json import to ${relative(pageFile)} - verify <DemoContent> receives it`;
}

function runRegistryResyncIfChanged(existing) {
  const docsDir = docsComponentDir(existing.registry.name);
  if (!fs.existsSync(docsDir)) return { changed: false, message: "no docs source folder - skipping registry re-sync" };

  const files = discoverDistributableFiles(docsDir);
  const changedFiles = files.filter((file) => {
    const destFile = path.join(existing.dir, file.relativePath);
    if (!fs.existsSync(destFile)) return true;
    const sourceContent = withPortableReducedMotion(fs.readFileSync(file.absolutePath, "utf8"), file.extension);
    return sourceContent !== stripVaultHeader(fs.readFileSync(destFile, "utf8"));
  });

  const dependencies = detectDependencies(files, docsDir);
  const mainFileName = existing.registry.main || detectMainFileName(files);
  const exportInfo = detectExportInfo(path.join(docsDir, mainFileName), existing.registry.exportName);
  const nextFiles = makeFileEntries(files, existing.registry.name);

  const metadataChanged =
    JSON.stringify(dependencies) !== JSON.stringify(existing.registry.dependencies || []) ||
    JSON.stringify(nextFiles) !== JSON.stringify(existing.registry.files || []) ||
    exportInfo.exportName !== existing.registry.exportName ||
    exportInfo.exportKind !== existing.registry.exportKind;

  if (!changedFiles.length && !metadataChanged) {
    return { changed: false, message: "registry-side files already match source - no re-sync needed" };
  }

  copyDistributableFilesWithHeader(changedFiles.length ? changedFiles : files, existing.dir);

  const registryJson = {
    ...existing.registry,
    dependencies,
    exportName: existing.registry.exportName || exportInfo.exportName,
    exportKind: existing.registry.exportKind || exportInfo.exportKind,
    files: nextFiles,
  };
  writeJson(path.join(existing.dir, "registry.json"), registryJson);
  writeJson(
    path.join(existing.dir, "package.json"),
    makePackageJson(registryJson, registryJson.version, readJsonIfExists(path.join(existing.dir, "package.json")))
  );
  updateRootIndex(registryJson, existing.category);

  return {
    changed: true,
    message: `registry-side re-sync: ${changedFiles.length || files.length} file(s) recopied, metadata refreshed (no version bump)`,
  };
}

function writeCodegenOutput(slug, component) {
  const outDir = path.join(CODEGEN_DIR, slug);
  fs.mkdirSync(outDir, { recursive: true });
  const details = [];
  let written = 0;

  const codeFiles = readRegistryCodeFiles(component);
  for (const file of codeFiles) {
    const outputs = [{ filename: file.filename, content: file.content }];
    // For .tsx/.ts sources, the original is written alongside the
    // type-stripped .jsx/.js version - not instead of it.
    if (file.tsxCode !== undefined) {
      outputs.push({ filename: file.originalFilename, content: file.tsxCode });
    }
    for (const output of outputs) {
      const destPath = path.join(outDir, output.filename);
      if (fs.existsSync(destPath) && fs.readFileSync(destPath, "utf8") === output.content) continue;
      fs.writeFileSync(destPath, output.content);
      written += 1;
    }
  }

  details.push(
    written
      ? `wrote ${written} changed file(s) into ${relative(outDir)} for manual Sanity paste`
      : `${relative(outDir)} already up to date - nothing changed`
  );
  details.push(`once Sanity is updated, delete ${relative(outDir)} yourself`);
  return { details };
}

function readRegistryCodeFiles(existing) {
  const files = Array.isArray(existing.registry.files) ? existing.registry.files : [];
  const codeFiles = files
    .filter((file) => file.type !== "registry:asset")
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file.path || "")))
    .map((file) => {
      const sourcePath = path.join(existing.dir, file.path);
      if (!fs.existsSync(sourcePath)) fail(`Registry file missing: ${relative(sourcePath)}`);
      return makeCodeFileEntry(file.path, fs.readFileSync(sourcePath, "utf8"));
    });
  if (!codeFiles.length) fail(`No code files found in registry.json for "${existing.registry.name}".`);
  return codeFiles;
}

function makeCodeFileEntry(relativePath, rawContent) {
  const ext = path.extname(relativePath);
  const isTsLike = ext === ".tsx" || ext === ".ts";
  const strippedExt = ext === ".tsx" ? ".jsx" : ".js";
  const originalFilename = path.basename(relativePath);
  return {
    path: slash(relativePath),
    // Stripped filename for isTsLike sources (e.g. index.tsx -> index.jsx);
    // original name unchanged for everything else (.css/.json pass through).
    filename: isTsLike ? path.basename(relativePath, ext) + strippedExt : originalFilename,
    originalFilename,
    content: isTsLike ? stripTypesToJsx(rawContent) : rawContent,
    tsxCode: isTsLike ? rawContent : undefined,
  };
}

function stripTypesToJsx(source) {
  const ts = loadTypeScript();
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      removeComments: false,
    },
  });
  return result.outputText.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function loadTypeScript() {
  if (cachedTs) return cachedTs;
  cachedTs = requireFromScript(path.join(ROOT, "vault-main/node_modules/typescript"));
  return cachedTs;
}

// ---------------------------------------------------------------------------
// `update` - registry + codegen combined for an already-shipped component
// ---------------------------------------------------------------------------

async function runUpdate(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const existing = findComponent(slug);
  if (!existing) fail(`No registry entry found for "${slug}". Use \`registry\` for a brand-new component.`);

  const registryResult = await runRegistry(options);
  if (!registryResult.ok) return registryResult;

  const codegenResult = await runCodegen(options);
  return {
    ok: codegenResult.ok,
    summary: codegenResult.ok ? "update complete" : codegenResult.summary,
    details: [...registryResult.details, ...codegenResult.details],
  };
}

// ---------------------------------------------------------------------------
// Effect-scoped public/r rebuild (mirrors vault-main/scripts/build-registry.js
// for exactly one effect, instead of a full rebuild of every effect)
// ---------------------------------------------------------------------------

function buildPublicEffect(registryJson, effectDir, category) {
  const files = Array.isArray(registryJson.files) ? registryJson.files.filter((f) => f.type !== "registry:asset") : [];
  const fileContents = files.map((file) => ({
    path: file.path,
    type: file.path.endsWith(".css") ? "registry:style" : "registry:component",
    target: file.target,
    content: fs.readFileSync(path.join(effectDir, file.path), "utf8"),
  }));

  const isPro = registryJson.tier === "pro" || registryJson.tier === "paid";
  const publicFiles = isPro ? fileContents.map(({ content: _c, ...rest }) => rest) : fileContents;

  const registryItem = {
    name: registryJson.name,
    type: registryJson.type || "registry:component",
    title: registryJson.title,
    description: registryJson.description,
    dependencies: registryJson.dependencies || [],
    registryDependencies: registryJson.registryDependencies || [],
    exportName: registryJson.exportName,
    exportKind: registryJson.exportKind,
    tier: registryJson.tier,
    version: registryJson.version || "1.0.0",
    changelog: registryJson.changelog || [],
    ...(Array.isArray(registryJson.props) && registryJson.props.length ? { props: registryJson.props } : {}),
    ...(registryJson.remixer ? { remixer: registryJson.remixer } : {}),
    files: publicFiles,
  };

  fs.mkdirSync(DOCS_PUBLIC_REGISTRY_DIR, { recursive: true });
  const outputFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, `${registryJson.name}.json`);
  const action = fs.existsSync(outputFile) ? "updated" : "created";
  writeJson(outputFile, registryItem);

  const indexFile = path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json");
  const index = readJsonIfExists(indexFile) || { items: [] };
  const indexItem = {
    name: registryJson.name,
    type: registryJson.type || "registry:component",
    category: registryJson.category || category,
    categories: registryJson.categories || [registryJson.category || category],
    dependencies: registryJson.dependencies || [],
    registryDependencies: registryJson.registryDependencies || [],
    exportName: registryJson.exportName,
    exportKind: registryJson.exportKind,
    version: registryJson.version || "1.0.0",
    tier: registryJson.tier,
  };
  const existingIndex = index.items.findIndex((item) => item.name === registryJson.name);
  const indexAction = existingIndex === -1 ? "added" : "refreshed";
  if (existingIndex === -1) index.items.push(indexItem);
  else index.items[existingIndex] = indexItem;
  writeJson(indexFile, index);

  return { action, indexAction };
}

// ---------------------------------------------------------------------------
// Effect-scoped dist tarball rebuild (mirrors scripts/build-registry-dist.js for
// exactly one effect, instead of wiping and rebuilding every tarball)
// ---------------------------------------------------------------------------

function buildTarballForEffect(effectDir) {
  const registryFile = path.join(effectDir, "registry.json");
  if (!fs.existsSync(registryFile)) return null;
  const meta = readJson(registryFile);
  const pkgFile = path.join(effectDir, "package.json");
  const pkg = readJsonIfExists(pkgFile);
  if (!pkg) return null;

  fs.mkdirSync(DIST_DIR, { recursive: true });
  let tarball;
  try {
    const out = execSync("npm pack --silent", { cwd: effectDir, stdio: ["ignore", "pipe", "inherit"] });
    const tarballName = String(out || "").trim().split("\n").pop() || `${pkg.name.replace("/", "-")}-${pkg.version}.tgz`;
    const src = path.join(effectDir, tarballName);
    tarball = path.join(DIST_DIR, tarballName);
    fs.renameSync(src, tarball);
  } catch (error) {
    console.error(`tarball pack failed for ${relative(effectDir)}: ${error.message}`);
    return null;
  }

  const index = readJsonIfExists(DIST_INDEX_FILE) || [];
  const nextIndex = index.filter((entry) => entry.name !== pkg.name);
  nextIndex.push({ name: pkg.name, version: pkg.version, tarball: relative(tarball) });
  writeJson(DIST_INDEX_FILE, nextIndex);

  return { tarball };
}

// ---------------------------------------------------------------------------
// Phase 3 - Revert
// ---------------------------------------------------------------------------

function runRevert(options) {
  const slug = requireOption(options, "slug");
  validateSlug(slug);
  const existing = findComponent(slug);
  if (!existing) fail(`No registry entry found for "${slug}".`);

  const distFiles = listDistFilesForSlug(slug);
  const paths = [
    existing.dir,
    ROOT_INDEX_FILE,
    path.join(DOCS_PUBLIC_REGISTRY_DIR, `${slug}.json`),
    path.join(DOCS_PUBLIC_REGISTRY_DIR, "index.json"),
    ...distFiles,
    DIST_INDEX_FILE,
  ].filter((file) => fs.existsSync(file));

  const trackedPaths = paths.filter((file) => isGitTracked(file));
  if (!trackedPaths.length) {
    console.log(`No tracked revert paths found for ${slug}.`);
    return;
  }

  console.log("component:ship revert");
  console.log("\ntracked paths to restore from git:");
  console.log(trackedPaths.map(relative).join("\n"));

  if (!options.yes) {
    console.log("\nNo files changed. Re-run with --yes to apply this restore.");
    return;
  }

  execFileSync("git", ["restore", "--", ...trackedPaths.map(relative)], { cwd: ROOT, stdio: "inherit" });
  console.log(`Reverted tracked distribution files for ${slug}.`);
}

function listDistFilesForSlug(slug) {
  if (!fs.existsSync(DIST_DIR)) return [];
  return fs.readdirSync(DIST_DIR)
    .filter((file) => file.startsWith(`hyperiux-${slug}-`) && file.endsWith(".tgz"))
    .map((file) => path.join(DIST_DIR, file));
}

function isGitTracked(file) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", relative(file)], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vault header helpers
// ---------------------------------------------------------------------------

function vaultHeaderFor(ext) {
  return ext === ".css" ? `/* ${VAULT_HEADER_TEXT} */` : `// ${VAULT_HEADER_TEXT}`;
}

function hasVaultHeader(content) {
  return content.split("\n", 1)[0].includes(VAULT_HEADER_TEXT);
}

function withVaultHeader(content, ext) {
  if (!HEADER_EXTENSIONS.has(ext) || hasVaultHeader(content)) return content;
  return `${vaultHeaderFor(ext)}\n${content}`;
}

function stripVaultHeader(content) {
  const lines = content.split("\n");
  if (lines[0]?.includes(VAULT_HEADER_TEXT)) return lines.slice(1).join("\n");
  return content;
}

function copyDistributableFilesWithHeader(files, destDir) {
  for (const file of files) {
    const dest = path.join(destDir, file.relativePath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const raw = fs.readFileSync(file.absolutePath, "utf8");
    const portable = withPortableReducedMotion(raw, file.extension);
    fs.writeFileSync(dest, withVaultHeader(portable, file.extension));
  }
}

// ---------------------------------------------------------------------------
// @/lib/motion portability: registry/codegen output gets a self-contained
// matchMedia hook; docs/demo source keeps importing the real @/lib/motion.
// ---------------------------------------------------------------------------

function withPortableReducedMotion(content, ext) {
  if (!HEADER_EXTENSIONS.has(ext) || ext === ".css") return content;

  const match = content.match(REDUCED_MOTION_LIB_IMPORT_RE);
  if (!match) return content;

  const specifiers = match[1].split(",").map((s) => s.trim()).filter(Boolean);
  if (!specifiers.length || !specifiers.every((s) => REDUCED_MOTION_EXPORTS.has(s))) {
    // Mixed with something we don't know how to inline - leave it alone
    // rather than guess at a partial transform.
    return content;
  }

  let next = content.replace(REDUCED_MOTION_LIB_IMPORT_RE, "");
  next = ensureNamedImport(next, "react", "useSyncExternalStore");

  const inlineDefs = specifiers
    .filter((name) => !new RegExp(`\\bfunction\\s+${name}\\b`).test(next))
    .map((name) => reducedMotionInlineSource(name))
    .join("\n\n");

  if (!inlineDefs) return next;

  // Insert right after the last import statement, so the inlined helper
  // reads like a normal module-level declaration rather than being buried
  // mid-file.
  const lines = next.split("\n");
  let lastImportIndex = -1;
  lines.forEach((line, index) => { if (/^\s*import\s/.test(line)) lastImportIndex = index; });
  lines.splice(lastImportIndex + 1, 0, "", inlineDefs);
  return lines.join("\n");
}

function reducedMotionInlineSource(name) {
  if (name === "prefersReducedMotion") {
    return [
      "function prefersReducedMotion() {",
      '  if (typeof window === "undefined") return false;',
      "",
      `  return window.matchMedia?.("${REDUCED_MOTION_QUERY}")?.matches ?? false;`,
      "}",
    ].join("\n");
  }
  return [
    "function usePrefersReducedMotion() {",
    "  return useSyncExternalStore(",
    "    (callback) => {",
    '      if (typeof window === "undefined") return () => {};',
    "",
    `      const mediaQueryList = window.matchMedia("${REDUCED_MOTION_QUERY}");`,
    '      mediaQueryList.addEventListener("change", callback);',
    "",
    '      return () => mediaQueryList.removeEventListener("change", callback);',
    "    },",
    `    () => (typeof window === "undefined" ? false : window.matchMedia?.("${REDUCED_MOTION_QUERY}")?.matches ?? false),`,
    "    () => false",
    "  );",
    "}",
  ].join("\n");
}

function ensureNamedImport(content, moduleSpecifier, importName) {
  const existingRe = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${moduleSpecifier}["'];?`);
  const existing = content.match(existingRe);
  if (existing) {
    const names = existing[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (names.includes(importName)) return content;
    return content.replace(existingRe, `import { ${[...names, importName].join(", ")} } from "${moduleSpecifier}";`);
  }
  // No existing import from this module - add a new one, right before the
  // first existing import so it stays with the rest of the import block.
  const firstImportMatch = content.match(/^\s*import\s/m);
  if (!firstImportMatch) return `import { ${importName} } from "${moduleSpecifier}";\n${content}`;
  const index = content.indexOf(firstImportMatch[0]);
  return `${content.slice(0, index)}import { ${importName} } from "${moduleSpecifier}";\n${content.slice(index)}`;
}

// ---------------------------------------------------------------------------
// Shared registry helpers
// ---------------------------------------------------------------------------

function findComponent(slug) {
  for (const category of listCategories()) {
    const dir = registryComponentDir(category, slug);
    const registryFile = path.join(dir, "registry.json");
    if (fs.existsSync(registryFile)) return { category, dir, registry: readJson(registryFile) };
  }
  return null;
}

function listCategories() {
  if (!fs.existsSync(REGISTRY_EFFECTS_DIR)) return [];
  return fs.readdirSync(REGISTRY_EFFECTS_DIR)
    .filter((entry) => !entry.startsWith("_"))
    .filter((entry) => fs.statSync(path.join(REGISTRY_EFFECTS_DIR, entry)).isDirectory())
    .sort();
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
      const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
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

function detectExportInfo(mainFile, explicitName) {
  requirePath(mainFile, `Main file not found: ${relative(mainFile)}`);
  const content = fs.readFileSync(mainFile, "utf8");
  const defaultNamed = content.match(/export\s+default\s+(?:function|class)\s+([A-Za-z_$][\w$]*)/);
  const defaultIdentifier = content.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;/);
  if (defaultNamed) return { exportName: defaultNamed[1], exportKind: "default" };
  if (defaultIdentifier) return { exportName: defaultIdentifier[1], exportKind: "default" };
  const named = [...content.matchAll(/export\s+(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  if (explicitName && named.includes(explicitName)) return { exportName: explicitName, exportKind: "named" };
  if (named.length === 1) return { exportName: named[0], exportKind: "named" };
  if (/export\s+default\b/.test(content)) return { exportName: explicitName, exportKind: "default" };
  fail(`Unable to detect export from ${relative(mainFile)}. Pass --export-name and --export-kind.`);
}

function makeRegistryJson({ slug, version, title, description, category, tier, dependencies, date, summary, main, exportName, exportKind, files, props }) {
  const remixerControls = (props || []).filter((prop) => prop.remixer?.control);
  return {
    name: slug,
    version,
    changelog: [{ version, date, summary, breaking: false }],
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
    props: props || [],
    remixer: { enabled: remixerControls.length > 0, layout: "panel", copyCode: { includeOnlyPublicProps: true } },
  };
}

function makePackageJson(registryJson, version, existingInput = {}) {
  // readJsonIfExists() returns null (not undefined) when a component has no
  // package.json yet, so the parameter default doesn't cover that case.
  const existing = existingInput || {};
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
  return files.map((file) => ({ path: file.relativePath, target: `src/components/effects/${slug}/${file.relativePath}` }));
}

function prependChangelog(changelog = [], entry) {
  return [entry, ...changelog.filter((item) => item.version !== entry.version)];
}

function resolveSyncVersion(currentVersion, options) {
  if (options.versionBump === false) {
    if (options.version || options.bump) fail("--no-version-bump cannot be combined with --version or --bump.");
    return currentVersion;
  }
  if (!options.version && !options.bump) fail("Pass --bump patch|minor|major, --version x.y.z, or --no-version-bump.");
  if (options.version) {
    validateVersion(options.version);
    return options.version;
  }
  if (!["patch", "minor", "major"].includes(options.bump)) fail("--bump must be patch, minor, or major.");
  return bumpVersion(currentVersion || "1.0.0", options.bump);
}

function bumpVersion(version, bump) {
  const [major, minor, patch] = version.split(".").map((part) => Number.parseInt(part, 10));
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function updateRootIndex(registryJson, category) {
  const entries = readRootIndex().filter((entry) => entry.name !== registryJson.name);
  entries.push({ ...registryJson, registryPath: `registry/effects/${category}/${registryJson.name}/registry.json` });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  writeJson(ROOT_INDEX_FILE, entries);
}

function readRootIndex() {
  return readJsonIfExists(ROOT_INDEX_FILE) || [];
}

function resolveFreeRepoPath(options) {
  return path.resolve(ROOT, options.freeRepoPath || "../hyperiux-components");
}

function ensureFreeMirrorReady(tier, options) {
  if (tier !== "free" || options.skipFreeMirror) return;
  const repoPath = resolveFreeRepoPath(options);
  requirePath(repoPath, `Free-tier mirror repo not found: ${repoPath}. Pass --skip-free-mirror to skip intentionally.`);
}

function syncFreeMirror(tier, registryDir, options) {
  if (tier !== "free" || options.skipFreeMirror) return;
  const repoPath = resolveFreeRepoPath(options);
  const registryJson = readJson(path.join(registryDir, "registry.json"));
  const destDir = path.join(repoPath, "registry", "effects", registryJson.category, registryJson.name);
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(registryDir, destDir, { recursive: true });
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

function docsComponentDir(slug) {
  return path.join(DOCS_COMPONENTS_DIR, slug);
}

function registryComponentDir(category, slug) {
  return path.join(REGISTRY_EFFECTS_DIR, category, slug);
}

// ---------------------------------------------------------------------------
// CLI / IO utilities
// ---------------------------------------------------------------------------

function parseCli(argv) {
  const command = argv[0];
  const rest = argv.slice(1);
  const options = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) fail(`Unexpected argument "${arg}"`);
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    if (rawKey.startsWith("no-")) {
      options[toCamelCase(rawKey.slice(3))] = false;
      continue;
    }
    const key = toCamelCase(rawKey);
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

function printResult(command, slug, result) {
  console.log(`component:ship ${command} - ${slug}\n`);
  for (const detail of result.details || []) console.log(detail);
  console.log(`\n${result.ok ? "PASSED" : "FAILED"}: ${result.summary}`);
  if (!result.ok) process.exitCode = 1;
}

function promptYesNoQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
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

function fail(message) {
  throw new Error(message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
