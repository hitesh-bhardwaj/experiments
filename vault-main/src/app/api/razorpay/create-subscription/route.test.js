import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_1" })),
}));

const createMock = vi.fn();
vi.mock("@/lib/razorpay", () => ({
  razorpay: { subscriptions: { create: (...args) => createMock(...args) } },
}));

process.env.RAZORPAY_PRO_YEARLY_PLAN_ID = "plan_yearly_usd";
process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID = "plan_monthly_usd";
process.env.RAZORPAY_PRO_YEARLY_INR_PLAN_ID = "plan_yearly_inr";
process.env.RAZORPAY_PRO_MONTHLY_INR_PLAN_ID = "plan_monthly_inr";
process.env.RAZORPAY_KEY_ID = "rzp_test_key";

const { auth } = await import("@clerk/nextjs/server");
const { POST } = await import("./route.js");

function makeRequest(body) {
  return new Request("http://localhost/api/razorpay/create-subscription", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Founding Annual (first-100-users discounted yearly plan) is disabled -
// every "yearly" request now goes straight to the standard plan_id, no
// reservation system involved. See route.js's comment for why the founding
// env vars/plan mapping are still read elsewhere (pro-access.js, webhooks).
describe("POST /api/razorpay/create-subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ userId: "user_1" });
  });

  it("401s when signed out", async () => {
    auth.mockResolvedValue({ userId: null });
    const res = await POST(makeRequest({ plan: "yearly" }));
    expect(res.status).toBe(401);
  });

  it("400s an invalid plan", async () => {
    const res = await POST(makeRequest({ plan: "lifetime" }));
    expect(res.status).toBe(400);
  });

  it("monthly USD request creates a subscription at the standard monthly plan_id", async () => {
    createMock.mockResolvedValue({ id: "sub_1" });
    const res = await POST(makeRequest({ plan: "monthly" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: "plan_monthly_usd" })
    );
    expect(body.founding).toBe(false);
  });

  it("yearly INR request creates a subscription at the standard yearly INR plan_id, no idempotencyKey required", async () => {
    createMock.mockResolvedValue({ id: "sub_2" });
    const res = await POST(makeRequest({ plan: "yearly", currency: "INR" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: "plan_yearly_inr" })
    );
    expect(body.founding).toBe(false);
  });

  it("returns 502 with a specific reason when Razorpay create fails", async () => {
    createMock.mockRejectedValue(new Error("razorpay down"));

    const res = await POST(makeRequest({ plan: "yearly" }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.reason).toBe("razorpay_error");
  });
});
