import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_1" })),
}));

let planInfo;
vi.mock("@/lib/subscription", () => ({
  getUserPlanInfo: vi.fn(async () => planInfo),
}));

const redeem = vi.fn();
vi.mock("@/lib/template-credits", () => ({
  redeemTemplateCredit: (...args) => redeem(...args),
}));

const { auth } = await import("@clerk/nextjs/server");
const { POST } = await import("./route.js");

const call = (slug) => POST(new Request(`http://localhost/api/templates/${slug}/redeem`, { method: "POST" }), {
  params: Promise.resolve({ slug }),
});

// elenavoss is in the "selected" catalogue, kyntra in "full" (lib/mock-templates.js)
describe("POST /api/templates/[slug]/redeem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ userId: "user_1" });
    planInfo = { plan: "pro", tier: "pro" };
    redeem.mockResolvedValue({ status: "redeemed", balance: 2 });
  });

  it("404s an unknown template and 401s when signed out", async () => {
    expect((await call("nope")).status).toBe(404);
    auth.mockResolvedValue({ userId: null });
    expect((await call("elenavoss")).status).toBe(401);
  });

  it("403s free users", async () => {
    planInfo = { plan: "free", tier: "free" };
    const res = await call("elenavoss");
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("no-plan");
    expect(redeem).not.toHaveBeenCalled();
  });

  it("Pro can redeem a selected template but not a full-catalogue one", async () => {
    const ok = await call("elenavoss");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ redeemed: true, balance: 2 });
    expect(redeem).toHaveBeenCalledWith({ clerkUserId: "user_1", templateSlug: "elenavoss" });

    const locked = await call("kyntra");
    expect(locked.status).toBe(403);
    expect((await locked.json()).reason).toBe("needs-pro-plus");
  });

  it("Pro+ can redeem a full-catalogue template", async () => {
    planInfo = { plan: "pro", tier: "pro_plus" };
    expect((await call("kyntra")).status).toBe(200);
  });

  it("maps already-owned, no-credits and errors", async () => {
    redeem.mockResolvedValueOnce({ status: "already-owned", balance: 3 });
    expect((await call("elenavoss")).status).toBe(409);
    redeem.mockResolvedValueOnce({ status: "no-credits", balance: 0 });
    expect((await call("elenavoss")).status).toBe(402);
    redeem.mockResolvedValueOnce({ status: "error", balance: null });
    expect((await call("elenavoss")).status).toBe(500);
  });
});
