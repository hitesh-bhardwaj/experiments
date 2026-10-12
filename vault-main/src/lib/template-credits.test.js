import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const upsert = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: () => ({ upsert }) },
}));

process.env.RAZORPAY_PLAN_PRO_QUARTERLY_USD = "plan_pro_q";
process.env.RAZORPAY_PLAN_PLUS_YEARLY_INR = "plan_plus_y_inr";
process.env.RAZORPAY_PRO_YEARLY_PLAN_ID = "plan_legacy_yearly";

const { grantCreditsForCharge } = await import("./template-credits.js");

const payment = { id: "pay_1" };

describe("grantCreditsForCharge", () => {
  beforeEach(() => upsert.mockClear());

  it("adds a yearly Pro+ charge's 5 credits once per payment ID", async () => {
    const credits = await grantCreditsForCharge({
      clerkUserId: "user_1",
      subscription: { id: "sub_1", plan_id: "plan_plus_y_inr", paid_count: 1 },
      payment,
    });
    expect(credits).toBe(5);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ clerk_user_id: "user_1", delta: 5, reason: "grant", razorpay_payment_id: "pay_1" }),
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    );
  });

  it("quarterly Pro charges add no credits", async () => {
    const sub = (n) => ({ id: "sub_2", plan_id: "plan_pro_q", paid_count: n });
    expect(await grantCreditsForCharge({ clerkUserId: "u", subscription: sub(1), payment })).toBe(0);
    expect(await grantCreditsForCharge({ clerkUserId: "u", subscription: sub(5), payment })).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("legacy and unknown plans earn no credits", async () => {
    expect(
      await grantCreditsForCharge({ clerkUserId: "u", subscription: { plan_id: "plan_legacy_yearly", paid_count: 1 }, payment })
    ).toBe(0);
    expect(
      await grantCreditsForCharge({ clerkUserId: "u", subscription: { plan_id: "plan_unknown", paid_count: 1 }, payment })
    ).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("throws on a database error so the webhook is retried", async () => {
    upsert.mockResolvedValueOnce({ error: new Error("db down") });
    await expect(
      grantCreditsForCharge({ clerkUserId: "u", subscription: { plan_id: "plan_plus_y_inr", paid_count: 1 }, payment })
    ).rejects.toThrow("db down");
  });
});
