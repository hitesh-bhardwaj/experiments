import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { VAULT_ROOT, REPO_ROOT, walk } from "../helpers/route-harness.js";

// The CLI writes registry files straight into customers' projects, so a
// poisoned registry entry is a supply-chain attack on every installer.
// The CLI has its own write-path guard (see hyperiux-components
// packages/cli security-hardening.test.js, C1), but the registry should
// never *serve* an unsafe target in the first place - defence in depth.

const registryJsons = walk(path.join(REPO_ROOT, "registry/effects"), {
  include: (f) => path.basename(f) === "registry.json",
});
const publicJsons = walk(path.join(VAULT_ROOT, "public/r"), {
  include: (f) => f.endsWith(".json") && path.basename(f) !== "index.json",
});

function unsafePathReason(p) {
  if (typeof p !== "string" || p.length === 0) return "empty";
  if (p.includes("\0")) return "NUL byte";
  if (path.isAbsolute(p) || path.win32.isAbsolute(p)) return "absolute";
  if (/^[a-zA-Z]:/.test(p)) return "drive letter";
  if (p.split(/[\\/]/).includes("..")) return "parent segment";
  if (/^~/.test(p)) return "home expansion";
  if (/(^|[\\/])\.(git|env|ssh|npmrc|bashrc|zshrc)([\\/]|$)/.test(p)) return "sensitive dotfile";
  if (/(^|[\\/])node_modules([\\/]|$)/.test(p)) return "node_modules";
  if (/(^|[\\/])package(-lock)?\.json$/.test(p)) return "package manifest";
  return null;
}

function collectFileProblems(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf-8"));
  const problems = [];
  for (const entry of json.files || []) {
    for (const key of ["path", "target", "targetPath"]) {
      if (entry[key] === undefined) continue;
      const reason = unsafePathReason(entry[key]);
      if (reason) problems.push(`${path.relative(REPO_ROOT, file)} files[].${key}=${JSON.stringify(entry[key])} (${reason})`);
    }
  }
  if (json.name !== undefined && !/^[a-z0-9][a-z0-9-]*$/.test(json.name)) {
    problems.push(`${path.relative(REPO_ROOT, file)} name=${JSON.stringify(json.name)} is not a plain slug`);
  }
  for (const dep of json.registryDependencies || []) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(dep) && !/^https:\/\/vault\.hyperiux\.com\//.test(dep)) {
      problems.push(`${path.relative(REPO_ROOT, file)} registryDependency ${JSON.stringify(dep)} is neither a slug nor a vault.hyperiux.com URL`);
    }
  }
  for (const dep of json.dependencies || []) {
    // npm specs only - no git+/file:/http: specs that bypass the registry.
    if (/^(git\+|git:|file:|link:|https?:)|^[^@/]+\/[^/]+#/.test(dep)) {
      problems.push(`${path.relative(REPO_ROOT, file)} dependency ${JSON.stringify(dep)} is not an npm registry spec`);
    }
  }
  return problems;
}

describe("registry integrity", () => {
  it("found registry files to check", () => {
    expect(registryJsons.length).toBeGreaterThan(50);
    expect(publicJsons.length).toBeGreaterThan(50);
  });

  it("every private registry.json only targets safe relative paths", () => {
    expect(registryJsons.flatMap(collectFileProblems)).toEqual([]);
  });

  it("every public /r/*.json only targets safe relative paths", () => {
    expect(publicJsons.flatMap(collectFileProblems)).toEqual([]);
  });

  it("every files[].path in a private registry.json resolves inside its own effect directory", () => {
    const escapes = [];
    for (const file of registryJsons) {
      const dir = path.dirname(file);
      const json = JSON.parse(fs.readFileSync(file, "utf-8"));
      for (const entry of json.files || []) {
        const resolved = path.resolve(dir, entry.path || "");
        if (!resolved.startsWith(dir + path.sep)) escapes.push(`${path.relative(REPO_ROOT, file)} -> ${entry.path}`);
      }
    }
    expect(escapes).toEqual([]);
  });

  it("no registry source file is a symlink (a symlink could pull in files from outside the registry)", () => {
    const links = walk(path.join(REPO_ROOT, "registry/effects")).filter((f) => fs.lstatSync(f).isSymbolicLink());
    expect(links).toEqual([]);
  });
});
