import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/subscription", () => ({ ACTIVE_PRO_STATUSES: ["authenticated", "active", "trialing"] }));

let row = null;
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
  },
}));

const fetchSub = vi.fn();
const cancelSub = vi.fn();
vi.mock("@/lib/razorpay", () => ({
  razorpay: { subscriptions: { fetch: (...a) => fetchSub(...a), cancel: (...a) => cancelSub(...a) } },
  withRazorpayRetry: (call) => call(),
}));

const { shouldApplySubscriptionEvent, cancelReplacedSubscription } = await import("./subscription-events.js");
const apply = (subscription, kind) => shouldApplySubscriptionEvent({ clerkUserId: "u", subscription, kind });

describe("shouldApplySubscriptionEvent", () => {
  beforeEach(() => { row = null; });

  it("applies events for the user's current subscription, or when there is none", async () => {
    expect(await apply({ id: "sub_a" }, "start")).toBe(true);
    row = { razorpay_subscription_id: "sub_a", plan: "pro", status: "active" };
    expect(await apply({ id: "sub_a" }, "start")).toBe(true);
    expect(await apply({ id: "sub_a" }, "end")).toBe(true);
  });

  it("ignores the replaced Pro subscription's cancellation after an upgrade", async () => {
    row = { razorpay_subscription_id: "sub_plus", plan: "pro", status: "active" };
    expect(await apply({ id: "sub_pro" }, "end")).toBe(false);
  });

  it("lets the upgrade's new subscription in before the row switches over", async () => {
    row = { razorpay_subscription_id: "sub_pro", plan: "pro", status: "active" };
    expect(await apply({ id: "sub_plus", notes: { replaces_subscription_id: "sub_pro" } }, "start")).toBe(true);
    expect(await apply({ id: "sub_stray", notes: {} }, "start")).toBe(false);
  });

  it("lets a fresh subscription in once the old one has ended", async () => {
    row = { razorpay_subscription_id: "sub_old", plan: "free", status: "cancelled" };
    fetchSub.mockResolvedValue({ status: "active" });
    expect(await apply({ id: "sub_new" }, "start")).toBe(true);
  });

  it("asks Razorpay before a start event revives an ended subscription", async () => {
    row = { razorpay_subscription_id: "sub_a", plan: "free", status: "cancelled" };
    fetchSub.mockResolvedValue({ status: "cancelled" });
    expect(await apply({ id: "sub_a", status: "active" }, "start")).toBe(false);
    expect(await apply({ id: "sub_older", status: "active" }, "start")).toBe(false);

    // A halted subscription whose retried payment went through
    row = { razorpay_subscription_id: "sub_a", plan: "free", status: "halted" };
    fetchSub.mockResolvedValue({ status: "active" });
    expect(await apply({ id: "sub_a" }, "start")).toBe(true);
  });
});

describe("cancelReplacedSubscription", () => {
  beforeEach(() => { fetchSub.mockReset(); cancelSub.mockReset(); });

  it("cancels the replaced subscription immediately", async () => {
    fetchSub.mockResolvedValue({ status: "active" });
    expect(await cancelReplacedSubscription({ id: "sub_plus", notes: { replaces_subscription_id: "sub_pro" } })).toBe(true);
    expect(cancelSub).toHaveBeenCalledWith("sub_pro", false);
  });

  it("does nothing without an upgrade, or when it's already cancelled", async () => {
    expect(await cancelReplacedSubscription({ id: "sub_a", notes: {} })).toBe(true);
    fetchSub.mockResolvedValue({ status: "cancelled" });
    expect(await cancelReplacedSubscription({ id: "sub_plus", notes: { replaces_subscription_id: "sub_pro" } })).toBe(true);
    expect(cancelSub).not.toHaveBeenCalled();
  });

  it("reports failure without throwing", async () => {
    fetchSub.mockRejectedValue(new Error("razorpay down"));
    expect(await cancelReplacedSubscription({ id: "sub_plus", notes: { replaces_subscription_id: "sub_pro" } })).toBe(false);
  });
});
