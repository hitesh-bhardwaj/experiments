import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

// Paid template downloads. The download route re-checks access on every
// request and proxies the zip; the questions here are whether anyone
// without a purchase can get bytes out of it, and whether the underlying
// blob is reachable without going through it. Report: H4 (accepted risk).

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);

const { db, clerk, makeUser, makeRequest, routeParams, readJson, VAULT_ROOT } = await import(
  "../helpers/route-harness.js"
);
const { TEMPLATES } = await import("@/lib/mock-templates");
const { TEMPLATE_SCAFFOLD_BLOB_URLS } = await import("@/lib/template-scaffolds");
const { GET: download } = await import("@/app/api/templates/[slug]/download/route.js");
const { GET: access } = await import("@/app/api/templates/[slug]/access/route.js");

const SLUG = Object.keys(TEMPLATE_SCAFFOLD_BLOB_URLS)[0];
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();
const fetchSpy = vi.fn(async () => new Response("PK\u0003\u0004ZIPBYTES", { status: 200 }));

beforeEach(() => {
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
  clerk.reset({
    user_free: makeUser("user_free"),
    user_pro_quarterly: makeUser("user_pro_quarterly"),
    user_buyer: makeUser("user_buyer"),
    user_other_buyer: makeUser("user_other_buyer"),
  });
  db.reset({
    subscriptions: [
      { clerk_user_id: "user_free", plan: "free", status: "inactive" },
      // Pro+ / Pro (tiered) rows don't include templates - they earn credits.
      { clerk_user_id: "user_pro_quarterly", plan: "pro", tier: "pro", status: "active", billing_interval: "quarterly", current_period_end: FUTURE },
      { clerk_user_id: "user_buyer", plan: "free", status: "inactive" },
      { clerk_user_id: "user_other_buyer", plan: "free", status: "inactive" },
    ],
    template_purchases: [
      { clerk_user_id: "user_buyer", template_slug: SLUG, status: "paid" },
      { clerk_user_id: "user_other_buyer", template_slug: "some-other-template", status: "paid" },
    ],
  });
});

const get = (handler, slug = SLUG) => handler(makeRequest(`/api/templates/${slug}/download`), routeParams({ slug }));

describe("template download gate", () => {
  it("anonymous requests are refused before the blob is fetched", async () => {
    const res = await get(download);
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("Free, non-annual Pro, and buyers of a *different* template are refused", async () => {
    for (const user of ["user_free", "user_pro_quarterly", "user_other_buyer"]) {
      clerk.signIn(user);
      const res = await get(download);
      expect(res.status, user).toBe(403);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a buyer gets the zip, uncacheable, and the blob URL never appears in the response", async () => {
    clerk.signIn("user_buyer");
    const res = await get(download);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/private/);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    const headerDump = JSON.stringify([...res.headers.entries()]);
    expect(headerDump).not.toContain("blob.vercel-storage.com");
  });

  it("unknown or traversal slugs are a 404 with no upstream fetch", async () => {
    clerk.signIn("user_buyer");
    for (const slug of ["../../package", "..%2F..%2Fpackage", "nope", SLUG + "/../x"]) {
      const res = await get(download, slug);
      expect(res.status, slug).toBe(404);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("the access endpoint answers per-user and is never cacheable", async () => {
    clerk.signIn("user_free");
    const res = await get(access);
    const body = await readJson(res);
    expect(body.allowed ?? body.hasAccess ?? false).toBe(false);
    expect(res.headers.get("cache-control") || "").toMatch(/no-store|private/);
  });
});

describe("[H4] blob exposure (accepted risk - public repo)", () => {
  // Documented, not enforced: the user has chosen to keep the repository
  // public. The zips are uploaded with access:"public" and their URLs are
  // committed here, so anyone reading the repo can download every paid
  // template without going through the gate above. If the repo ever goes
  // private, or the blobs move to private storage, flip this to `it`.
  it.fails("[H4] paid template blob URLs are not committed to the repository", () => {
    expect(Object.values(TEMPLATE_SCAFFOLD_BLOB_URLS).filter((u) => /\.public\.blob\.vercel-storage\.com/.test(u))).toEqual([]);
  });

  it("every template with a scaffold URL is a real catalogue entry (no orphaned public blobs)", () => {
    const slugs = new Set((TEMPLATES || []).map((t) => t.slug));
    for (const slug of Object.keys(TEMPLATE_SCAFFOLD_BLOB_URLS)) expect(slugs.has(slug), slug).toBe(true);
  });

  it("template-scaffolds.js stays server-only (blob URLs never shipped to the browser bundle)", () => {
    const source = fs.readFileSync(path.join(VAULT_ROOT, "src/lib/template-scaffolds.js"), "utf-8");
    expect(source).toMatch(/^import ["']server-only["'];?/m);
  });
});
