import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const upsert = vi.fn(async () => ({ error: null }));
const insert = vi.fn(async () => ({ error: null }));
let grantRows = [];
let balanceRows = [];
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      upsert,
      insert,
      select: () => {
        const chain = {
          eq: () => chain,
          order: () => chain,
          limit: async () => ({ data: grantRows, error: null }),
          then: (resolve) => resolve({ data: balanceRows, error: null }),
        };
        return chain;
      },
    }),
  },
}));

process.env.RAZORPAY_PLAN_PRO_QUARTERLY_USD = "plan_pro_q";
process.env.RAZORPAY_PLAN_PLUS_YEARLY_INR = "plan_plus_y_inr";
process.env.RAZORPAY_PRO_YEARLY_PLAN_ID = "plan_legacy_yearly";

process.env.RAZORPAY_PLAN_PLUS_YEARLY_USD = "plan_plus_y";

const { grantCreditsForCharge, expireCredits } = await import("./template-credits.js");

const payment = { id: "pay_1" };

describe("grantCreditsForCharge", () => {
  beforeEach(() => {
    upsert.mockClear();
    grantRows = [];
  });

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

describe("upgrade top-up", () => {
  beforeEach(() => upsert.mockClear());

  it("Pro yearly (3) -> Pro+ yearly adds 2, for 5 this year", async () => {
    grantRows = [{ delta: 3 }];
    const credits = await grantCreditsForCharge({
      clerkUserId: "u",
      subscription: { id: "sub_plus", plan_id: "plan_plus_y", paid_count: 1, notes: { replaces_subscription_id: "sub_pro" } },
      payment: { id: "pay_up" },
      isUpgradePayment: true,
    });
    expect(credits).toBe(2);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ delta: 2 }), expect.anything());
  });

  it("the upgrade's later renewals add the full 5", async () => {
    grantRows = [{ delta: 3 }];
    const credits = await grantCreditsForCharge({
      clerkUserId: "u",
      subscription: { id: "sub_plus", plan_id: "plan_plus_y", paid_count: 1, notes: { replaces_subscription_id: "sub_pro" } },
      payment: { id: "pay_renewal" },
    });
    expect(credits).toBe(5);
  });
});

describe("expireCredits", () => {
  beforeEach(() => insert.mockClear());

  it("clears the remaining balance", async () => {
    balanceRows = [{ delta: 3 }, { delta: 5 }, { delta: -1 }];
    expect(await expireCredits("u")).toBe(7);
    expect(insert).toHaveBeenCalledWith({ clerk_user_id: "u", delta: -7, reason: "adjust" });
  });

  it("does nothing with no balance", async () => {
    balanceRows = [{ delta: 3 }, { delta: -3 }];
    expect(await expireCredits("u")).toBe(0);
    expect(insert).not.toHaveBeenCalled();
  });
});
