import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let rpcImpl;
let cliTokenResolution;
let insertedEvents;

function makeSupabaseMock() {
  const insert = vi.fn().mockImplementation(async (row) => {
    insertedEvents.push(row);
    return { error: null };
  });

  return {
    from: vi.fn().mockReturnValue({ insert }),
    rpc: vi.fn().mockImplementation(async (_name, args) => rpcImpl(args)),
  };
}

let supabaseMock;
let userPlan;
let adminUser;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return supabaseMock;
  },
}));
vi.mock("@/lib/subscription", () => ({
  getUserPlan: vi.fn(async () => userPlan),
}));
vi.mock("@/lib/admin", () => ({
  isAdminUser: vi.fn((user) => Boolean(adminUser) && user === adminUser),
}));
vi.mock("@/lib/cli-auth", () => ({
  resolveClerkUserIdFromCliToken: vi.fn(async () => cliTokenResolution),
}));
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { getUser: vi.fn(async () => adminUser ?? { id: "mock-user" }) },
  })),
}));

const { getInstallLimitDecision, LIMITS } = await import("./install-limit.js");

// A claim_install_slot stand-in that mirrors the real RPC's semantics against
// an in-memory set, for tests that don't care about Postgres-level atomicity
// (that's what install-limit.concurrency.test.js covers against real PG).
function fakeClaimSlot(store) {
  return ({ p_identity_key, p_usage_date, p_effect_slug, p_limit }) => {
    const key = `${p_identity_key}|${p_usage_date}`;
    const claimed = store.get(key) ?? new Set();

    if (claimed.has(p_effect_slug)) {
      return [{ allowed: true, already_unlocked: true, claim_count: claimed.size, remaining: p_limit === null ? null : Math.max(p_limit - claimed.size, 0) }];
    }

    if (p_limit !== null && claimed.size >= p_limit) {
      return [{ allowed: false, already_unlocked: false, claim_count: claimed.size, remaining: 0 }];
    }

    claimed.add(p_effect_slug);
    store.set(key, claimed);
    return [{ allowed: true, already_unlocked: false, claim_count: claimed.size, remaining: p_limit === null ? null : Math.max(p_limit - claimed.size, 0) }];
  };
}

describe("getInstallLimitDecision", () => {
  let store;

  beforeEach(() => {
    store = new Map();
    insertedEvents = [];
    cliTokenResolution = null;
    userPlan = "free";
    adminUser = null;
    rpcImpl = (args) => ({ data: fakeClaimSlot(store)(args), error: null });
    supabaseMock = makeSupabaseMock();
    delete process.env.INSTALL_LIMIT_ENFORCE;
  });

  afterEach(() => {
    delete process.env.INSTALL_LIMIT_ENFORCE;
  });

  it("never consumes quota for dependency installs, and never logs them", async () => {
    const result = await getInstallLimitDecision({
      effectSlug: "dep-effect",
      source: "cli",
      clerkUserId: "user_1",
      isDependency: true,
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("dependency");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(insertedEvents).toHaveLength(0);
  });

  it("bypasses admins entirely - no claim, no ledger row", async () => {
    adminUser = { id: "admin_1", publicMetadata: { role: "admin" } };

    const result = await getInstallLimitDecision({
      effectSlug: "any-effect",
      source: "web",
      clerkUserId: "admin_1",
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("admin");
    expect(result.plan).toBe("admin");
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
    expect(insertedEvents).toHaveLength(0);
  });

  describe("signed-in free user (limit 3)", () => {
    it("allows the first 3 distinct effects, denies the 4th (enforce mode)", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      for (const slug of ["a", "b", "c"]) {
        const result = await getInstallLimitDecision({ effectSlug: slug, source: "web", clerkUserId: "user_1" });
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(LIMITS.free);
        expect(result.plan).toBe("free");
        expect(insertedEvents.at(-1).plan).toBe("free"); // was silently logging null before this was fixed
      }

      const fourth = await getInstallLimitDecision({ effectSlug: "d", source: "web", clerkUserId: "user_1" });
      expect(fourth.allowed).toBe(false);
      expect(fourth.reason).toBe("limit-reached");
      expect(fourth.remaining).toBe(0);
      expect(fourth.limit).toBe(LIMITS.free); // a denied response must still report which cap it hit
    });

    it("re-installing an already-unlocked effect is always free, even past the cap", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      for (const slug of ["a", "b", "c"]) {
        await getInstallLimitDecision({ effectSlug: slug, source: "web", clerkUserId: "user_1" });
      }

      const reinstall = await getInstallLimitDecision({ effectSlug: "a", source: "cli", clerkUserId: "user_1" });
      expect(reinstall.allowed).toBe(true);
      expect(reinstall.reason).toBe("already-unlocked");
    });

    it("shadow mode (default): still allowed past the cap, but would_have_denied is logged true", async () => {
      for (const slug of ["a", "b", "c"]) {
        await getInstallLimitDecision({ effectSlug: slug, source: "web", clerkUserId: "user_1" });
      }

      const fourth = await getInstallLimitDecision({ effectSlug: "d", source: "web", clerkUserId: "user_1" });
      expect(fourth.allowed).toBe(true); // shadow mode never blocks
      expect(fourth.enforced).toBe(false);

      const loggedEvent = insertedEvents.at(-1);
      expect(loggedEvent.would_have_denied).toBe(true);
      expect(loggedEvent.decision).toBe("denied");
      expect(loggedEvent.enforced).toBe(false);

      // The 4th effect must NOT have actually been added to the ledger -
      // claim_install_slot itself refuses the insert past the limit.
      const fifth = await getInstallLimitDecision({ effectSlug: "d", source: "web", clerkUserId: "user_1" });
      expect(fifth.reason).toBe("limit-reached"); // still not unlocked, not "already-unlocked"
    });
  });

  it("pro users get the pro limit (10) and plan: 'pro' on both the result and the logged event", async () => {
    userPlan = "pro";
    const result = await getInstallLimitDecision({ effectSlug: "a", source: "web", clerkUserId: "user_1" });
    expect(result.limit).toBe(LIMITS.pro);
    expect(result.plan).toBe("pro");
    expect(insertedEvents.at(-1).plan).toBe("pro");
  });

  describe("CLI token identity", () => {
    it("resolves a valid token to its clerk_user_id and applies that plan's limit", async () => {
      cliTokenResolution = "user_9";
      userPlan = "pro";

      const result = await getInstallLimitDecision({ effectSlug: "a", source: "cli", cliToken: "hpx_abc" });
      expect(result.identityKey).toBe("user:user_9");
      expect(result.limit).toBe(LIMITS.pro);
    });

    it("falls through to anonymous for a malformed token", async () => {
      const result = await getInstallLimitDecision({
        effectSlug: "a",
        source: "cli",
        cliToken: "not-a-real-token",
        deviceId: "device-1",
      });
      expect(result.identityKey).toBe("device:device-1");
    });

    it("falls through to anonymous when the shared resolver reports no identity (revoked/expired/etc)", async () => {
      cliTokenResolution = null; // what resolveClerkUserIdFromCliToken returns for a revoked token

      const result = await getInstallLimitDecision({
        effectSlug: "a",
        source: "cli",
        cliToken: "hpx_abc",
        deviceId: "device-1",
      });
      expect(result.identityKey).toBe("device:device-1");
    });
  });

  describe("anonymous identity", () => {
    it("denies outright with neither deviceId nor ip", async () => {
      const result = await getInstallLimitDecision({ effectSlug: "a", source: "cli" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no-identity");
    });

    it("applies the anonymous limit on the device bucket", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      const first = await getInstallLimitDecision({ effectSlug: "a", source: "cli", deviceId: "device-1" });
      expect(first.plan).toBe("anonymous");
      expect(insertedEvents.at(-1).plan).toBe("anonymous");

      // Fill any remaining slots beyond the first, so this holds regardless
      // of the exact configured limit.
      for (let i = 1; i < LIMITS.anonymous; i++) {
        await getInstallLimitDecision({ effectSlug: `extra-${i}`, source: "cli", deviceId: "device-1" });
      }

      const overCap = await getInstallLimitDecision({ effectSlug: "over-cap", source: "cli", deviceId: "device-1" });

      expect(overCap.allowed).toBe(false);
      expect(overCap.limit).toBe(LIMITS.anonymous); // was silently null before this was fixed
    });

    it("device-denied short-circuits before ever touching the IP bucket", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      for (let i = 0; i < LIMITS.anonymous; i++) {
        await getInstallLimitDecision({ effectSlug: `fill-${i}`, source: "cli", deviceId: "device-1", ip: "1.2.3.4" });
      }

      const rpcCallsBefore = supabaseMock.rpc.mock.calls.length;
      const overCap = await getInstallLimitDecision({ effectSlug: "over-cap", source: "cli", deviceId: "device-1", ip: "1.2.3.4" });

      expect(overCap.allowed).toBe(false);
      // Only ONE more rpc call (the device claim) - IP bucket never touched.
      expect(supabaseMock.rpc.mock.calls.length).toBe(rpcCallsBefore + 1);
    });

    it("with no device ID at all, the IP claim itself gets the strict anonymous limit, not the loose shared-network one", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      // No deviceId anywhere below - this caller has no other identity, so
      // the IP claim must stand in for the strict per-anonymous-caller cap
      // rather than quietly getting the looser LIMITS.ip (10) meant for
      // *distinguishable* devices sharing a network.
      const first = await getInstallLimitDecision({ effectSlug: "a", source: "cli", ip: "5.5.5.5" });
      expect(first.allowed).toBe(true);
      expect(first.limit).toBe(LIMITS.anonymous);

      for (let i = 1; i < LIMITS.anonymous; i++) {
        await getInstallLimitDecision({ effectSlug: `extra-${i}`, source: "cli", ip: "5.5.5.5" });
      }

      const overCap = await getInstallLimitDecision({ effectSlug: "over-cap", source: "cli", ip: "5.5.5.5" });

      expect(overCap.allowed).toBe(false);
      expect(overCap.limit).toBe(LIMITS.anonymous); // was LIMITS.ip (10) before this was fixed
    });

    it("stricter verdict wins: device allows but IP bucket denies -> overall denied", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      // Exhaust the IP bucket (limit 10) via 10 different devices, one claim
      // each - well under any device's own cap, so only the IP bucket
      // (shared across all of them) is the one that fills up.
      for (let i = 0; i < LIMITS.ip; i++) {
        await getInstallLimitDecision({ effectSlug: `shared-${i}`, source: "cli", deviceId: `other-device-${i}`, ip: "9.9.9.9" });
      }

      const result = await getInstallLimitDecision({
        effectSlug: "new-effect",
        source: "cli",
        deviceId: "device-1", // fresh device, well under its own cap
        ip: "9.9.9.9", // but IP bucket is full
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("limit-reached");
      expect(result.limit).toBe(LIMITS.ip); // the IP bucket was the one that actually denied it
    });
  });
});
