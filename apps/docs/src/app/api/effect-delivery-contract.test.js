import { describe, it, expect, vi, beforeEach } from "vitest";

// Contract test for F-040 (HV-FND-B4-017): asserts /api/cli/effects/[effectSlug]
// and /api/effects/[slug] - the two independently-implemented Pro-effect
// delivery routes - produce identical status codes and reason codes for the
// same authorization matrix. See docs/effect-access.md.
//
// This mocks the *decision* (getEffectAccessDecision) rather than Supabase,
// since effect-access.test.js already exhaustively covers the decision logic
// itself - what this file verifies is that both routes correctly translate a
// given decision into the same HTTP response, which is the actual drift risk
// the audit finding was about.

const effectMeta = { tier: "pro", name: "test-effect" };
const deliveryPayload = { name: "test-effect", tier: "pro", files: [{ path: "index.jsx", content: "..." }] };

vi.mock("@/lib/registry", () => ({
  getEffectMetadata: vi.fn(() => effectMeta),
  buildEffectDeliveryPayload: vi.fn(() => deliveryPayload),
}));

vi.mock("@/lib/cli-auth", () => ({
  getCliTokenFromRequest: vi.fn(() => "hpx_sometoken"),
}));

let decisionResult;
vi.mock("@/lib/effect-access", () => ({
  getEffectAccessDecision: vi.fn(() => Promise.resolve(decisionResult)),
}));

// Stage 1 (Installation-SyncUp.md) shadow-mode logging call - both routes
// call this after a granted access decision. Mocked here the same way
// getEffectAccessDecision is: this file verifies routing/response-shaping
// parity, not install-limit's own decision logic (covered by
// install-limit.test.js).
let installDecisionResult;
vi.mock("@/lib/install-limit", () => ({
  getInstallLimitDecision: vi.fn(() => Promise.resolve(installDecisionResult)),
}));

const { GET: cliGet } = await import("./cli/effects/[effectSlug]/route.js");
const { GET: webGet } = await import("./effects/[slug]/route.js");

function makeRequest(extraHeaders = {}) {
  return new Request("http://localhost/x", {
    headers: { authorization: "Bearer hpx_sometoken", ...extraHeaders },
  });
}

const MATRIX = [
  { label: "anonymous", decision: { allowed: false, reason: "anonymous" }, status: 401 },
  { label: "invalid-credential", decision: { allowed: false, reason: "invalid-credential" }, status: 401 },
  { label: "revoked", decision: { allowed: false, reason: "revoked" }, status: 403 },
  { label: "no-subscription (free user)", decision: { allowed: false, reason: "no-subscription" }, status: 403 },
  { label: "expired", decision: { allowed: false, reason: "expired" }, status: 403 },
  { label: "error", decision: { allowed: false, reason: "error" }, status: 500 },
  { label: "active-pro", decision: { allowed: true, reason: "active-pro" }, status: 200 },
];

describe("Pro effect delivery routes - identical decision contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDecisionResult = { allowed: true };
  });

  for (const { label, decision, status } of MATRIX) {
    it(`both routes return the same outcome for: ${label}`, async () => {
      decisionResult = decision;

      const cliRes = await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
      const webRes = await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

      expect(cliRes.status).toBe(status);
      expect(webRes.status).toBe(status);

      const cliBody = await cliRes.json();
      const webBody = await webRes.json();

      if (decision.allowed) {
        expect(cliBody.tier).toBe(effectMeta.tier);
        expect(webBody.tier).toBe(effectMeta.tier);
        expect(cliBody.name).toBe(deliveryPayload.name);
        expect(webBody.name).toBe(deliveryPayload.name);
      } else {
        expect(cliBody.reason).toBe(decision.reason);
        expect(webBody.reason).toBe(decision.reason);
        expect(typeof cliBody.error).toBe("string");
        expect(typeof webBody.error).toBe("string");
      }
    });
  }

  it("both routes 404 identically when the effect doesn't exist, before any access check runs", async () => {
    const registry = await import("@/lib/registry");
    registry.getEffectMetadata.mockReturnValueOnce(null).mockReturnValueOnce(null);

    const cliRes = await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "ghost" }) });
    const webRes = await webGet(makeRequest(), { params: Promise.resolve({ slug: "ghost" }) });

    expect(cliRes.status).toBe(404);
    expect(webRes.status).toBe(404);

    const { getEffectAccessDecision } = await import("@/lib/effect-access");
    expect(getEffectAccessDecision).not.toHaveBeenCalled();
  });

  it("both routes pass the same effectTier through to the shared decision function", async () => {
    decisionResult = { allowed: true, reason: "active-pro" };
    const { getEffectAccessDecision } = await import("@/lib/effect-access");

    await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

    const calls = getEffectAccessDecision.mock.calls;
    expect(calls[0][0].effectTier).toBe("pro");
    expect(calls[1][0].effectTier).toBe("pro");
  });

  it("both routes log to install-limit only when access was granted, with the same effectSlug/effectTier", async () => {
    const { getInstallLimitDecision } = await import("@/lib/install-limit");

    decisionResult = { allowed: false, reason: "no-subscription" };
    await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });
    expect(getInstallLimitDecision).not.toHaveBeenCalled();

    decisionResult = { allowed: true, reason: "active-pro" };
    await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

    const calls = getInstallLimitDecision.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toMatchObject({ effectSlug: "test-effect", effectTier: "pro", source: "cli" });
    expect(calls[1][0]).toMatchObject({ effectSlug: "test-effect", effectTier: "pro", source: "cli" });
  });

  it("both routes attribute source: 'mcp' identically when the mcp-version header is present (Stage 1.7)", async () => {
    decisionResult = { allowed: true, reason: "active-pro" };
    const { getInstallLimitDecision } = await import("@/lib/install-limit");

    const mcpRequest = () => makeRequest({ "x-hyperiux-mcp-version": "0.1.0" });

    await cliGet(mcpRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    await webGet(mcpRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

    const calls = getInstallLimitDecision.mock.calls;
    expect(calls[0][0]).toMatchObject({ source: "mcp", mcpVersion: "0.1.0" });
    expect(calls[1][0]).toMatchObject({ source: "mcp", mcpVersion: "0.1.0" });
  });

  it("both routes 429 identically when install-limit denies (Stage 3 enforcement)", async () => {
    decisionResult = { allowed: true, reason: "active-pro" };
    installDecisionResult = {
      allowed: false,
      reason: "limit-reached",
      limit: 3,
      remaining: 0,
    };

    const cliRes = await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    const webRes = await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

    expect(cliRes.status).toBe(429);
    expect(webRes.status).toBe(429);
    expect(cliRes.headers.get("Retry-After")).toEqual(expect.any(String));
    expect(webRes.headers.get("Retry-After")).toEqual(expect.any(String));

    const cliBody = await cliRes.json();
    const webBody = await webRes.json();

    expect(cliBody).toMatchObject({ rateLimited: true, reason: "limit-reached", limit: 3, remaining: 0 });
    expect(webBody).toMatchObject({ rateLimited: true, reason: "limit-reached", limit: 3, remaining: 0 });
    // The content payload must NOT leak through on a denial.
    expect(cliBody.files).toBeUndefined();
    expect(webBody.files).toBeUndefined();
  });

  it("shadow mode (allowed: true from install-limit) never triggers the 429 branch", async () => {
    decisionResult = { allowed: true, reason: "active-pro" };
    installDecisionResult = { allowed: true, reason: "denied-but-shadow" };

    const cliRes = await cliGet(makeRequest(), { params: Promise.resolve({ effectSlug: "test-effect" }) });
    const webRes = await webGet(makeRequest(), { params: Promise.resolve({ slug: "test-effect" }) });

    expect(cliRes.status).toBe(200);
    expect(webRes.status).toBe(200);
  });
});
