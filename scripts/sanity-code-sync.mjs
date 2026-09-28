#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(path.join(__dirname, ".."));
const COMMANDS = new Set(["diff", "sync"]);
const CODE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".css", ".json"]);
const requireFromScript = createRequire(import.meta.url);
let cachedTs = null;

export function parseCli(argv) {
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

export async function run(argv = process.argv.slice(2)) {
  const { command, options } = parseCli(argv);

  if (!COMMANDS.has(command)) {
    fail(`Unknown command "${command}". Use one of: ${[...COMMANDS].join(", ")}`);
  }

  const plan = await createSanityCodePlan(options);
  printPlan(command, plan, options);

  if (command === "diff" || options.dryRun || !options.yes) {
    if (command === "sync" && !options.yes) {
      console.log("\nNo Sanity changes written. Re-run with --yes to apply this sync.");
    }
    return plan;
  }

  if (!plan.document?._id) fail("Cannot sync because no Sanity document was found.");
  if (plan.errors.length) fail(`Cannot sync because the plan has errors:\n- ${plan.errors.join("\n- ")}`);
  if (!plan.changed.length && !plan.creatable.length) {
    console.log("\nNo Sanity changes needed.");
    return plan;
  }

  const nextBody = buildNextBody(plan, options);
  await patchSanityBody(plan.document._id, nextBody, options, plan.document);
  console.log(`\nSynced ${plan.changed.length + plan.created.length} code block(s) to Sanity (draft: ${plan.document._id}).`);
  return plan;
}

export async function createSanityCodePlan(options) {
  const slug = requireOption(options, "slug");
  const registry = readRegistryForSlug(slug);
  const registryFiles = readRegistryCodeFiles(registry);
  const document = await fetchSanityDocument(registry, options);

  if (!document) {
    return {
      slug,
      registry,
      registryFiles,
      document: null,
      blocks: [],
      changed: [],
      unchanged: [],
      missing: registryFiles,
      creatable: options.createMissing ? registryFiles : [],
      created: [],
      stale: [],
      skipped: [],
      errors: [`No Sanity effectContent document found for ${registry.category}/${slug}.`],
    };
  }

  return buildPlanFromDocument({
    slug,
    registry,
    registryFiles,
    document,
    createMissing: Boolean(options.createMissing),
  });
}

export function buildPlanFromDocument({ slug, registry, registryFiles, document, createMissing = false }) {
  const body = Array.isArray(document.body) ? document.body : [];
  const blocks = collectCodeBlocks(body);
  const skipped = blocks.filter((block) => !block.filename);
  const matchableBlocks = blocks.filter((block) => block.filename);
  const registryMatches = new Map();
  const changed = [];
  const unchanged = [];
  const stale = [];
  const errors = [];

  for (const block of matchableBlocks) {
    const match = matchRegistryFile(block.filename, registryFiles);
    if (match.error) {
      errors.push(`body[${block.index}] filename "${block.filename}": ${match.error}`);
      continue;
    }
    if (!match.file) {
      stale.push(block);
      continue;
    }

    registryMatches.set(match.file.path, true);
    const item = { block, file: match.file, nextCode: match.file.content };

    const codeMatches = (block.code || "") === match.file.content;
    const tsxMatches = match.file.tsxCode === undefined || (block.tsxCode || "") === match.file.tsxCode;

    if (codeMatches && tsxMatches) {
      unchanged.push(item);
    } else {
      changed.push(item);
    }
  }

  // A block's filename doesn't always match the registry file's own name
  // (e.g. a "main" component file registered as index.tsx can be authored
  // in Sanity under the component's display name, like "ArrowFillButton").
  // If exactly one non-usage block is still unmatched and exactly one
  // registry file is still unclaimed, assume they're the same file under a
  // different name. "page"/"layout" are excluded - those are usage/demo code
  // conventions (page-transitions uses "layout" instead of "page"), which
  // this script intentionally leaves untouched, not stray component files.
  const unclaimedFiles = registryFiles.filter((file) => !registryMatches.has(file.path));
  const USAGE_CODE_FILENAMES = new Set(["page", "layout"]);
  const stalePairingCandidates = stale.filter((block) => !USAGE_CODE_FILENAMES.has(block.filename));
  if (stalePairingCandidates.length === 1 && unclaimedFiles.length === 1) {
    const block = stalePairingCandidates[0];
    const file = unclaimedFiles[0];
    stale.splice(stale.indexOf(block), 1);
    registryMatches.set(file.path, true);
    const item = { block, file, nextCode: file.content };
    const codeMatches = (block.code || "") === file.content;
    const tsxMatches = file.tsxCode === undefined || (block.tsxCode || "") === file.tsxCode;
    (codeMatches && tsxMatches ? unchanged : changed).push(item);
  }

  const missing = registryFiles.filter((file) => !registryMatches.has(file.path));
  const creatable = createMissing ? missing : [];

  return {
    slug,
    registry,
    registryFiles,
    document,
    blocks,
    changed,
    unchanged,
    missing,
    creatable,
    created: [],
    stale,
    skipped,
    errors,
  };
}

export function buildNextBody(plan, options = {}) {
  const body = Array.isArray(plan.document?.body) ? structuredClone(plan.document.body) : [];
  const changedByIndex = new Map(plan.changed.map((item) => [item.block.index, item]));

  for (const [index, item] of changedByIndex) {
    const nextBlock = {
      ...body[index],
      code: item.nextCode,
      filename: body[index].filename || item.file.filenameNoExt,
    };
    if (item.file.tsxCode !== undefined) nextBlock.tsxCode = item.file.tsxCode;
    body[index] = nextBlock;
  }

  if (options.createMissing) {
    const insertAt = findCodeBlockInsertIndex(body);
    const createdBlocks = plan.creatable.map((file) => makeCodeBlock(file));
    body.splice(insertAt, 0, ...createdBlocks);
    plan.created = createdBlocks;
  }

  return body;
}

export function collectCodeBlocks(body = []) {
  return body
    .map((block, index) => ({ ...block, index }))
    .filter((block) => block?._type === "effectCodeBlock");
}

export function matchRegistryFile(filename, registryFiles) {
  const normalized = slash(filename).trim();
  const exact = registryFiles.find((file) => file.path === normalized);
  if (exact) return { file: exact };

  const basenameMatches = registryFiles.filter((file) => path.basename(file.path) === normalized);
  if (basenameMatches.length === 1) return { file: basenameMatches[0] };
  if (basenameMatches.length > 1) {
    return {
      error: `ambiguous basename match [${basenameMatches.map((file) => file.path).join(", ")}]`,
    };
  }

  // Sanity code blocks store extension-less filenames (e.g. "index" for
  // index.tsx) - fall back to matching the registry file's basename with its
  // extension stripped.
  const noExtMatches = registryFiles.filter((file) => file.filenameNoExt === normalized);
  if (noExtMatches.length === 1) return { file: noExtMatches[0] };
  if (noExtMatches.length > 1) {
    return {
      error: `ambiguous filename match [${noExtMatches.map((file) => file.path).join(", ")}]`,
    };
  }

  return { file: null };
}

function readRegistryForSlug(slug) {
  const registryEffectsDir = path.join(getRoot(), "registry", "effects");
  for (const category of fs.readdirSync(registryEffectsDir)) {
    const categoryDir = path.join(registryEffectsDir, category);
    if (!fs.statSync(categoryDir).isDirectory()) continue;

    const registryFile = path.join(categoryDir, slug, "registry.json");
    if (!fs.existsSync(registryFile)) continue;

    const registryJson = readJson(registryFile);
    return {
      ...registryJson,
      category: registryJson.category || category,
      dir: path.dirname(registryFile),
      registryPath: registryFile,
    };
  }

  fail(`No registry component found for slug "${slug}".`);
}

function readRegistryCodeFiles(registry) {
  const files = Array.isArray(registry.files) ? registry.files : [];
  const codeFiles = files
    .filter((file) => file.type !== "registry:asset")
    .filter((file) => CODE_EXTENSIONS.has(path.extname(file.path || "")))
    .map((file) => {
      const sourcePath = path.join(registry.dir, file.path);
      if (!fs.existsSync(sourcePath)) fail(`Registry file missing: ${relative(sourcePath)}`);
      return makeCodeFileEntry(file.path, fs.readFileSync(sourcePath, "utf8"));
    });

  if (!codeFiles.length) fail(`No code files found in registry.json for "${registry.name}".`);
  return codeFiles;
}

// This only syncs component source from the registry. Usage/demo code
// (the /demo page.tsx) is authored and maintained directly in Sanity and is
// intentionally left untouched here.

// .tsx/.ts source is kept as-is for the tsxCode field; the `code` (JSX)
// field gets the same source with TS types/interfaces stripped via the
// TypeScript compiler (jsx: "preserve" keeps JSX syntax untouched, only
// type-level constructs are erased). Other extensions (css/json) pass
// through unchanged with no tsxCode.
function makeCodeFileEntry(relativePath, rawContent) {
  const ext = path.extname(relativePath);
  const isTsLike = ext === ".tsx" || ext === ".ts";

  return {
    path: slash(relativePath),
    filename: path.basename(relativePath),
    filenameNoExt: path.basename(relativePath, ext),
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
  const tsEntry = path.join(getRoot(), "apps/docs/node_modules/typescript");
  cachedTs = requireFromScript(tsEntry);
  return cachedTs;
}

// Syncs are draft-only: they never touch the published document directly.
// The working document is drafts.<publishedId> - cloned from the published
// doc the first time, or its own existing content if a draft already
// exists (so in-progress edits in Studio aren't clobbered). Nothing goes
// live until someone publishes it manually in Studio.
async function fetchSanityDocument(registry, options) {
  if (options.fixture) return readJson(path.resolve(getRoot(), options.fixture));

  const client = getSanityConfig();
  // Registry folder/name and Sanity's effectSlug are usually identical, but
  // can drift (e.g. registry "char-stagger-button" vs Sanity
  // "character-stagger-button") - --sanity-slug overrides the lookup value
  // without renaming anything on disk.
  const sanitySlug = options.sanitySlug || registry.name;
  const sanityCategory = options.sanityCategory || registry.category;
  const published = await queryFirstSanityDocument(client, {
    query: `*[_type == "effectContent" && effectSlug == $slug && categorySlug == $category && !(_id in path("drafts.**"))]{...}`,
    params: { "$slug": JSON.stringify(sanitySlug), "$category": JSON.stringify(sanityCategory) },
    context: `${sanityCategory}/${sanitySlug}`,
  });

  if (published) {
    const draftId = `drafts.${published._id}`;
    const draft = await queryFirstSanityDocument(client, {
      query: `*[_id == $id]{...}`,
      params: { "$id": JSON.stringify(draftId) },
      context: draftId,
    });

    return { ...(draft || published), _id: draftId };
  }

  // No published document exists - the component may still have a
  // draft-only effectContent doc (created in Studio but never published).
  const draftOnly = await queryFirstSanityDocument(client, {
    query: `*[_type == "effectContent" && effectSlug == $slug && categorySlug == $category && _id in path("drafts.**")]{...}`,
    params: { "$slug": JSON.stringify(sanitySlug), "$category": JSON.stringify(sanityCategory) },
    context: `${sanityCategory}/${sanitySlug} (draft-only)`,
  });

  return draftOnly || null;
}

async function queryFirstSanityDocument(client, { query, params, context }) {
  const url = new URL(`${client.baseUrl}/data/query/${client.dataset}`);
  url.searchParams.set("query", query);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetchSanity(url, {
    headers: { Authorization: `Bearer ${client.token}` },
  }, "query Sanity document");

  if (!response.ok) {
    const body = await response.text();
    fail(`Sanity query failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = await response.json();
  const results = data.result || [];
  if (results.length > 1) {
    fail(`Sanity query returned ${results.length} documents for ${context}. Resolve duplicates before syncing.`);
  }
  return results[0] || null;
}

async function patchSanityBody(documentId, body, options, baseDoc) {
  if (options.fixture) {
    const fixturePath = path.resolve(getRoot(), options.fixture);
    const fixture = readJson(fixturePath);
    writeJson(fixturePath, { ...fixture, body });
    return;
  }

  const client = getSanityConfig();
  const url = `${client.baseUrl}/data/mutate/${client.dataset}`;
  const draftDoc = { ...baseDoc, _id: documentId, body };
  delete draftDoc._rev;

  const response = await fetchSanity(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${client.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mutations: [{ createOrReplace: draftDoc }],
    }),
  }, "patch Sanity document");

  if (!response.ok) {
    const responseBody = await response.text();
    fail(`Sanity mutation failed (${response.status}): ${responseBody.slice(0, 500)}`);
  }
}

function getSanityConfig() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_API_TOKEN;
  const apiVersion = process.env.SANITY_API_VERSION || "2024-01-01";
  const baseUrl = process.env.HYPERIUX_SANITY_API_BASE || (projectId ? `https://${projectId}.api.sanity.io/v${apiVersion}` : "");

  if (!projectId && !process.env.HYPERIUX_SANITY_API_BASE) fail("NEXT_PUBLIC_SANITY_PROJECT_ID is required.");
  if (!dataset) fail("NEXT_PUBLIC_SANITY_DATASET is required.");
  if (!token) fail("SANITY_API_TOKEN is required.");

  return { projectId, dataset, token, baseUrl };
}

async function fetchSanity(url, options, action) {
  try {
    return await fetch(url, options);
  } catch (error) {
    const cause = error.cause;
    const details = [
      error.message,
      cause?.code,
      cause?.message,
      cause?.hostname ? `host=${cause.hostname}` : null,
    ].filter(Boolean).join(" | ");
    fail(`Could not ${action}: ${details}`);
  }
}

function printPlan(command, plan, options = {}) {
  console.log(`sanity:code:${command}`);
  console.log("\ncomponent:");
  console.log(`${plan.registry.category}/${plan.slug}@${plan.registry.version || "unknown"}`);
  console.log("\nsanity document:");
  console.log(plan.document?._id || "missing");

  printList("registry files", plan.registryFiles.map((file) => file.path));
  printList("matching changed blocks", plan.changed.map((item) => `${item.file.path} body[${item.block.index}]`));
  printList("matching unchanged blocks", plan.unchanged.map((item) => `${item.file.path} body[${item.block.index}]`));
  printList("missing sanity blocks", plan.missing.map((file) => file.path));
  printList("stale sanity blocks", plan.stale.map((block) => `${block.filename} body[${block.index}]`));
  printList("skipped blocks", plan.skipped.map((block) => `body[${block.index}] has no filename`));
  printList("errors", plan.errors);

  if (options.createMissing) {
    printList("blocks to create", plan.creatable.map((file) => file.path));
  } else if (plan.missing.length) {
    console.log("\ncreate missing:");
    console.log("pass --create-missing to append missing registry files as Sanity code blocks");
  }
}

function printList(label, values) {
  console.log(`\n${label}:`);
  console.log(values.length ? values.map((value) => `- ${value}`).join("\n") : "none");
}

function makeCodeBlock(file) {
  const block = {
    _type: "effectCodeBlock",
    _key: makeKey(`code-${file.path}`),
    filename: file.filenameNoExt,
    code: file.content,
  };
  if (file.tsxCode !== undefined) block.tsxCode = file.tsxCode;
  return block;
}

function findCodeBlockInsertIndex(body) {
  let index = -1;
  body.forEach((block, blockIndex) => {
    if (block?._type === "effectCodeBlock") index = blockIndex;
  });
  return index === -1 ? body.length : index + 1;
}

function makeKey(value) {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function requireOption(options, key) {
  if (options[key] === undefined || options[key] === "") fail(`Missing required --${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}.`);
  return options[key];
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function relative(file) {
  return slash(path.relative(getRoot(), file)) || ".";
}

function getRoot() {
  return path.resolve(process.env.HYPERIUX_WORKFLOW_ROOT || DEFAULT_ROOT);
}

function fail(message) {
  throw new Error(message);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
