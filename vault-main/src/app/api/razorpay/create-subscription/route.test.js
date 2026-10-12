import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_1" })),
}));

const createMock = vi.fn();
vi.mock("@/lib/razorpay", () => ({
  razorpay: { subscriptions: { create: (...args) => createMock(...args) } },
}));

let subscriptionRow = null;
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: subscriptionRow, error: null }) }),
      }),
    }),
  },
}));

process.env.RAZORPAY_PLAN_PRO_QUARTERLY_USD = "plan_pro_q_usd";
process.env.RAZORPAY_PLAN_PRO_YEARLY_INR = "plan_pro_y_inr";
process.env.RAZORPAY_PLAN_PLUS_YEARLY_USD = "plan_plus_y_usd";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";

const { auth } = await import("@clerk/nextjs/server");
const { POST } = await import("./route.js");

function makeRequest(body) {
  return new Request("http://localhost/api/razorpay/create-subscription", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/razorpay/create-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ userId: "user_1" });
    subscriptionRow = null;
  });

  it("401s when signed out", async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ tier: "pro", interval: "yearly" }));
    expect(res.status).toBe(401);
  });

  it("400s an invalid tier or interval, including the retired monthly plan", async () => {
    expect((await POST(makeRequest({ tier: "pro", interval: "lifetime" }))).status).toBe(400);
    expect((await POST(makeRequest({ tier: "enterprise", interval: "yearly" }))).status).toBe(400);
    expect((await POST(makeRequest({ plan: "monthly" }))).status).toBe(400);
  });

  it("Pro quarterly USD subscribes to that plan_id with the tier in the notes", async () => {
    createMock.mockResolvedValue({ id: "sub_1" });
    const res = await POST(makeRequest({ tier: "pro", interval: "quarterly" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plan_id: "plan_pro_q_usd",
        total_count: 40,
        notes: expect.objectContaining({ tier: "pro", plan_key: "quarterly", currency: "USD" }),
      })
    );
    expect(body.founding).toBe(false);
  });

  it("Pro yearly INR and Pro+ yearly USD pick their own plan_ids", async () => {
    createMock.mockResolvedValue({ id: "sub_2" });
    await POST(makeRequest({ tier: "pro", interval: "yearly", currency: "INR" }));
    await POST(makeRequest({ tier: "pro_plus", interval: "yearly" }));

    expect(createMock.mock.calls[0][0].plan_id).toBe("plan_pro_y_inr");
    expect(createMock.mock.calls[1][0].plan_id).toBe("plan_plus_y_usd");
  });

  it("503s when that plan isn't set in env", async () => {
    const res = await POST(makeRequest({ tier: "pro_plus", interval: "quarterly", currency: "INR" }));
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("plan_not_configured");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("409s while the user already has an active Razorpay subscription", async () => {
    subscriptionRow = {
      plan: "pro",
      status: "active",
      current_period_end: new Date(Date.now() + 86_400_000).toISOString(),
      razorpay_subscription_id: "sub_existing",
    };
    const res = await POST(makeRequest({ tier: "pro_plus", interval: "yearly" }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("already_subscribed");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("lets an admin-granted Pro (no Razorpay subscription) or a cancelled one check out", async () => {
    createMock.mockResolvedValue({ id: "sub_3" });
    subscriptionRow = { plan: "pro", status: "active", current_period_end: null, razorpay_subscription_id: null };
    expect((await POST(makeRequest({ tier: "pro_plus", interval: "yearly" }))).status).toBe(200);

    subscriptionRow = { plan: "free", status: "cancelled", current_period_end: null, razorpay_subscription_id: "sub_old" };
    expect((await POST(makeRequest({ tier: "pro_plus", interval: "yearly" }))).status).toBe(200);
  });

  it("returns 502 with a specific reason when Razorpay create fails", async () => {
    createMock.mockRejectedValue(new Error("razorpay down"));

    const res = await POST(makeRequest({ tier: "pro_plus", interval: "yearly" }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.reason).toBe("razorpay_error");
  });
});
