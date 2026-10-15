import { describe, it, expect, vi, beforeEach } from "vitest";

// Checkout + verify-payment: the client must not be able to choose its own
// price, and a payment proof must only unlock what was actually paid, for
// the account that paid it. Reports: H2, H3, M7.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => ({})) }));

// Visitor geo header as Vercel would set it (lib/visitor-country.js).
let visitorCountry = "US";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(visitorCountry ? { "x-vercel-ip-country": visitorCountry } : {}),
  cookies: async () => ({ get: () => undefined }),
}));

const razorpayState = { subscriptions: {}, invoices: {}, orders: {} };
const createSubscription = vi.fn(async (args) => ({ id: "sub_new", ...args }));
const createOrder = vi.fn(async (args) => ({ id: "order_new", ...args }));
vi.mock("@/lib/razorpay", () => ({
  razorpay: {
    subscriptions: {
      create: (...a) => createSubscription(...a),
      fetch: vi.fn(async (id) => razorpayState.subscriptions[id]),
      cancel: vi.fn(),
    },
    invoices: { fetch: vi.fn(async (id) => razorpayState.invoices[id]), create: vi.fn() },
    orders: { create: (...a) => createOrder(...a), fetch: vi.fn(async (id) => razorpayState.orders[id]) },
    payments: { fetch: vi.fn(async (id) => ({ id, amount: 17900, currency: "USD" })) },
  },
  withRazorpayRetry: (call) => call(),
}));

const KEY_SECRET = "rzp_secret_" + "k".repeat(20);
process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
process.env.RAZORPAY_KEY_ID = "rzp_test_key";
process.env.RAZORPAY_PLAN_PRO_YEARLY_USD = "plan_pro_y_usd";
process.env.RAZORPAY_PLAN_PRO_YEARLY_INR = "plan_pro_y_inr";

const { db, clerk, makeUser, makeRequest, signRazorpay } = await import("../helpers/route-harness.js");
const { POST: createSub } = await import("@/app/api/razorpay/create-subscription/route.js");
const { POST: createOrd } = await import("@/app/api/razorpay/create-order/route.js");
const { POST: verify } = await import("@/app/api/razorpay/verify-payment/route.js");

const NOW_S = Math.floor(Date.now() / 1000);
const post = (handler, body) => handler(makeRequest("/x", { method: "POST", body }));
const subRow = (id) => db.rows("subscriptions").find((r) => r.clerk_user_id === id);

beforeEach(() => {
  vi.clearAllMocks();
  visitorCountry = "US";
  clerk.reset({ user_a: makeUser("user_a"), user_b: makeUser("user_b") });
  db.reset({
    subscriptions: [
      { clerk_user_id: "user_a", plan: "free", status: "inactive" },
      { clerk_user_id: "user_b", plan: "free", status: "inactive" },
    ],
  });
  razorpayState.subscriptions = {};
  razorpayState.invoices = {};
  razorpayState.orders = {};
});

describe("checkout pricing is decided server-side", () => {
  it("signed-out checkout is refused", async () => {
    expect((await post(createSub, { tier: "pro", interval: "yearly" })).status).toBe(401);
    expect((await post(createOrd, { templateSlug: "lumera" })).status).toBe(401);
  });

  it("unknown tiers/intervals and injected plan ids are rejected", async () => {
    clerk.signIn("user_a");
    expect((await post(createSub, { tier: "free_forever", interval: "yearly" })).status).toBe(400);
    expect((await post(createSub, { tier: "pro", interval: "lifetime" })).status).toBe(400);
    await post(createSub, { tier: "pro", interval: "yearly", plan_id: "plan_attacker", planId: "plan_attacker" });
    expect(createSubscription.mock.calls[0][0].plan_id).toBe("plan_pro_y_usd");
  });

  it("the subscription is stamped with the session user, not a body-supplied one", async () => {
    clerk.signIn("user_a");
    await post(createSub, { tier: "pro", interval: "yearly", clerk_user_id: "user_b", notes: { clerk_user_id: "user_b" } });
    expect(createSubscription.mock.calls[0][0].notes.clerk_user_id).toBe("user_a");
  });

  it("a template order is priced from the catalogue, not the request body", async () => {
    clerk.signIn("user_a");
    const { getTemplateBySlug } = await import("@/lib/mock-templates");
    const priced = ["lumera", "kyntra", "elenavoss", "oris-dental"].find(
      (slug) => getTemplateBySlug(slug)?.pricing?.standaloneOneTime > 0
    );
    expect(priced).toBeTruthy();
    const { razorpay } = await import("@/lib/razorpay");
    razorpay.invoices.create.mockResolvedValue({ id: "inv_1", order_id: "order_1" });
    await post(createOrd, { templateSlug: priced, amount: 0.01, currency: "INR" });
    const invoiceArgs = razorpay.invoices.create.mock.calls[0]?.[0];
    const catalogue = getTemplateBySlug(priced).pricing.standaloneOneTime;
    expect(invoiceArgs.line_items[0].amount).toBe(Math.round(catalogue * 100));
    expect(invoiceArgs.currency).toBe("USD");
    expect(invoiceArgs.notes.clerk_user_id).toBe("user_a");
  });

  // Currency comes from the request body (`body.currency === "INR"`), and
  // the server never consults getVisitorCurrency(). Anyone outside India
  // can POST currency:"INR" and subscribe at the INR plan price.
  it("[H2] a visitor geolocated outside India can't pick the INR plan by sending currency: INR", async () => {
    clerk.signIn("user_a");
    visitorCountry = "US";
    await post(createSub, { tier: "pro", interval: "yearly", currency: "INR" });
    expect(createSubscription.mock.calls[0][0].plan_id).toBe("plan_pro_y_usd");
  });

  it("control: a visitor geolocated in India gets the INR plan whatever currency they send", async () => {
    clerk.signIn("user_a");
    visitorCountry = "IN";
    await post(createSub, { tier: "pro", interval: "yearly", currency: "USD" });
    expect(createSubscription.mock.calls[0][0].plan_id).toBe("plan_pro_y_inr");
  });

  // The legacy test-payment branch of create-order accepts any positive
  // body.amount and creates a live Razorpay order for it.
  it.fails("[M7] create-order without a product does not create a charge for a client-chosen amount", async () => {
    clerk.signIn("user_a");
    const res = await post(createOrd, { amount: 123456 });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe("verify-payment binds proofs to the paying account", () => {
  const subProof = (subscriptionId, paymentId = "pay_1") => ({
    razorpay_subscription_id: subscriptionId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signRazorpay(`${paymentId}|${subscriptionId}`, KEY_SECRET),
  });

  it("rejects a forged signature", async () => {
    clerk.signIn("user_a");
    razorpayState.subscriptions.sub_a = { id: "sub_a", status: "active", notes: { clerk_user_id: "user_a" } };
    const res = await post(verify, { ...subProof("sub_a"), razorpay_signature: "0".repeat(64) });
    expect(res.status).toBe(400);
    expect(subRow("user_a").plan).toBe("free");
  });

  it("control: the payer's own proof for a live subscription grants Pro", async () => {
    razorpayState.subscriptions.sub_a = {
      id: "sub_a",
      plan_id: "plan_pro_y_usd",
      status: "active",
      current_end: NOW_S + 86400 * 365,
      notes: { clerk_user_id: "user_a" },
    };
    clerk.signIn("user_a");
    const res = await post(verify, subProof("sub_a"));
    expect(res.status).toBe(200);
    expect(subRow("user_a").plan).toBe("pro");
  });

  it("control: the payer's own paid invoice records the template purchase", async () => {
    razorpayState.invoices.inv_a = { id: "inv_a", status: "paid", amount: 2900, notes: { clerk_user_id: "user_a", template_slug: "lumera" } };
    clerk.signIn("user_a");
    const res = await post(verify, {
      razorpay_invoice_id: "inv_a",
      razorpay_invoice_receipt: "r",
      razorpay_invoice_status: "paid",
      razorpay_payment_id: "pay_1",
      razorpay_signature: signRazorpay(`inv_a|r|paid|pay_1`, KEY_SECRET),
    });
    expect(res.status).toBe(200);
    expect(db.rows("template_purchases")).toHaveLength(1);
  });

  it("user B can't claim user A's paid subscription with A's valid proof", async () => {
    razorpayState.subscriptions.sub_a = {
      id: "sub_a",
      plan_id: "plan_pro_y_usd",
      status: "active",
      current_end: NOW_S + 86400 * 365,
      notes: { clerk_user_id: "user_a" },
    };
    clerk.signIn("user_b");
    const res = await post(verify, subProof("sub_a"));
    expect(res.status).toBe(403);
    expect(subRow("user_b").plan).toBe("free");
  });

  it("user B can't claim user A's template invoice", async () => {
    razorpayState.invoices.inv_a = { id: "inv_a", status: "paid", amount: 2900, notes: { clerk_user_id: "user_a", template_slug: "lumera" } };
    clerk.signIn("user_b");
    const payload = { razorpay_invoice_id: "inv_a", razorpay_invoice_receipt: "r", razorpay_invoice_status: "paid", razorpay_payment_id: "pay_1" };
    const res = await post(verify, {
      ...payload,
      razorpay_signature: signRazorpay(`inv_a|r|paid|pay_1`, KEY_SECRET),
    });
    expect(res.status).toBe(403);
    expect(db.rows("template_purchases")).toHaveLength(0);
  });

  // verify-payment never looks at subscription.status: re-posting an old,
  // validly signed proof for a subscription that has since been cancelled
  // re-runs markUserProFromSubscription and flips Clerk's publicMetadata
  // back to proAccess:true (the Supabase gate still checks status, so the
  // practical effect is stale/incorrect entitlement state, not source).
  it("[H3] a valid proof for a since-cancelled subscription does not re-grant Pro", async () => {
    razorpayState.subscriptions.sub_a = {
      id: "sub_a",
      plan_id: "plan_pro_y_usd",
      status: "cancelled",
      current_end: NOW_S + 86400 * 30,
      notes: { clerk_user_id: "user_a" },
    };
    clerk.signIn("user_a");
    await post(verify, subProof("sub_a"));
    expect(clerk.users.user_a.publicMetadata.proAccess ?? false).toBe(false);
    expect(subRow("user_a").plan).toBe("free");
  });

  it("[H3] an unpaid template invoice does not record a purchase", async () => {
    razorpayState.invoices.inv_a = { id: "inv_a", status: "issued", amount: 2900, notes: { clerk_user_id: "user_a", template_slug: "lumera" } };
    clerk.signIn("user_a");
    await post(verify, {
      razorpay_invoice_id: "inv_a",
      razorpay_invoice_receipt: "r",
      razorpay_invoice_status: "issued",
      razorpay_payment_id: "pay_1",
      razorpay_signature: signRazorpay(`inv_a|r|issued|pay_1`, KEY_SECRET),
    });
    expect(db.rows("template_purchases")).toHaveLength(0);
  });
});
