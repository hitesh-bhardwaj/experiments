import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Registry path traversal. The effect slug in /api/cli/effects/{slug} and
// /api/effects/{slug} flows through effect-slugs.js#normalizeSlug - which
// runs decodeURIComponent itself - and then straight into path.join() in
// lib/registry.js. A double-encoded slug (Next decodes %252F to %2F, then
// normalizeSlug decodes %2F to "/") therefore reaches the filesystem as
// "../../package". Report: M5.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/install-limit", () => ({
  getInstallLimitDecision: vi.fn(async () => ({ allowed: true, limit: 3, remaining: 2 })),
}));

const { db, clerk, makeRequest, routeParams, readJson, VAULT_ROOT, REPO_ROOT } = await import(
  "../helpers/route-harness.js"
);
const { getEffectSlugAliases } = await import("@/lib/effect-slugs");
const { GET: cliEffect } = await import("@/app/api/cli/effects/[effectSlug]/route.js");
const { GET: webEffect } = await import("@/app/api/effects/[slug]/route.js");

// What the route handler sees in `params` after Next's own single decode.
const TRAVERSAL_SLUGS = [
  "../../package", // public/r/../../package.json -> vault-main/package.json
  "..%2F..%2Fpackage", // arrives like this from /api/cli/effects/..%252F..%252Fpackage
  "%2e%2e%2f%2e%2e%2fpackage",
  "..\\..\\package",
  "..%5C..%5Cpackage",
  "/etc/passwd",
  "%2Fetc%2Fpasswd",
  "....//....//package",
  "../../../registry/index",
  "valid-looking\0../../package",
];

const ALLOWED_ROOTS = [path.join(VAULT_ROOT, "public/r"), path.join(REPO_ROOT, "registry/effects")];
const insideAllowedRoot = (p) => ALLOWED_ROOTS.some((root) => path.resolve(p).startsWith(root + path.sep));

describe("effect slug normalisation", () => {
  it("benign slugs still resolve (control)", () => {
    expect(getEffectSlugAliases("Cards Runway")).toContain("cards-runway");
  });

  it("[M5] no alias produced for a traversal slug contains a path separator or '..'", () => {
    for (const slug of TRAVERSAL_SLUGS) {
      for (const alias of getEffectSlugAliases(slug)) {
        expect(alias, `${JSON.stringify(slug)} -> ${JSON.stringify(alias)}`).not.toMatch(/[\\/\0]|\.\./);
      }
    }
  });
});

describe("delivery routes with traversal slugs", () => {
  beforeEach(() => {
    db.reset({ subscriptions: [] });
    clerk.reset();
  });

  it("[M5] filesystem lookups stay inside the registry roots for every traversal slug", async () => {
    const touched = [];
    const realExistsSync = fs.existsSync;
    const existsSpy = vi.spyOn(fs, "existsSync").mockImplementation((p) => {
      touched.push(String(p));
      return realExistsSync(p);
    });
    try {
      for (const slug of TRAVERSAL_SLUGS) {
        await cliEffect(makeRequest("/x"), routeParams({ effectSlug: slug }));
      }
    } finally {
      existsSpy.mockRestore();
    }
    const escaped = touched.filter((p) => p.endsWith(".json") && !insideAllowedRoot(p));
    expect(escaped).toEqual([]);
  });

  // Concrete impact today: an anonymous request reads vault-main/package.json
  // through the registry loader and gets a 200 "free effect" built from it.
  it("[M5] an anonymous traversal request is a 404, not a 200 built from an arbitrary JSON file", async () => {
    for (const route of [cliEffect, webEffect]) {
      const key = route === cliEffect ? "effectSlug" : "slug";
      const res = await route(makeRequest("/x"), routeParams({ [key]: "..%2F..%2Fpackage" }));
      expect(res.status).toBe(404);
    }
  });

  it("no traversal slug ever yields Pro file content or a 5xx", async () => {
    for (const slug of TRAVERSAL_SLUGS) {
      for (const [route, params] of [
        [cliEffect, { effectSlug: slug }],
        [webEffect, { slug }],
      ]) {
        const res = await route(makeRequest("/x"), routeParams(params));
        expect(res.status, `${slug} -> ${res.status}`).toBeLessThan(500);
        const body = await readJson(res);
        for (const file of body?.files || []) {
          expect(file.content ?? null, `${slug}:${file.path}`).toBeNull();
        }
      }
    }
  });
});
