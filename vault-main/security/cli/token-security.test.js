import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// CLI token lifecycle, end to end through the real route handlers:
// issue -> validate -> fetch Pro source -> revoke -> stolen copy is dead.
// Supabase and Clerk are the in-memory fakes from route-harness.js; the
// registry, effect-access and cli-auth logic are the real modules.
// Report: security/reports/AUDIT-2026-10-14.md (L10).

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
// Install quota is covered by install-limit.test.js; here it's always "allowed".
vi.mock("@/lib/install-limit", () => ({
  getInstallLimitDecision: vi.fn(async () => ({ allowed: true, limit: 3, remaining: 2 })),
}));

const { db, clerk, makeUser, makeRequest, routeParams, readJson, getProEffectSlugs } = await import(
  "../helpers/route-harness.js"
);
const { hashCliToken } = await import("@/lib/cli-token");
const { POST: issueToken } = await import("@/app/api/cli/token/route.js");
const { POST: revokeToken } = await import("@/app/api/cli/revoke/route.js");
const { POST: validateToken } = await import("@/app/api/cli/validate/route.js");
const { GET: cliEffect } = await import("@/app/api/cli/effects/[effectSlug]/route.js");
const { GET: webEffect } = await import("@/app/api/effects/[slug]/route.js");

const PRO_SLUG = getProEffectSlugs()[0];
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();

function seed() {
  clerk.reset({ user_pro: makeUser("user_pro"), user_free: makeUser("user_free") });
  db.reset({
    subscriptions: [
      { clerk_user_id: "user_pro", plan: "pro", status: "active", current_period_end: FUTURE },
      { clerk_user_id: "user_free", plan: "free", status: "inactive", current_period_end: null },
    ],
  });
}

async function issueFor(userId) {
  clerk.signIn(userId);
  const res = await issueToken();
  clerk.signOut();
  return (await res.json()).token;
}

const validate = (token) => validateToken(makeRequest("/api/cli/validate", { method: "POST", body: { token } }));
const fetchPro = (token, route = cliEffect) =>
  route(
    makeRequest("/x", { headers: token ? { authorization: `Bearer ${token}` } : {} }),
    routeParams(route === cliEffect ? { effectSlug: PRO_SLUG } : { slug: PRO_SLUG })
  );

describe("CLI token issuance", () => {
  beforeEach(seed);

  it("refuses to issue a token without a Clerk session", async () => {
    const res = await issueToken();
    expect(res.status).toBe(401);
  });

  it("issues hpx_ + 256 bits of hex, and a fresh value every time", async () => {
    const a = await issueFor("user_pro");
    const b = await issueFor("user_pro");
    expect(a).toMatch(/^hpx_[0-9a-f]{64}$/);
    expect(b).toMatch(/^hpx_[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });

  it("persists only the SHA-256 hash - the plaintext never reaches the database", async () => {
    const token = await issueFor("user_pro");
    const row = db.rows("subscriptions").find((r) => r.clerk_user_id === "user_pro");

    expect(row.cli_token_hash).toBe(hashCliToken(token));
    expect(JSON.stringify(db.store.tables)).not.toContain(token);
  });

  it("rotating a token invalidates the previous one", async () => {
    const first = await issueFor("user_pro");
    await issueFor("user_pro");
    expect((await validate(first)).status).toBe(401);
    expect((await fetchPro(first)).status).toBe(401);
  });

  it("never writes the plaintext token to logs", async () => {
    const logs = [];
    const spies = ["log", "info", "warn", "error", "debug"].map((level) =>
      vi.spyOn(console, level).mockImplementation((...args) => logs.push(args.map(String).join(" ")))
    );
    try {
      const token = await issueFor("user_pro");
      await validate(token);
      await fetchPro(token);
      db.failNext();
      await validate(token); // error path logs the Supabase error
      expect(logs.join("\n")).not.toContain(token);
      expect(logs.join("\n")).not.toContain(token.slice(4));
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

describe("CLI token use against Pro source", () => {
  beforeEach(seed);

  it("an active Pro token validates and receives source on both delivery routes", async () => {
    const token = await issueFor("user_pro");
    expect((await validate(token)).status).toBe(200);

    for (const route of [cliEffect, webEffect]) {
      const res = await fetchPro(token, route);
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.files.some((file) => typeof file.content === "string" && file.content.length > 0)).toBe(true);
    }
  });

  it("a Free account's token proves identity only - no Pro source", async () => {
    const token = await issueFor("user_free");
    expect((await validate(token)).status).toBe(403);

    for (const route of [cliEffect, webEffect]) {
      const res = await fetchPro(token, route);
      const body = await readJson(res);
      expect(res.status).toBe(403);
      expect(JSON.stringify(body)).not.toMatch(/"content"/);
    }
  });

  it("a stolen token stops working the moment its owner revokes it", async () => {
    const token = await issueFor("user_pro");
    expect((await fetchPro(token)).status).toBe(200);

    clerk.signIn("user_pro");
    expect((await revokeToken()).status).toBe(200);
    clerk.signOut();

    expect((await validate(token)).status).toBe(401);
    for (const route of [cliEffect, webEffect]) {
      const res = await fetchPro(token, route);
      expect(res.status).toBe(401);
      expect(JSON.stringify(await readJson(res))).not.toMatch(/"content"/);
    }
  });

  it("a token stops working when the subscription lapses, without being revoked", async () => {
    const token = await issueFor("user_pro");
    const row = db.rows("subscriptions").find((r) => r.clerk_user_id === "user_pro");

    row.current_period_end = new Date(Date.now() - 1000).toISOString();
    expect((await fetchPro(token)).status).toBe(403);

    row.current_period_end = FUTURE;
    row.status = "cancelled";
    row.plan = "free";
    expect((await fetchPro(token)).status).toBe(403);
  });

  it("forged, truncated and wrong-prefix tokens are rejected", async () => {
    const token = await issueFor("user_pro");
    const forgeries = [
      `hpx_${"0".repeat(64)}`,
      token.slice(0, -1),
      token.replace(/^hpx_/, "hpy_"),
      token.toUpperCase(),
      `${token} `.repeat(2),
      hashCliToken(token), // the stored hash itself must not work as a credential
      `hpx_${hashCliToken(token)}`,
    ];
    for (const forged of forgeries) {
      expect((await fetchPro(forged)).status, forged).toBeGreaterThanOrEqual(401);
    }
  });

  it("the revoke endpoint needs a session - a token alone can't revoke someone else", async () => {
    const res = await revokeToken();
    expect(res.status).toBe(401);
  });
});

describe("[L10] token hygiene gaps", () => {
  beforeEach(seed);
  afterEach(() => vi.useRealTimers());

  // Tokens have no TTL of their own: a token issued today still validates
  // years later as long as the subscription renews. A leaked token in an
  // old CI log or dotfile stays live indefinitely.
  it.fails("[L10] a CLI token expires on its own after a bounded lifetime", async () => {
    const token = await issueFor("user_pro");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 400 * 86400_000);
    db.rows("subscriptions")[0].current_period_end = new Date(Date.now() + 86400_000).toISOString();
    expect((await validate(token)).status).toBe(401);
  });

  // revoke nulls cli_token_hash, so a revoked token can only ever come back
  // as "invalid-credential" - the "revoked" reason (and its 403) in
  // effect-access.js / cli-auth.js is unreachable, which makes support and
  // incident review blind to "this was a revoked token".
  it.fails("[L10] a revoked token is reported as revoked, not as unknown", async () => {
    const token = await issueFor("user_pro");
    clerk.signIn("user_pro");
    await revokeToken();
    clerk.signOut();
    const body = await (await fetchPro(token)).json();
    expect(body.reason).toBe("revoked");
  });

  // A user with no subscriptions row (Clerk webhook missed) gets a token
  // back that can never validate - the update matches zero rows silently.
  it.fails("[L10] issuing a token for an account with no subscriptions row fails loudly", async () => {
    clerk.users.user_orphan = makeUser("user_orphan");
    clerk.signIn("user_orphan");
    const res = await issueToken();
    expect(res.status).not.toBe(200);
  });
});
