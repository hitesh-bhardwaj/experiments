import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const workflowScript = path.join(repoRoot, "scripts", "component-workflow.mjs");
const tempRoots = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("component workflow commands", () => {
  it("component:new creates registry artifacts and root index entries", () => {
    const root = createFixtureRepo();

    runWorkflow(root, [
      "new",
      "--slug",
      "sample-card",
      "--category",
      "components",
      "--tier",
      "pro",
      "--title",
      "Sample Card",
      "--description",
      "A sample card for workflow tests",
      "--skip-build",
      "--skip-verify",
    ]);

    const registry = readJson(root, "registry/effects/components/sample-card/registry.json");
    const pkg = readJson(root, "registry/effects/components/sample-card/package.json");
    const index = readJson(root, "registry/index.json");

    expect(registry).toMatchObject({
      name: "sample-card",
      version: "1.0.0",
      category: "components",
      tier: "pro",
      previewUrl: "/demo/sample-card",
      exportName: "SampleCard",
      exportKind: "default",
      dependencies: ["gsap"],
    });
    expect(registry.files.map((file) => file.path)).toEqual([
      "index.jsx",
      "Helper.jsx",
      "styles.css",
    ]);
    expect(pkg).toMatchObject({
      name: "@hyperiux/sample-card",
      version: "1.0.0",
      main: "index.jsx",
    });
    expect(index).toHaveLength(1);
    expect(index[0].registryPath).toBe("registry/effects/components/sample-card/registry.json");
    expect(fs.existsSync(path.join(root, "registry/effects/components/sample-card/Demo.jsx"))).toBe(false);
  });

  it("component:sync bumps versions and can also sync without a version bump", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);

    writeFile(root, "apps/docs/src/components/sample-card/Helper.jsx", "export function Helper() { return <span>updated</span>; }\n");
    runWorkflow(root, [
      "sync",
      "--slug",
      "sample-card",
      "--bump",
      "patch",
      "--summary",
      "Updated helper",
      "--skip-build",
      "--skip-verify",
    ]);

    let registry = readJson(root, "registry/effects/components/sample-card/registry.json");
    let pkg = readJson(root, "registry/effects/components/sample-card/package.json");
    expect(registry.version).toBe("1.0.1");
    expect(pkg.version).toBe("1.0.1");
    expect(registry.changelog[0]).toMatchObject({
      version: "1.0.1",
      summary: "Updated helper",
      breaking: false,
    });
    expect(readFile(root, "registry/effects/components/sample-card/Helper.jsx")).toContain("updated");

    writeFile(root, "apps/docs/src/components/sample-card/Helper.jsx", "export function Helper() { return <span>synced</span>; }\n");
    runWorkflow(root, [
      "sync",
      "--slug",
      "sample-card",
      "--no-version-bump",
      "--summary",
      "Ignored for no-version sync",
      "--skip-build",
      "--skip-verify",
    ]);

    registry = readJson(root, "registry/effects/components/sample-card/registry.json");
    pkg = readJson(root, "registry/effects/components/sample-card/package.json");
    expect(registry.version).toBe("1.0.1");
    expect(pkg.version).toBe("1.0.1");
    expect(registry.changelog).toHaveLength(2);
    expect(registry.changelog[0].summary).toBe("Updated helper");
    expect(readFile(root, "registry/effects/components/sample-card/Helper.jsx")).toContain("synced");
  });

  it("component:rename updates slug metadata and adds an alias", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);

    runWorkflow(root, [
      "rename",
      "--from",
      "sample-card",
      "--to",
      "renamed-card",
      "--bump",
      "major",
      "--summary",
      "Renamed slug",
      "--skip-build",
      "--skip-verify",
    ]);

    const registry = readJson(root, "registry/effects/components/renamed-card/registry.json");
    const pkg = readJson(root, "registry/effects/components/renamed-card/package.json");
    const index = readJson(root, "registry/index.json");
    const aliases = readFile(root, "apps/docs/src/lib/effect-slugs.js");

    expect(fs.existsSync(path.join(root, "registry/effects/components/sample-card"))).toBe(false);
    expect(registry.name).toBe("renamed-card");
    expect(registry.version).toBe("2.0.0");
    expect(registry.previewUrl).toBe("/demo/renamed-card");
    expect(registry.files[0].target).toBe("src/components/effects/renamed-card/index.jsx");
    expect(pkg.name).toBe("@hyperiux/renamed-card");
    expect(index.map((entry) => entry.name)).toEqual(["renamed-card"]);
    expect(aliases).toContain('slug: "renamed-card"');
    expect(aliases).toContain('"sample-card"');
  });

  it("component:move changes category paths and metadata", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);

    runWorkflow(root, [
      "move",
      "--slug",
      "sample-card",
      "--from",
      "components",
      "--to",
      "navigation",
      "--bump",
      "minor",
      "--summary",
      "Moved category",
      "--skip-build",
      "--skip-verify",
    ]);

    const registry = readJson(root, "registry/effects/navigation/sample-card/registry.json");
    const index = readJson(root, "registry/index.json");

    expect(fs.existsSync(path.join(root, "registry/effects/components/sample-card"))).toBe(false);
    expect(registry.category).toBe("navigation");
    expect(registry.version).toBe("1.1.0");
    expect(index[0].registryPath).toBe("registry/effects/navigation/sample-card/registry.json");
  });

  it("component:delete removes docs source, registry artifacts, indexes, aliases, dist files, and mirror files", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root, { tier: "free" });
    writeFile(root, "apps/docs/public/r/sample-card.json", JSON.stringify({ name: "sample-card", version: "1.0.0", files: [] }, null, 2));
    writeFile(root, "apps/docs/public/r/index.json", JSON.stringify({ items: [{ name: "sample-card" }] }, null, 2));
    writeFile(root, "registry/dist/hyperiux-sample-card-1.0.0.tgz", "tgz\n");
    writeFile(root, "registry/dist/registry-index.json", JSON.stringify([{ name: "@hyperiux/sample-card", version: "1.0.0", tarball: "registry/dist/hyperiux-sample-card-1.0.0.tgz" }], null, 2));
    writeFile(root, "apps/docs/src/lib/effect-slugs.js", [
      "const effectSlugAliasGroups = [",
      "  {",
      '    slug: "sample-card",',
      '    aliases: ["old-sample-card"],',
      "  },",
      "];",
      "",
    ].join("\n"));

    const mirrorRoot = path.join(root, "mirror");
    fs.cpSync(
      path.join(root, "registry/effects/components/sample-card"),
      path.join(mirrorRoot, "registry/effects/components/sample-card"),
      { recursive: true }
    );
    writeFile(mirrorRoot, "registry/index.json", JSON.stringify([{ name: "sample-card" }], null, 2));

    const plan = runWorkflow(root, [
      "delete",
      "--slug",
      "sample-card",
      "--free-repo-path",
      "mirror",
      "--skip-build",
    ]);
    expect(plan).toContain("No files changed");
    expect(fs.existsSync(path.join(root, "apps/docs/src/components/sample-card"))).toBe(true);

    runWorkflow(root, [
      "delete",
      "--slug",
      "sample-card",
      "--free-repo-path",
      "mirror",
      "--skip-build",
      "--yes",
    ]);

    expect(fs.existsSync(path.join(root, "apps/docs/src/components/sample-card"))).toBe(false);
    expect(fs.existsSync(path.join(root, "registry/effects/components/sample-card"))).toBe(false);
    expect(fs.existsSync(path.join(root, "apps/docs/public/r/sample-card.json"))).toBe(false);
    expect(fs.existsSync(path.join(root, "registry/dist/hyperiux-sample-card-1.0.0.tgz"))).toBe(false);
    expect(fs.existsSync(path.join(mirrorRoot, "registry/effects/components/sample-card"))).toBe(false);
    expect(readJson(root, "registry/index.json")).toEqual([]);
    expect(readJson(root, "apps/docs/public/r/index.json").items).toEqual([]);
    expect(readJson(root, "registry/dist/registry-index.json")).toEqual([]);
    expect(readJson(mirrorRoot, "registry/index.json")).toEqual([]);
    expect(readFile(root, "apps/docs/src/lib/effect-slugs.js")).not.toContain("sample-card");
  });

  it("component:diff reports source, metadata, and git changes", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);
    initGit(root);
    writeFile(root, "apps/docs/src/components/sample-card/Helper.jsx", "export function Helper() { return <span>changed</span>; }\n");

    const output = runWorkflow(root, ["diff", "--slug", "sample-card", "--skip-free-mirror"]);

    expect(output).toContain("component:diff");
    expect(output).toContain("docs vs registry files:");
    expect(output).toContain("content differs: Helper.jsx");
    expect(output).toContain("docs source git changes:");
    expect(output).toContain("apps/docs/src/components/sample-card/Helper.jsx");
  });

  it("component:revert restores tracked distribution changes and skips untracked tarballs", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);
    writeFile(root, "apps/docs/public/r/sample-card.json", JSON.stringify({ name: "sample-card", version: "1.0.0", files: [] }, null, 2));
    writeFile(root, "apps/docs/public/r/index.json", JSON.stringify({ items: [{ name: "sample-card" }] }, null, 2));
    writeFile(root, "registry/dist/registry-index.json", JSON.stringify([], null, 2));
    initGit(root);

    const registryFile = "registry/effects/components/sample-card/registry.json";
    const before = readFile(root, registryFile);
    const registry = JSON.parse(before);
    registry.version = "9.9.9";
    writeFile(root, registryFile, JSON.stringify(registry, null, 2));
    writeFile(root, "registry/dist/hyperiux-sample-card-9.9.9.tgz", "not tracked\n");

    const plan = runWorkflow(root, ["revert", "--slug", "sample-card"]);
    expect(plan).toContain("No files changed");
    expect(readJson(root, registryFile).version).toBe("9.9.9");

    const output = runWorkflow(root, ["revert", "--slug", "sample-card", "--yes"]);
    expect(output).toContain("untracked generated paths skipped:");
    expect(output).toContain("Reverted tracked distribution files for sample-card.");
    expect(readFile(root, registryFile)).toBe(before);
    expect(fs.existsSync(path.join(root, "registry/dist/hyperiux-sample-card-9.9.9.tgz"))).toBe(true);
  });

  it("component:verify passes a complete fixture and catches mirror drift", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root, { tier: "free" });
    writeFile(root, "apps/docs/public/r/sample-card.json", JSON.stringify({ name: "sample-card", version: "1.0.0", files: [{ path: "index.jsx", content: "source" }] }, null, 2));
    writeFile(root, "apps/docs/public/r/index.json", JSON.stringify({ items: [{ name: "sample-card" }] }, null, 2));
    writeFile(root, "registry/dist/hyperiux-sample-card-1.0.0.tgz", "tgz\n");
    writeFile(root, "registry/dist/registry-index.json", JSON.stringify([{ name: "@hyperiux/sample-card", version: "1.0.0" }], null, 2));

    const mirrorRoot = path.join(root, "mirror");
    fs.cpSync(
      path.join(root, "registry/effects/components/sample-card"),
      path.join(mirrorRoot, "registry/effects/components/sample-card"),
      { recursive: true }
    );
    writeFile(mirrorRoot, "registry/index.json", JSON.stringify([{ name: "sample-card" }], null, 2));
    initGit(root);

    expect(runWorkflow(root, ["verify", "--slug", "sample-card", "--free-repo-path", "mirror"])).toContain("Verification passed");

    writeFile(mirrorRoot, "registry/effects/components/sample-card/index.jsx", "export default function Broken() { return null; }\n");
    expect(() => runWorkflow(root, ["verify", "--slug", "sample-card", "--free-repo-path", "mirror"])).toThrow(/Free mirror differs from source/);
  });

  it("component:verify ignores unrelated whitespace unless full diff check is requested", () => {
    const root = createFixtureRepo();
    createRegistryComponent(root);
    writeFile(root, "apps/docs/public/r/sample-card.json", JSON.stringify({ name: "sample-card", version: "1.0.0", files: [] }, null, 2));
    writeFile(root, "apps/docs/public/r/index.json", JSON.stringify({ items: [{ name: "sample-card" }] }, null, 2));
    writeFile(root, "registry/dist/hyperiux-sample-card-1.0.0.tgz", "tgz\n");
    writeFile(root, "registry/dist/registry-index.json", JSON.stringify([{ name: "@hyperiux/sample-card", version: "1.0.0" }], null, 2));
    writeFile(root, "unrelated.js", "const value = 1; \n");
    initGit(root);

    writeFile(root, "unrelated.js", "const value = 2; \n");

    expect(runWorkflow(root, ["verify", "--slug", "sample-card", "--skip-free-mirror"])).toContain("Verification passed");
    expect(() => runWorkflow(root, ["verify", "--slug", "sample-card", "--skip-free-mirror", "--full-diff-check"])).toThrow(/git diff --check failed/);
  });
});

function createFixtureRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hyperiux-workflow-"));
  tempRoots.push(root);

  writeFile(root, "apps/docs/src/components/sample-card/index.jsx", [
    'import gsap from "gsap";',
    'import { Helper } from "./Helper";',
    'import "./styles.css";',
    "",
    "export default function SampleCard() {",
    "  gsap.set({}, {});",
    "  return <Helper />;",
    "}",
    "",
  ].join("\n"));
  writeFile(root, "apps/docs/src/components/sample-card/Helper.jsx", "export function Helper() { return <span>helper</span>; }\n");
  writeFile(root, "apps/docs/src/components/sample-card/styles.css", ".sample { color: red; }\n");
  writeFile(root, "apps/docs/src/components/sample-card/Demo.jsx", "export default function Demo() { return null; }\n");
  writeFile(root, "apps/docs/scripts/build-registry.js", "console.log('fixture docs build');\n");
  writeFile(root, "scripts/build-registry.js", "console.log('fixture root build');\n");
  writeFile(root, "registry/index.json", "[]\n");
  writeFile(root, "apps/docs/public/r/index.json", JSON.stringify({ items: [] }, null, 2));
  writeFile(root, "apps/docs/src/lib/effect-slugs.js", [
    "const effectSlugAliasGroups = [",
    "];",
    "",
    "export function getEffectRouteSlug(slug) {",
    "  return slug;",
    "}",
    "",
  ].join("\n"));
  fs.mkdirSync(path.join(root, "registry/effects/components"), { recursive: true });
  fs.mkdirSync(path.join(root, "registry/effects/navigation"), { recursive: true });
  fs.mkdirSync(path.join(root, "registry/dist"), { recursive: true });

  return root;
}

function createRegistryComponent(root, options = {}) {
  runWorkflow(root, [
    "new",
    "--slug",
    "sample-card",
    "--category",
    "components",
    "--tier",
    options.tier || "pro",
    "--title",
    "Sample Card",
    "--description",
    "A sample card for workflow tests",
    "--skip-build",
    "--skip-verify",
    ...(options.tier === "free" ? ["--skip-free-mirror"] : []),
  ]);
}

function runWorkflow(root, args) {
  return execFileSync("node", [workflowScript, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      HYPERIUX_WORKFLOW_ROOT: root,
    },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function initGit(root) {
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.name", "Workflow Test"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
}

function writeFile(root, relativePath, content) {
  const file = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(root, relativePath) {
  return JSON.parse(readFile(root, relativePath));
}
