import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildNextBody,
  buildPlanFromDocument,
  createSanityCodePlan,
  matchRegistryFile,
  run,
} from "../../scripts/sanity-code-sync.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
  delete process.env.HYPERIUX_WORKFLOW_ROOT;
});

describe("sanity code sync", () => {
  it("matches registry files by exact filename and unambiguous basename", () => {
    const files = [
      makeRegistryFile("index.jsx", "index"),
      makeRegistryFile("components/Button.jsx", "button"),
    ];

    expect(matchRegistryFile("index.jsx", files).file.path).toBe("index.jsx");
    expect(matchRegistryFile("Button.jsx", files).file.path).toBe("components/Button.jsx");
    expect(matchRegistryFile("Missing.jsx", files).file).toBe(null);
  });

  it("fails ambiguous basename matches", () => {
    const files = [
      makeRegistryFile("desktop/Button.jsx", "desktop"),
      makeRegistryFile("mobile/Button.jsx", "mobile"),
    ];

    expect(matchRegistryFile("Button.jsx", files).error).toContain("ambiguous basename match");
  });

  it("builds a plan that reports changed, unchanged, missing, stale, and skipped blocks", () => {
    const registryFiles = [
      makeRegistryFile("index.jsx", "new index"),
      makeRegistryFile("Helper.jsx", "same helper"),
      makeRegistryFile("styles.css", ".new {}"),
    ];
    const document = makeDocument([
      makeTextBlock("Intro"),
      makeCodeBlock("index.jsx", "old index"),
      makeCodeBlock("Helper.jsx", "same helper"),
      makeCodeBlock("old.jsx", "old file"),
      makeCodeBlock("another-old.jsx", "another old file"),
      { _type: "effectCodeBlock", _key: "nofile", code: "no filename" },
    ]);

    const plan = buildPlanFromDocument({
      slug: "sample-card",
      registry: { name: "sample-card", category: "components" },
      registryFiles,
      document,
    });

    // Two stale blocks + one missing file, on purpose: the "single unclaimed
    // pairing" heuristic in buildPlanFromDocument (see its own comment) only
    // fires for an exact 1-stale/1-missing count, since that's the only case
    // where "this is a rename" is a safe guess. Keeping stale at 2 here
    // means this test genuinely exercises "missing" and "stale" as
    // independent outcomes instead of accidentally tripping that heuristic
    // and folding them into "changed".
    expect(plan.changed.map((item) => item.file.path)).toEqual(["index.jsx"]);
    expect(plan.unchanged.map((item) => item.file.path)).toEqual(["Helper.jsx"]);
    expect(plan.missing.map((file) => file.path)).toEqual(["styles.css"]);
    expect(plan.stale.map((block) => block.filename)).toEqual(["old.jsx", "another-old.jsx"]);
    expect(plan.skipped).toHaveLength(1);
  });

  it("updates only changed code blocks and preserves other body content", () => {
    const registryFiles = [makeRegistryFile("index.jsx", "new index")];
    const textBlock = makeTextBlock("Do not touch");
    const document = makeDocument([
      textBlock,
      makeCodeBlock("index.jsx", "old index", { custom: "preserved" }),
    ]);
    const plan = buildPlanFromDocument({
      slug: "sample-card",
      registry: { name: "sample-card", category: "components" },
      registryFiles,
      document,
    });

    const nextBody = buildNextBody(plan);

    expect(nextBody[0]).toEqual(textBlock);
    expect(nextBody[1]).toMatchObject({
      _type: "effectCodeBlock",
      filename: "index.jsx",
      code: "new index",
      custom: "preserved",
    });
  });

  it("appends missing blocks only when createMissing is requested", () => {
    const registryFiles = [
      makeRegistryFile("index.jsx", "new index"),
      makeRegistryFile("Helper.jsx", "helper"),
    ];
    const document = makeDocument([makeTextBlock("Intro"), makeCodeBlock("index.jsx", "new index")]);
    const plan = buildPlanFromDocument({
      slug: "sample-card",
      registry: { name: "sample-card", category: "components" },
      registryFiles,
      document,
      createMissing: true,
    });

    const nextBody = buildNextBody(plan, { createMissing: true });

    expect(nextBody).toHaveLength(3);
    expect(nextBody[2]).toMatchObject({
      _type: "effectCodeBlock",
      filename: "Helper",
      code: "helper",
    });
  });

  it("supports fixture-backed diff and sync without touching Sanity", async () => {
    const root = createFixtureRepo();
    process.env.HYPERIUX_WORKFLOW_ROOT = root;
    const fixture = path.join(root, "sanity-doc.json");

    await run(["sync", "--slug", "sample-card", "--fixture", fixture, "--dry-run"]);
    expect(readJson(fixture).body[1].code).toBe("old index");

    await run(["sync", "--slug", "sample-card", "--fixture", fixture, "--yes"]);
    expect(readJson(fixture).body[1].code).toContain("new index");
  });

  it("creates a full plan from fixture registry files and document", async () => {
    const root = createFixtureRepo();
    process.env.HYPERIUX_WORKFLOW_ROOT = root;

    const plan = await createSanityCodePlan({
      slug: "sample-card",
      fixture: "sanity-doc.json",
      createMissing: true,
    });

    expect(plan.registry.category).toBe("components");
    expect(plan.changed.map((item) => item.file.path)).toEqual(["index.jsx"]);
    expect(plan.creatable.map((file) => file.path)).toEqual(["Helper.jsx"]);
  });
});

function createFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sanity-code-sync-"));
  tempRoots.push(root);

  writeJson(root, "registry/effects/components/sample-card/registry.json", {
    name: "sample-card",
    version: "1.0.0",
    category: "components",
    files: [
      { path: "index.jsx", target: "src/components/effects/sample-card/index.jsx" },
      { path: "Helper.jsx", target: "src/components/effects/sample-card/Helper.jsx" },
    ],
  });
  writeFile(root, "registry/effects/components/sample-card/index.jsx", "export default function SampleCard() { return 'new index'; }\n");
  writeFile(root, "registry/effects/components/sample-card/Helper.jsx", "export function Helper() { return 'helper'; }\n");
  writeJson(root, "sanity-doc.json", makeDocument([
    makeTextBlock("Intro"),
    makeCodeBlock("index.jsx", "old index"),
  ]));

  return root;
}

function makeDocument(body) {
  return {
    _id: "effect-content-sample-card",
    _type: "effectContent",
    categorySlug: "components",
    effectSlug: "sample-card",
    body,
  };
}

function makeTextBlock(text) {
  return {
    _type: "block",
    _key: `text-${text}`,
    style: "normal",
    children: [{ _type: "span", _key: `span-${text}`, text, marks: [] }],
    markDefs: [],
  };
}

function makeCodeBlock(filename, code, extra = {}) {
  return {
    _type: "effectCodeBlock",
    _key: `code-${filename || "missing"}`,
    filename,
    code,
    ...extra,
  };
}

function makeRegistryFile(filePath, content) {
  const ext = path.extname(filePath);
  return {
    path: filePath,
    filename: path.basename(filePath),
    filenameNoExt: path.basename(filePath, ext),
    content,
  };
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeJson(root, relativePath, value) {
  writeFile(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
