import { describe, it, expect, vi, beforeEach } from "vitest";

// Route-level test: verifies copy-usage/route.js correctly translates
// install-limit's decisions into the exact response shape
// useCopyLimit.js depends on (isAdmin, limit, remaining, count, plan,
// effectSlugs, allowed) - install-limit's own decision logic is already
// covered by install-limit.test.js and install-limit.concurrency.test.js,
// this file only checks the wiring/reshaping.

let authResult;
let identityResult;
let decisionResult;
let unlockedSlugsResult;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve(authResult)),
}));

vi.mock("@/lib/install-limit", () => ({
  resolveSignedInIdentity: vi.fn(() => Promise.resolve(identityResult)),
  getInstallLimitDecision: vi.fn(() => Promise.resolve(decisionResult)),
  getUnlockedEffectSlugsToday: vi.fn(() => Promise.resolve(unlockedSlugsResult)),
}));

const { GET, POST } = await import("./route.js");

function makePostRequest(body) {
  return new Request("http://localhost/api/copy-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("copy-usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authResult = { userId: null };
    identityResult = null;
    decisionResult = null;
    unlockedSlugsResult = [];
  });

  describe("GET", () => {
    it("returns signedIn: false with no session, without calling install-limit", async () => {
      const res = await GET();
      const body = await res.json();

      expect(body).toEqual({ signedIn: false });

      const { resolveSignedInIdentity } = await import("@/lib/install-limit");
      expect(resolveSignedInIdentity).not.toHaveBeenCalled();
    });

    it("returns isAdmin shape for an admin, without querying unlocked slugs", async () => {
      authResult = { userId: "admin_1" };
      identityResult = { isAdmin: true, plan: "admin", limit: null };

      const res = await GET();
      const body = await res.json();

      expect(body).toEqual({
        signedIn: true,
        isAdmin: true,
        plan: "admin",
        limit: null,
        count: 0,
        remaining: null,
        effectSlugs: [],
      });

      const { getUnlockedEffectSlugsToday } = await import("@/lib/install-limit");
      expect(getUnlockedEffectSlugsToday).not.toHaveBeenCalled();
    });

    it("returns the full usage shape for a free user", async () => {
      authResult = { userId: "user_1" };
      identityResult = { isAdmin: false, plan: "free", limit: 3 };
      unlockedSlugsResult = ["a", "b"];

      const res = await GET();
      const body = await res.json();

      expect(body).toEqual({
        signedIn: true,
        isAdmin: false,
        plan: "free",
        limit: 3,
        count: 2,
        remaining: 1,
        effectSlugs: ["a", "b"],
      });
    });
  });

  describe("POST", () => {
    it("401s with no session", async () => {
      const res = await POST(makePostRequest({ effectSlug: "a" }));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ allowed: false, signedIn: false });
    });

    it("400s with a missing effectSlug", async () => {
      authResult = { userId: "user_1" };
      const res = await POST(makePostRequest({}));
      expect(res.status).toBe(400);
    });

    it("500s and reports zeroed usage when install-limit reports an error", async () => {
      authResult = { userId: "user_1" };
      decisionResult = { reason: "error", allowed: false, plan: "free", limit: 3, count: 0, remaining: 3 };

      const res = await POST(makePostRequest({ effectSlug: "a" }));
      expect(res.status).toBe(500);

      const body = await res.json();
      expect(body).toEqual({
        allowed: false,
        signedIn: true,
        isAdmin: false,
        plan: "free",
        limit: 3,
        count: 0,
        remaining: 3,
        effectSlugs: [],
      });
    });

    it("passes source: 'web' and the clerkUserId through to install-limit", async () => {
      authResult = { userId: "user_1" };
      decisionResult = { reason: "allowed", allowed: true, plan: "free", limit: 3, count: 1, remaining: 2 };
      unlockedSlugsResult = ["a"];

      await POST(makePostRequest({ effectSlug: "a" }));

      const { getInstallLimitDecision } = await import("@/lib/install-limit");
      expect(getInstallLimitDecision).toHaveBeenCalledWith(
        expect.objectContaining({ effectSlug: "a", source: "web", clerkUserId: "user_1" })
      );
    });

    it("reports isAdmin: true only when install-limit's reason is 'admin'", async () => {
      authResult = { userId: "admin_1" };
      decisionResult = { reason: "admin", allowed: true, plan: "admin", limit: null, count: 0, remaining: null };

      const res = await POST(makePostRequest({ effectSlug: "a" }));
      const body = await res.json();

      expect(body.isAdmin).toBe(true);
      expect(body.allowed).toBe(true);
    });

    it("surfaces allowed: false with the full effectSlugs list on a denial (shadow or enforced)", async () => {
      authResult = { userId: "user_1" };
      decisionResult = { reason: "limit-reached", allowed: false, plan: "free", limit: 3, count: 3, remaining: 0 };
      unlockedSlugsResult = ["a", "b", "c"];

      const res = await POST(makePostRequest({ effectSlug: "d" }));
      const body = await res.json();

      expect(body.allowed).toBe(false);
      expect(body.effectSlugs).toEqual(["a", "b", "c"]);
    });
  });
});
