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
let userTier;
let adminUser;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return supabaseMock;
  },
}));
vi.mock("@/lib/subscription", () => ({
  getUserPlanInfo: vi.fn(async () => ({
    plan: userPlan,
    tier: userPlan === "pro" ? userTier ?? "pro" : "free",
  })),
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
    userTier = undefined;
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

  it("never meters admins - no claim, no ledger row, but logs the install for their usage tab", async () => {
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
    expect(insertedEvents).toHaveLength(1);
    expect(insertedEvents[0]).toMatchObject({ clerk_user_id: "admin_1", effect_slug: "any-effect", plan: "admin", decision: "allowed", reason: "admin" });
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

    it("re-installing an already-unlocked effect is free while under the cap", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      for (const slug of ["a", "b"]) {
        await getInstallLimitDecision({ effectSlug: slug, source: "web", clerkUserId: "user_1" });
      }

      const reinstall = await getInstallLimitDecision({ effectSlug: "a", source: "cli", clerkUserId: "user_1" });
      expect(reinstall.allowed).toBe(true);
      expect(reinstall.reason).toBe("already-unlocked");
      expect(reinstall.count).toBe(2);
    });

    it("re-installing an already-unlocked effect stays free even once the cap is used up", async () => {
      process.env.INSTALL_LIMIT_ENFORCE = "true";

      for (const slug of ["a", "b", "c"]) {
        await getInstallLimitDecision({ effectSlug: slug, source: "web", clerkUserId: "user_1" });
      }

      const reinstall = await getInstallLimitDecision({ effectSlug: "a", source: "cli", clerkUserId: "user_1" });
      expect(reinstall.allowed).toBe(true);
      expect(reinstall.reason).toBe("already-unlocked");

      const newOne = await getInstallLimitDecision({ effectSlug: "d", source: "web", clerkUserId: "user_1" });
      expect(newOne.allowed).toBe(false);
      expect(newOne.reason).toBe("limit-reached");
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

  it("Pro users get 5 a day, plan: 'pro' and tier: 'pro'", async () => {
    userPlan = "pro";
    userTier = "pro";
    const result = await getInstallLimitDecision({ effectSlug: "a", source: "web", clerkUserId: "user_1" });
    expect(LIMITS.pro).toBe(5);
    expect(result.limit).toBe(5);
    expect(result.plan).toBe("pro");
    expect(result.tier).toBe("pro");
    expect(insertedEvents.at(-1).plan).toBe("pro");
  });

  it("Pro+ users get 10 a day and are logged as pro_plus", async () => {
    userPlan = "pro";
    userTier = "pro_plus";
    const result = await getInstallLimitDecision({ effectSlug: "a", source: "web", clerkUserId: "user_1" });
    expect(LIMITS.pro_plus).toBe(10);
    expect(result.limit).toBe(10);
    expect(result.plan).toBe("pro");
    expect(result.tier).toBe("pro_plus");
    expect(insertedEvents.at(-1).plan).toBe("pro_plus");
  });

  it("a Pro user is denied the 6th unique effect of the day when enforced", async () => {
    process.env.INSTALL_LIMIT_ENFORCE = "true";
    userPlan = "pro";
    userTier = "pro";
    for (const slug of ["a", "b", "c", "d", "e"]) {
      const ok = await getInstallLimitDecision({ effectSlug: slug, source: slug === "c" ? "cli" : "web", clerkUserId: "user_1" });
      expect(ok.allowed).toBe(true);
    }
    const sixth = await getInstallLimitDecision({ effectSlug: "f", source: "web", clerkUserId: "user_1" });
    expect(sixth.allowed).toBe(false);
    expect(sixth.reason).toBe("limit-reached");
  });

  describe("CLI token identity", () => {
    it("resolves a valid token to its clerk_user_id and applies that plan's limit", async () => {
      cliTokenResolution = "user_9";
      userPlan = "pro";

      const result = await getInstallLimitDecision({ effectSlug: "a", source: "cli", cliToken: "hpx_abc" });
      expect(result.identityKey).toBe("user:user_9");
      expect(result.limit).toBe(LIMITS.pro);
    });

    it("a malformed token is treated as signed out: refused", async () => {
      const result = await getInstallLimitDecision({
        effectSlug: "a",
        source: "cli",
        cliToken: "not-a-real-token",
        deviceId: "device-1",
      });
      expect(result).toMatchObject({ allowed: false, reason: "sign-in-required" });
    });

    it("a token the resolver rejects (revoked/expired/etc) is treated as signed out: refused", async () => {
      cliTokenResolution = null; // what resolveClerkUserIdFromCliToken returns for a revoked token

      const result = await getInstallLimitDecision({
        effectSlug: "a",
        source: "cli",
        cliToken: "hpx_abc",
        deviceId: "device-1",
      });
      expect(result).toMatchObject({ allowed: false, reason: "sign-in-required" });
    });
  });

  describe("signed out", () => {
    it("is refused, free effects included, even in shadow mode - and claims nothing", async () => {
      delete process.env.INSTALL_LIMIT_ENFORCE;
      const rpcCallsBefore = supabaseMock.rpc.mock.calls.length;
      const result = await getInstallLimitDecision({ effectSlug: "a", effectTier: "free", source: "cli", deviceId: "device-1", ip: "1.2.3.4" });
      expect(result).toMatchObject({ allowed: false, reason: "sign-in-required", plan: "anonymous", enforced: true });
      expect(supabaseMock.rpc.mock.calls.length).toBe(rpcCallsBefore);
    });

    it("logs the refused attempt for the admin pages", async () => {
      await getInstallLimitDecision({ effectSlug: "a", source: "mcp", deviceId: "device-1" });
      expect(insertedEvents.at(-1)).toMatchObject({ plan: "anonymous", decision: "denied", reason: "sign-in-required", source: "mcp", identity_key: "device:device-1" });
    });

    it("is refused with no identity at all", async () => {
      const result = await getInstallLimitDecision({ effectSlug: "a", source: "cli" });
      expect(result).toMatchObject({ allowed: false, reason: "sign-in-required" });
    });

    it("can't use the dependency flag to get code, and that isn't logged", async () => {
      const eventsBefore = insertedEvents.length;
      const result = await getInstallLimitDecision({ effectSlug: "a", source: "cli", deviceId: "device-1", isDependency: true });
      expect(result).toMatchObject({ allowed: false, reason: "sign-in-required" });
      expect(insertedEvents.length).toBe(eventsBefore);
    });
  });
});
