import { describe, it, expect, vi, beforeEach } from "vitest";

// Chainable mock matching the two shapes effect-access.js actually calls:
//   supabase.from(...).select(...).eq(...).maybeSingle()
//   supabase.from(...).update(...).eq(...).then(onFulfilled)
function makeSupabaseMock({ selectResult = { data: null, error: null } } = {}) {
  const eqForSelect = vi.fn().mockReturnValue({
    maybeSingle: vi.fn().mockResolvedValue(selectResult),
  });
  const eqForUpdate = vi.fn().mockReturnValue(Promise.resolve({ error: null }));

  const select = vi.fn().mockReturnValue({ eq: eqForSelect });
  const update = vi.fn().mockReturnValue({ eq: eqForUpdate });

  return { from: vi.fn().mockReturnValue({ select, update }) };
}

let supabaseMock;

vi.mock("@/lib/supabase", () => ({
  get supabase() {
    return supabaseMock;
  },
}));

const { getEffectAccessDecision, POLICY_VERSION } = await import("./effect-access.js");

const ACTIVE_PRO_ROW = { plan: "pro", status: "active", current_period_end: null };
const TRIALING_PRO_ROW = { plan: "pro", status: "trialing", current_period_end: null };
const EXPIRED_PRO_ROW = {
  plan: "pro",
  status: "active",
  current_period_end: new Date(Date.now() - 86_400_000).toISOString(),
};
const FUTURE_PRO_ROW = {
  plan: "pro",
  status: "active",
  current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
};
const FREE_ROW = { plan: "free", status: "inactive", current_period_end: null };

const CLI_TOKEN = "hpx_deadbeef";

describe("getEffectAccessDecision", () => {
  beforeEach(() => {
    supabaseMock = makeSupabaseMock();
  });

  it("allows free-tier effects with no credentials at all", async () => {
    const result = await getEffectAccessDecision({ effectTier: "free" });
    expect(result).toEqual({
      allowed: true,
      reason: "free",
      policyVersion: POLICY_VERSION,
      source: "supabase",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("allows free-tier effects even when a clerkUserId is passed (never queries)", async () => {
    const result = await getEffectAccessDecision({ effectTier: "free", clerkUserId: "user_1" });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("free");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("denies pro-tier effects with no credentials", async () => {
    const result = await getEffectAccessDecision({ effectTier: "pro" });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("anonymous");
  });

  describe("Clerk session identity", () => {
    it("denies when no subscription row exists", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: null, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no-subscription");
    });

    it("denies when the row is plan=free", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: FREE_ROW, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("no-subscription");
    });

    it("allows an active pro subscription with no expiry set", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: ACTIVE_PRO_ROW, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result).toEqual({
        allowed: true,
        reason: "active-pro",
        policyVersion: POLICY_VERSION,
        source: "supabase",
      });
    });

    it("allows a trialing subscription", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: TRIALING_PRO_ROW, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("active-pro");
    });

    it("allows a pro subscription whose period end is in the future", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: FUTURE_PRO_ROW, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("active-pro");
    });

    it("denies a pro subscription past its period end", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: EXPIRED_PRO_ROW, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("expired");
    });

    it("fails closed to 'error' when the Supabase query itself errors", async () => {
      supabaseMock = makeSupabaseMock({
        selectResult: { data: null, error: new Error("connection reset") },
      });
      const result = await getEffectAccessDecision({ effectTier: "pro", clerkUserId: "user_1" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("error");
    });
  });

  describe("CLI token identity", () => {
    it("rejects a malformed token without querying Supabase", async () => {
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: "not-a-real-token" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("invalid-credential");
      expect(supabaseMock.from).not.toHaveBeenCalled();
    });

    it("rejects a well-formed token with no matching account", async () => {
      supabaseMock = makeSupabaseMock({ selectResult: { data: null, error: null } });
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: CLI_TOKEN });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("invalid-credential");
    });

    it("rejects a revoked token even if the underlying plan is active pro", async () => {
      supabaseMock = makeSupabaseMock({
        selectResult: {
          data: { ...ACTIVE_PRO_ROW, clerk_user_id: "user_1", cli_token_revoked_at: new Date().toISOString() },
          error: null,
        },
      });
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: CLI_TOKEN });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("revoked");
    });

    it("allows a valid token backed by an active pro row", async () => {
      supabaseMock = makeSupabaseMock({
        selectResult: { data: { ...ACTIVE_PRO_ROW, clerk_user_id: "user_1" }, error: null },
      });
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: CLI_TOKEN });
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("active-pro");
    });

    it("denies a valid token backed by an expired pro row", async () => {
      supabaseMock = makeSupabaseMock({
        selectResult: { data: { ...EXPIRED_PRO_ROW, clerk_user_id: "user_1" }, error: null },
      });
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: CLI_TOKEN });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("expired");
    });

    it("fails closed to 'error' when the Supabase query itself errors", async () => {
      supabaseMock = makeSupabaseMock({
        selectResult: { data: null, error: new Error("connection reset") },
      });
      const result = await getEffectAccessDecision({ effectTier: "pro", cliToken: CLI_TOKEN });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("error");
    });
  });
});
