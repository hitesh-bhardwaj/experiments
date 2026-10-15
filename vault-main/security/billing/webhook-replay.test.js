import { describe, it, expect, vi, beforeEach } from "vitest";

// Payment-to-entitlement integrity on the Razorpay webhook: only correctly
// signed events change entitlements, and a replayed or late event must not
// double-apply or resurrect a plan. Runs the real webhook route, pro-access,
// template-credits and subscription-events against the in-memory Supabase /
// Clerk fakes. Reports: H3, L7.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/razorpay", () => ({
  razorpay: {
    subscriptions: { fetch: vi.fn(async (id) => ({ id, status: "cancelled" })), cancel: vi.fn() },
  },
  withRazorpayRetry: (call) => call(),
}));
const sendEmail = vi.fn(async () => ({ id: "email_1" }));
vi.mock("@/lib/resend", () => ({ sendEmail: (...args) => sendEmail(...args) }));

const SECRET = "whsec_test_" + "x".repeat(24);
process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
process.env.RAZORPAY_PLAN_PRO_YEARLY_USD = "plan_pro_y_usd";

const { db, clerk, makeUser, makeRequest, signRazorpay } = await import("../helpers/route-harness.js");
const { POST: webhook } = await import("@/app/api/razorpay/webhooks/route.js");

const NOW_S = Math.floor(Date.now() / 1000);

function subscriptionEntity(overrides = {}) {
  return {
    id: "sub_1",
    plan_id: "plan_pro_y_usd",
    status: "active",
    customer_id: "cust_1",
    current_end: NOW_S + 365 * 86400,
    paid_count: 1,
    short_url: "https://rzp.io/i/abc",
    notes: { clerk_user_id: "user_victim", tier: "pro" },
    ...overrides,
  };
}

function event(name, { subscription = {}, payment } = {}) {
  return {
    entity: "event",
    event: name,
    payload: {
      subscription: { entity: subscriptionEntity(subscription) },
      ...(payment ? { payment: { entity: payment } } : {}),
    },
    created_at: NOW_S,
  };
}

const PAYMENT = { id: "pay_1", amount: 17900, currency: "USD", status: "captured" };

function post(body, { signature, secret = SECRET } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return webhook(
    makeRequest("/api/razorpay/webhooks", {
      method: "POST",
      body: raw,
      headers: { "x-razorpay-signature": signature ?? signRazorpay(raw, secret) },
    })
  );
}

const subRow = () => db.rows("subscriptions").find((r) => r.clerk_user_id === "user_victim");

beforeEach(() => {
  sendEmail.mockClear();
  clerk.reset({ user_victim: makeUser("user_victim") });
  db.reset({ subscriptions: [{ clerk_user_id: "user_victim", plan: "free", status: "inactive" }] });
});

describe("webhook authentication", () => {
  const charged = event("subscription.charged", { payment: PAYMENT });

  it("rejects a missing signature and changes nothing", async () => {
    const res = await post(charged, { signature: "" });
    expect(res.status).toBe(400);
    expect(subRow().plan).toBe("free");
  });

  it("rejects a signature made with the wrong secret", async () => {
    const res = await post(charged, { secret: "attacker-guess" });
    expect(res.status).toBe(400);
    expect(subRow().plan).toBe("free");
  });

  it("rejects a valid signature replayed over a modified body (HMAC is over the raw bytes)", async () => {
    const original = JSON.stringify(charged);
    const signature = signRazorpay(original, SECRET);
    const tampered = JSON.stringify({
      ...charged,
      payload: { ...charged.payload, subscription: { entity: subscriptionEntity({ notes: { clerk_user_id: "user_attacker" } }) } },
    });
    const res = await post(tampered, { signature });
    expect(res.status).toBe(400);
  });

  it("rejects a valid signature over semantically-equal but re-serialised JSON", async () => {
    const signature = signRazorpay(JSON.stringify(charged), SECRET);
    const res = await post(JSON.stringify(charged, null, 2), { signature });
    expect(res.status).toBe(400);
  });

  it("rejects signatures of the wrong length without throwing (timingSafeEqual length guard)", async () => {
    for (const signature of ["a", "0".repeat(63), "0".repeat(65), "ü".repeat(64)]) {
      const res = await post(charged, { signature });
      expect(res.status).toBe(400);
    }
  });

  it("fails closed with no webhook secret configured", async () => {
    const saved = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    try {
      const res = await post(charged, { signature: signRazorpay(JSON.stringify(charged), "") });
      expect(res.status).toBe(500);
      expect(subRow().plan).toBe("free");
    } finally {
      process.env.RAZORPAY_WEBHOOK_SECRET = saved;
    }
  });

  it("control: a correctly signed charge grants Pro, records the invoice and credits", async () => {
    const res = await post(charged);
    expect(res.status).toBe(200);
    expect(subRow()).toMatchObject({ plan: "pro", status: "active", razorpay_subscription_id: "sub_1" });
    expect(db.rows("invoices")).toHaveLength(1);
    expect(db.rows("template_credits")).toHaveLength(1);
  });
});

describe("replay and ordering", () => {
  it("a replayed charge event never double-records the invoice or double-grants credits", async () => {
    const charged = event("subscription.charged", { payment: PAYMENT });
    for (let i = 0; i < 3; i++) expect((await post(charged)).status).toBe(200);

    expect(db.rows("invoices")).toHaveLength(1);
    expect(db.rows("template_credits")).toHaveLength(1);
    expect(db.rows("template_credits")[0].delta).toBe(3);
  });

  it("an event for a subscription that was replaced by an upgrade can't end the new plan", async () => {
    await post(event("subscription.charged", { subscription: { id: "sub_new" }, payment: PAYMENT }));
    const res = await post(event("subscription.cancelled", { subscription: { id: "sub_old", status: "cancelled" } }));
    expect(res.status).toBe(200);
    expect(subRow()).toMatchObject({ plan: "pro", razorpay_subscription_id: "sub_new" });
  });

  // Razorpay retries failed deliveries for up to 24h and doesn't guarantee
  // order. A redelivered "charged" (whose payload still says status
  // "active") landing after "cancelled" for the *same* subscription id
  // passes shouldApplySubscriptionEvent (currentId === subscription.id)
  // and markUserProFromSubscription writes plan "pro" / status "active"
  // back - re-granting a cancelled customer until current_end.
  it("[H3] a late/redelivered 'charged' after 'cancelled' does not re-grant Pro", async () => {
    const charged = event("subscription.charged", { payment: PAYMENT });
    await post(charged);
    await post(event("subscription.cancelled", { subscription: { status: "cancelled" } }));
    expect(subRow().plan).toBe("free");

    await post(charged); // redelivery of the original, still validly signed
    expect(subRow().plan).toBe("free");
    expect(clerk.users.user_victim.publicMetadata.proAccess).toBe(false);
  });

  // No x-razorpay-event-id dedupe: every redelivery re-sends the customer
  // email (welcome / receipt) even though the invoice upsert is idempotent.
  it.fails("[L7] a replayed charge event sends the customer email once", async () => {
    const charged = event("subscription.charged", { payment: PAYMENT });
    await post(charged);
    await post(charged);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
