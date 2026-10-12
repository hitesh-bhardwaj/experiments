import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/subscription", () => ({ ACTIVE_PRO_STATUSES: ["authenticated", "active", "trialing"] }));

let row = null;
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
  },
}));

const plans = {};
let subscriptionEntity = null;
vi.mock("@/lib/razorpay", () => ({
  razorpay: {
    subscriptions: { fetch: async () => subscriptionEntity },
    plans: { fetch: async (id) => plans[id] },
  },
}));

process.env.RAZORPAY_PLAN_PRO_QUARTERLY_USD = "p_pro_q";
process.env.RAZORPAY_PLAN_PRO_YEARLY_USD = "p_pro_y";
process.env.RAZORPAY_PLAN_PRO_YEARLY_INR = "p_pro_y_inr";
process.env.RAZORPAY_PLAN_PLUS_QUARTERLY_USD = "p_plus_q";
process.env.RAZORPAY_PLAN_PLUS_YEARLY_USD = "p_plus_y";
process.env.RAZORPAY_PLAN_PLUS_YEARLY_INR = "p_plus_y_inr";
Object.assign(plans, {
  p_pro_q: { item: { amount: 2700 } },
  p_pro_y: { item: { amount: 7900 } },
  p_pro_y_inr: { item: { amount: 529900 } },
  p_plus_q: { item: { amount: 5700 } },
  p_plus_y: { item: { amount: 17900 } },
  p_plus_y_inr: { item: { amount: 1061900 } },
});

const { addPeriod, computeUpgradeCharge, isUpgradeAllowed, getUpgradeQuote } = await import("./upgrade.js");

const DAY = 86400;
const at = (iso) => Math.floor(new Date(iso).getTime() / 1000);

describe("computeUpgradeCharge", () => {
  it("credits the unused part of Pro: 2 months into Pro yearly, upgrading to Pro+ yearly", () => {
    const start = at("2026-01-01T00:00:00Z");
    const end = addPeriod(start, "yearly"); // 365 days
    const now = start + 59 * DAY; // 1 Mar
    const { credit, charge, daysLeft } = computeUpgradeCharge({
      oldAmount: 7900, periodStart: start, periodEnd: end, newAmount: 17900, now,
    });
    expect(daysLeft).toBe(306);
    expect(credit).toBe(Math.floor((7900 * 306) / 365)); // $66.23 of Pro unused
    expect(charge).toBe(17900 - credit); // $112.77 today
  });

  it("charges the full Pro+ price once Pro has run out, and never below the minimum", () => {
    expect(computeUpgradeCharge({ oldAmount: 2700, periodStart: 0, periodEnd: 100, newAmount: 5700, now: 200 }).charge).toBe(5700);
    expect(computeUpgradeCharge({ oldAmount: 9000, periodStart: 0, periodEnd: 100, newAmount: 5700, now: 0 }).charge).toBe(100);
  });
});

describe("addPeriod / isUpgradeAllowed", () => {
  it("lands on the same day a quarter or a year later", () => {
    expect(new Date(addPeriod(at("2026-10-12T10:00:00Z"), "quarterly") * 1000).toISOString()).toBe("2027-01-12T10:00:00.000Z");
    expect(new Date(addPeriod(at("2026-10-12T10:00:00Z"), "yearly") * 1000).toISOString()).toBe("2027-10-12T10:00:00.000Z");
  });

  it("allows Pro -> Pro+ only, never yearly -> quarterly", () => {
    expect(isUpgradeAllowed({ fromTier: "pro", fromInterval: "quarterly", toTier: "pro_plus", toInterval: "quarterly" })).toBe(true);
    expect(isUpgradeAllowed({ fromTier: "pro", fromInterval: "quarterly", toTier: "pro_plus", toInterval: "yearly" })).toBe(true);
    expect(isUpgradeAllowed({ fromTier: "pro", fromInterval: "yearly", toTier: "pro_plus", toInterval: "yearly" })).toBe(true);
    expect(isUpgradeAllowed({ fromTier: "pro", fromInterval: "yearly", toTier: "pro_plus", toInterval: "quarterly" })).toBe(false);
    expect(isUpgradeAllowed({ fromTier: "pro_plus", fromInterval: "quarterly", toTier: "pro_plus", toInterval: "yearly" })).toBe(false);
  });
});

describe("getUpgradeQuote", () => {
  const now = at("2026-03-01T00:00:00Z");
  beforeEach(() => {
    subscriptionEntity = { current_start: at("2026-01-01T00:00:00Z"), current_end: at("2027-01-01T00:00:00Z") };
  });

  it("prices Pro yearly -> Pro+ yearly in the current subscription's currency", async () => {
    row = { plan: "pro", tier: "pro", status: "active", billing_interval: "yearly", current_period_end: "2027-01-01T00:00:00Z", razorpay_subscription_id: "sub_pro", razorpay_plan_id: "p_pro_y_inr" };
    const q = await getUpgradeQuote({ clerkUserId: "u", tier: "pro_plus", interval: "yearly", now });
    expect(q.eligible).toBe(true);
    expect(q.currency).toBe("INR");
    expect(q.newPlanId).toBe("p_plus_y_inr");
    expect(q.credit).toBe(Math.floor((529900 * 306) / 365));
    expect(q.charge).toBe(1061900 - q.credit);
    expect(q.replacesSubscriptionId).toBe("sub_pro");
    expect(new Date(q.renewsAt * 1000).toISOString()).toBe("2027-03-01T00:00:00.000Z");
  });

  it("refuses yearly -> quarterly, non-Pro and no subscription", async () => {
    row = { plan: "pro", tier: "pro", status: "active", razorpay_subscription_id: "s", razorpay_plan_id: "p_pro_y" };
    expect((await getUpgradeQuote({ clerkUserId: "u", tier: "pro_plus", interval: "quarterly", now })).reason).toBe("interval-not-allowed");
    row = { ...row, tier: "pro_plus" };
    expect((await getUpgradeQuote({ clerkUserId: "u", tier: "pro_plus", interval: "yearly", now })).reason).toBe("not-an-upgrade");
    row = null;
    expect((await getUpgradeQuote({ clerkUserId: "u", tier: "pro_plus", interval: "yearly", now })).reason).toBe("no-subscription");
  });
});
