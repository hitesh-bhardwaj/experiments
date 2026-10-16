import { describe, it, expect, vi, beforeEach } from "vitest";

let session = { userId: "user_1" };
let row = null;
const fetchSub = vi.fn();
const cancel = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => session),
  clerkClient: vi.fn(async () => ({ users: { getUser, updateUser } })),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }) },
}));
vi.mock("@/lib/razorpay", () => ({ razorpay: { subscriptions: { fetch: (...a) => fetchSub(...a), cancel: (...a) => cancel(...a) } } }));

const { POST } = await import("./route.js");

describe("POST /api/user/cancel-subscription", () => {
  beforeEach(() => {
    session = { userId: "user_1" };
    row = { plan: "pro", razorpay_subscription_id: "sub_1", current_period_end: "2027-03-14T10:00:00.000Z" };
    for (const fn of [fetchSub, cancel, getUser, updateUser]) fn.mockReset();
    fetchSub.mockResolvedValue({ status: "active" });
    cancel.mockResolvedValue({});
    getUser.mockResolvedValue({ publicMetadata: { plan: "pro", tier: "pro" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("needs a session", async () => {
    session = { userId: null };
    expect((await POST()).status).toBe(401);
  });

  it("cancels at the end of the period and remembers it on the account", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelAtPeriodEnd: true, accessUntil: "2027-03-14T10:00:00.000Z" });
    expect(cancel).toHaveBeenCalledWith("sub_1", true);
    expect(updateUser).toHaveBeenCalledWith("user_1", { publicMetadata: { plan: "pro", tier: "pro", cancelScheduledFor: "sub_1" } });
  });

  it("doesn't cancel again a subscription Razorpay has already ended", async () => {
    fetchSub.mockResolvedValue({ status: "cancelled" });
    expect((await POST()).status).toBe(200);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("refuses plans with no Razorpay subscription (granted by the team) and free accounts", async () => {
    row = { plan: "pro", razorpay_subscription_id: null };
    expect((await POST()).status).toBe(400);
    row = { plan: "free", razorpay_subscription_id: "sub_1" };
    expect((await POST()).status).toBe(400);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("reports a Razorpay failure and leaves the account alone", async () => {
    cancel.mockRejectedValue(new Error("razorpay down"));
    expect((await POST()).status).toBe(502);
    expect(updateUser).not.toHaveBeenCalled();
  });
});
