import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FREE_EFFECTS, FREE_LABEL, PRO_EFFECTS, TOTAL_EFFECTS, TOTAL_LABEL } from "./library-counts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");
const srcRoot = path.join(appRoot, "src");

const tierCounts = (items) =>
  items.reduce((counts, item) => ({ ...counts, [item.tier]: (counts[item.tier] || 0) + 1 }), {});

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

describe("library counts", () => {
  it.each([
    ["registry/index.json", () => readJson(path.join(appRoot, "../registry/index.json"))],
    ["public/r/index.json", () => readJson(path.join(appRoot, "public/r/index.json")).items],
  ])("match %s", (_, load) => {
    const items = load();
    expect(items).toHaveLength(TOTAL_EFFECTS);
    expect(tierCounts(items)).toEqual({ free: FREE_EFFECTS, pro: PRO_EFFECTS });
  });

  it("give the rounded labels", () => {
    expect(FREE_LABEL).toBe(`${Math.floor(FREE_EFFECTS / 10) * 10}+`);
    expect(TOTAL_LABEL).toBe(`${Math.floor(TOTAL_EFFECTS / 10) * 10}+`);
  });

  // llms.txt is a static file, so it can't import the constants - check it instead.
  it("match public/llms.txt", () => {
    const llms = fs.readFileSync(path.join(appRoot, "public/llms.txt"), "utf8");
    expect(llms).toContain(`${TOTAL_EFFECTS} effects (${FREE_EFFECTS} free, ${PRO_EFFECTS} Pro)`);
  });

  // Copy, metadata, JSON-LD and emails must read the counts from library-counts.js.
  it("are not hard-coded anywhere in src", () => {
    const skip = /template-demo|[\\/]demo[\\/]|\.test\.|library-counts\.js$/;
    const counts = /\b\d{2,3}\+\s*(?:free|pro|premium|core|effects?|components?|production|editable|interaction)/i;
    const exact = new RegExp(
      `\\b(?:${FREE_EFFECTS}|${PRO_EFFECTS}|${TOTAL_EFFECTS})\\s+(?:free|pro|effects?|components?|production)\\b`,
      "i",
    );
    // Count-named fields set to a literal, e.g. `totalEffects: 150` or `freeEffects = 56`.
    const field = /\b\w*(?:free|pro|total)\w*effects\w*\s*[:=]\s*(?:\w+\s*\?\s*)?[1-9]\d*/i;
    const offenders = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(jsx?|tsx?|mdx?)$/.test(entry.name) && !skip.test(full)) {
          fs.readFileSync(full, "utf8")
            .split("\n")
            .forEach((line, i) => {
              if (counts.test(line) || exact.test(line) || field.test(line)) offenders.push(`${path.relative(srcRoot, full)}:${i + 1}`);
            });
        }
      }
    };
    walk(srcRoot);
    expect(offenders).toEqual([]);
  });
});
