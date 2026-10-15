import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Pro asset authorization: anonymous visitors, Free accounts and dead tokens
// must never receive Pro effect source from any server surface - the CLI
// route, the web API twin, the "Get code" copy route, the static /r/*.json
// registry, or the public list/search endpoints.
//
// Out of scope by decision (report H4, accepted risk): the Pro source is
// also in the public GitHub repo (registry/effects, registry/dist/*.tgz).
// These tests guard the *app's* gates, which still matter for the paywall
// UX, quotas and attribution.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/install-limit", () => ({
  getInstallLimitDecision: vi.fn(async () => ({ allowed: true, limit: 3, remaining: 2, count: 1, plan: "pro" })),
  getUnlockedEffectSlugsToday: vi.fn(async () => []),
}));

let sanitySource = null;
vi.mock("@/lib/sanity", async (importOriginal) => ({
  ...(await importOriginal()),
  getSanityEffectSource: vi.fn(async () => sanitySource),
}));

const { db, clerk, makeUser, makeRequest, routeParams, readJson, getProEffectSlugs, VAULT_ROOT } = await import(
  "../helpers/route-harness.js"
);
const { hashCliToken } = await import("@/lib/cli-token");
const { GET: cliEffect } = await import("@/app/api/cli/effects/[effectSlug]/route.js");
const { GET: webEffect } = await import("@/app/api/effects/[slug]/route.js");
const { POST: copyEffect } = await import("@/app/api/effects/[slug]/copy/route.js");

const PRO_SLUGS = getProEffectSlugs();
const PRO_SLUG = PRO_SLUGS[0];
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 86400_000).toISOString();

const TOKENS = {
  free: "hpx_" + "f".repeat(64),
  expired: "hpx_" + "e".repeat(64),
  cancelled: "hpx_" + "c".repeat(64),
  revoked: "hpx_" + "r".repeat(64),
  pro: "hpx_" + "a".repeat(64),
};

function seed() {
  sanitySource = null;
  clerk.reset({
    user_free: makeUser("user_free"),
    user_expired: makeUser("user_expired"),
    user_pro: makeUser("user_pro"),
  });
  db.reset({
    subscriptions: [
      { clerk_user_id: "user_free", plan: "free", status: "inactive", cli_token_hash: hashCliToken(TOKENS.free) },
      { clerk_user_id: "user_expired", plan: "pro", status: "active", current_period_end: PAST, cli_token_hash: hashCliToken(TOKENS.expired) },
      { clerk_user_id: "user_cancelled", plan: "free", status: "cancelled", current_period_end: FUTURE, cli_token_hash: hashCliToken(TOKENS.cancelled) },
      { clerk_user_id: "user_revoked", plan: "pro", status: "active", current_period_end: FUTURE, cli_token_hash: hashCliToken(TOKENS.revoked), cli_token_revoked_at: new Date().toISOString() },
      { clerk_user_id: "user_pro", plan: "pro", status: "active", current_period_end: FUTURE, cli_token_hash: hashCliToken(TOKENS.pro) },
    ],
  });
}

function expectNoSource(body) {
  const text = JSON.stringify(body);
  expect(text).not.toMatch(/"content"\s*:/);
  expect(text).not.toMatch(/import\s+.*from\s+["']/);
}

const CREDENTIALS = [
  { label: "anonymous (no header)", headers: {} },
  { label: "empty bearer", headers: { authorization: "Bearer " } },
  { label: "garbage bearer", headers: { authorization: "Bearer not-a-token" } },
  { label: "Free account token", headers: { authorization: `Bearer ${TOKENS.free}` } },
  { label: "Free token via x-hyperiux-token", headers: { "x-hyperiux-token": TOKENS.free } },
  { label: "expired Pro token", headers: { authorization: `Bearer ${TOKENS.expired}` } },
  { label: "cancelled subscription token", headers: { authorization: `Bearer ${TOKENS.cancelled}` } },
  { label: "revoked token", headers: { authorization: `Bearer ${TOKENS.revoked}` } },
  { label: "lowercase scheme + Pro token is not a bypass", headers: { authorization: `bearer ${TOKENS.free}` } },
];

describe("Pro effect source: CLI + web delivery routes", () => {
  beforeEach(seed);

  for (const { label, headers } of CREDENTIALS) {
    it(`denies ${label} on every Pro effect`, async () => {
      for (const slug of PRO_SLUGS) {
        for (const [route, params] of [
          [cliEffect, { effectSlug: slug }],
          [webEffect, { slug }],
        ]) {
          const res = await route(makeRequest("/x", { headers }), routeParams(params));
          expect([401, 403], `${slug} -> ${res.status}`).toContain(res.status);
          expectNoSource(await readJson(res));
        }
      }
      // 94 Pro effects x 2 routes runs close to the 5s default under a parallel run
    }, 30_000);
  }

  it("a signed-in Pro *browser session* is not a credential for the token routes", async () => {
    clerk.signIn("user_pro");
    const res = await cliEffect(makeRequest("/x"), routeParams({ effectSlug: PRO_SLUG }));
    expect(res.status).toBe(401);
  });

  it("control: an active Pro token does receive source (so the denials above are meaningful)", async () => {
    const res = await cliEffect(
      makeRequest("/x", { headers: { authorization: `Bearer ${TOKENS.pro}` } }),
      routeParams({ effectSlug: PRO_SLUG })
    );
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).toMatch(/"content"\s*:/);
  });

  it("slug aliasing / case / whitespace can't re-classify a Pro effect as free", async () => {
    const variants = [PRO_SLUG.toUpperCase(), ` ${PRO_SLUG} `, PRO_SLUG.replace(/-/g, "_"), encodeURIComponent(PRO_SLUG)];
    for (const slug of variants) {
      const res = await cliEffect(makeRequest("/x"), routeParams({ effectSlug: slug }));
      expect([401, 403, 404], `${slug} -> ${res.status}`).toContain(res.status);
      expectNoSource(await readJson(res));
    }
  });
});

describe("Pro effect source: 'Get code' copy route", () => {
  beforeEach(seed);

  const copy = (option = "jsx", slug = PRO_SLUG) =>
    copyEffect(makeRequest(`/api/effects/${slug}/copy`, { method: "POST", body: { option } }), routeParams({ slug }));

  it("signed-out visitors get 401 and no source", async () => {
    sanitySource = { tier: "pro", jsxCode: "SECRET_JSX", tsxCode: "SECRET_TSX" };
    const res = await copy();
    expect(res.status).toBe(401);
    expect(JSON.stringify(await readJson(res))).not.toContain("SECRET");
  });

  it("Free and expired accounts get 403 and no source, for every option", async () => {
    sanitySource = { tier: "pro", jsxCode: "SECRET_JSX", tsxCode: "SECRET_TSX" };
    for (const user of ["user_free", "user_expired"]) {
      clerk.signIn(user);
      for (const option of ["jsx", "tsx", "prompt"]) {
        const res = await copy(option);
        expect(res.status, `${user}/${option}`).toBe(403);
        expect(JSON.stringify(await readJson(res))).not.toContain("SECRET");
      }
    }
  });

  // The copy route trusts Sanity's tier over the registry's
  // (`sanitySource?.tier ?? effectMeta.tier`), while the CLI/web routes
  // only read the registry. A Sanity doc saved as "free" (editor mistake,
  // or a compromised SANITY_API_TOKEN) silently unlocks a registry-Pro
  // effect's source for every signed-in Free account via this route.
  it.fails("[L11] a registry-Pro effect stays locked even if its Sanity doc says free", async () => {
    sanitySource = { tier: "free", jsxCode: "SECRET_JSX", tsxCode: "SECRET_TSX" };
    clerk.signIn("user_free");
    const res = await copy("jsx");
    expect(res.status).toBe(403);
  });
});

describe("Static registry and public listing endpoints", () => {
  const publicDir = path.join(VAULT_ROOT, "public/r");
  const publicFiles = fs.readdirSync(publicDir).filter((f) => f.endsWith(".json") && f !== "index.json");

  it("there are Pro entries to check (guards against the scan silently passing on nothing)", () => {
    expect(PRO_SLUGS.length).toBeGreaterThan(10);
  });

  it("no /r/{name}.json file for a Pro effect carries file content", () => {
    const leaks = [];
    for (const file of publicFiles) {
      const json = JSON.parse(fs.readFileSync(path.join(publicDir, file), "utf-8"));
      if (json.tier === "free") continue;
      for (const entry of json.files || []) {
        if (entry.content != null && entry.content !== "") leaks.push(`${file}:${entry.path}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it("every Pro slug in index.json has a public registry file whose tier is still pro", () => {
    for (const slug of PRO_SLUGS) {
      const file = path.join(publicDir, `${slug}.json`);
      if (!fs.existsSync(file)) continue;
      expect(JSON.parse(fs.readFileSync(file, "utf-8")).tier, slug).toBe("pro");
    }
  });

  it("nothing under public/ contains a known Pro source file verbatim", () => {
    // Spot-check: take the main source of a few Pro effects and make sure
    // no statically served file contains it.
    const registryRoot = path.join(VAULT_ROOT, "../registry/effects");
    const samples = [];
    for (const category of fs.readdirSync(registryRoot)) {
      const categoryDir = path.join(registryRoot, category);
      if (!fs.statSync(categoryDir).isDirectory()) continue;
      for (const effect of fs.readdirSync(categoryDir)) {
        const reg = path.join(categoryDir, effect, "registry.json");
        if (!fs.existsSync(reg)) continue;
        const meta = JSON.parse(fs.readFileSync(reg, "utf-8"));
        if (meta.tier !== "pro") continue;
        const main = (meta.files || []).find((f) => /\.(t|j)sx?$/.test(f.path));
        const source = main && path.join(categoryDir, effect, main.path);
        if (source && fs.existsSync(source)) {
          const text = fs.readFileSync(source, "utf-8");
          // A distinctive 200-char window from the middle of the file.
          if (text.length > 600) samples.push({ effect, needle: text.slice(300, 500) });
        }
        if (samples.length >= 5) break;
      }
      if (samples.length >= 5) break;
    }
    expect(samples.length).toBeGreaterThan(0);

    const publicText = fs
      .readdirSync(publicDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => fs.readFileSync(path.join(publicDir, f), "utf-8"))
      .join("\n");
    for (const { effect, needle } of samples) {
      expect(publicText.includes(needle), effect).toBe(false);
    }
  });
});
