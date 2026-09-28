import { describe, it, expect, vi, beforeEach } from "vitest";

// Free (non-Pro) accounts must be able to generate a CLI token too, so their
// CLI/MCP usage resolves to their real signed-in identity (lib/install-limit.js's
// `user:<clerkUserId>` bucket, 3/day) instead of silently falling back to the
// anonymous device/IP bucket (2/day) just because they have no token to send.
// Pro-gated content access is unaffected - that's decided independently and
// freshly on every request by effect-access.js, not by whether a token exists.

let userId;
let updateResult;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(updateResult)),
      })),
    })),
  },
}));

const { POST } = await import("./route.js");

describe("POST /api/cli/token", () => {
  beforeEach(() => {
    userId = null;
    updateResult = { error: null };
  });

  it("401s when not signed in", async () => {
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("issues a token for a signed-in free account - no plan check at all", async () => {
    userId = "user_free";

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.token).toMatch(/^hpx_[0-9a-f]{64}$/);
  });

  it("issues a token for a signed-in pro account too", async () => {
    userId = "user_pro";

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.token).toMatch(/^hpx_/);
  });

  it("500s if the token can't be persisted, without throwing", async () => {
    userId = "user_free";
    updateResult = { error: new Error("connection reset") };

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
