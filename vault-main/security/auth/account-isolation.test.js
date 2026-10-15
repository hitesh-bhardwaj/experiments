import { describe, it, expect, vi, beforeEach } from "vitest";

// Account isolation (OWASP API1:2023 BOLA / IDOR). Signed in as user A, an
// attacker sends user B's identifiers every way a handler might pick them
// up (body, query string, headers). Every Supabase query a user-scoped
// route makes must be scoped to the *session* user, and nothing seeded for
// user B may come back.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/sanity", async (importOriginal) => ({
  ...(await importOriginal()),
  getAllSanityEffectEntries: vi.fn(async () => []),
  buildEffectsFromSanity: vi.fn(() => []),
}));

const { db, clerk, makeUser, makeRequest, readJson, HTTP_METHODS } = await import("../helpers/route-harness.js");

const B = "user_victim";
const MARK = "VICTIM_PRIVATE_MARKER";
const FUTURE = new Date(Date.now() + 30 * 86400_000).toISOString();

const ROUTES = {
  "user/plan": () => import("@/app/api/user/plan/route.js"),
  dashboard: () => import("@/app/api/dashboard/route.js"),
  "dashboard/invoices": () => import("@/app/api/dashboard/invoices/route.js"),
  "dashboard/saved": () => import("@/app/api/dashboard/saved/route.js"),
  "dashboard/template-purchases": () => import("@/app/api/dashboard/template-purchases/route.js"),
  "dashboard/usage": () => import("@/app/api/dashboard/usage/route.js"),
  wishlist: () => import("@/app/api/wishlist/route.js"),
  "wishlist/list": () => import("@/app/api/wishlist/list/route.js"),
  "wishlist-templates": () => import("@/app/api/wishlist-templates/route.js"),
  "copy-usage": () => import("@/app/api/copy-usage/route.js"),
  "templates/credits": () => import("@/app/api/templates/credits/route.js"),
};

// Tables a user-scoped route may read, each with a row belonging to B.
function seedVictimData() {
  const victim = { clerk_user_id: B, email: `${MARK}@victim.test` };
  return {
    subscriptions: [
      { ...victim, plan: "pro", status: "active", tier: "pro_plus", current_period_end: FUTURE, razorpay_subscription_id: `sub_${MARK}`, cli_token_hash: MARK },
      { clerk_user_id: "user_attacker", plan: "free", status: "inactive" },
    ],
    invoices: [{ ...victim, razorpay_payment_id: `pay_${MARK}`, amount: 17900, invoice_url: `https://rzp.io/${MARK}` }],
    template_purchases: [{ ...victim, template_slug: "lumera", razorpay_payment_id: `pay_${MARK}`, invoice_url: MARK }],
    template_credits: [{ ...victim, delta: 5, reason: "grant", razorpay_payment_id: `pay_${MARK}` }],
    wishlisted_effects: [{ ...victim, effect_slug: "cards-runway", title: MARK }],
    wishlisted_templates: [{ ...victim, template_slug: "lumera" }],
    install_unlocks: [{ ...victim, effect_slug: "cards-runway", day: new Date().toISOString().slice(0, 10), note: MARK }],
    install_events: [{ ...victim, effect_slug: "cards-runway", device_id: MARK }],
  };
}

const HOSTILE_QUERY = `?userId=${B}&user_id=${B}&clerk_user_id=${B}&clerkUserId=${B}&id=${B}`;
const HOSTILE_HEADERS = { "x-user-id": B, "x-clerk-user-id": B };
const HOSTILE_BODY = {
  userId: B,
  user_id: B,
  clerk_user_id: B,
  clerkUserId: B,
  effectSlug: "cards-runway",
  slug: "cards-runway",
  templateSlug: "lumera",
  title: "x",
};

describe("user-scoped routes only ever touch the session user's rows", () => {
  beforeEach(() => {
    clerk.reset({ user_attacker: makeUser("user_attacker"), [B]: makeUser(B, { plan: "pro" }) });
    db.reset(seedVictimData());
    clerk.signIn("user_attacker");
  });

  for (const [name, load] of Object.entries(ROUTES)) {
    it(`${name}: every query is scoped to the attacker's own id and no victim data leaks`, async () => {
      const mod = await load();
      const methods = HTTP_METHODS.filter((m) => typeof mod[m] === "function");
      expect(methods.length).toBeGreaterThan(0);

      for (const method of methods) {
        db.calls.length = 0;
        const res = await mod[method](
          makeRequest(`/api/${name}${HOSTILE_QUERY}`, {
            method,
            headers: HOSTILE_HEADERS,
            ...(method === "GET" ? {} : { body: HOSTILE_BODY }),
          }),
          { params: Promise.resolve({}) }
        );
        const text = JSON.stringify(await readJson(res));

        expect(text, `${method} ${name} leaked victim data`).not.toContain(MARK);

        const scopedTo = [
          ...db.filterValues("subscriptions", "clerk_user_id"),
          ...db.filterValues("invoices", "clerk_user_id"),
          ...db.filterValues("template_purchases", "clerk_user_id"),
          ...db.filterValues("template_credits", "clerk_user_id"),
          ...db.filterValues("wishlisted_effects", "clerk_user_id"),
          ...db.filterValues("wishlisted_templates", "clerk_user_id"),
          ...db.filterValues("install_unlocks", "clerk_user_id"),
          ...db.filterValues("install_events", "clerk_user_id"),
        ];
        expect(scopedTo, `${method} ${name} queried another user's rows`).not.toContain(B);

        // Writes must also land on the attacker's own rows only.
        const writes = db.calls.filter((c) => ["insert", "upsert"].includes(c.op));
        for (const write of writes) {
          const rows = Array.isArray(write.payload) ? write.payload : [write.payload];
          for (const row of rows) {
            if ("clerk_user_id" in row) expect(row.clerk_user_id, `${method} ${name} wrote for another user`).toBe("user_attacker");
          }
        }
      }
    });
  }

  it("the victim's rows are unchanged after the whole sweep", async () => {
    const before = JSON.stringify(seedVictimData());
    for (const load of Object.values(ROUTES)) {
      const mod = await load();
      for (const method of HTTP_METHODS.filter((m) => typeof mod[m] === "function")) {
        await mod[method](
          makeRequest(`/x${HOSTILE_QUERY}`, { method, ...(method === "GET" ? {} : { body: HOSTILE_BODY }) }),
          { params: Promise.resolve({}) }
        );
      }
    }
    const victimRowsNow = Object.fromEntries(
      Object.entries(db.store.tables).map(([table, rows]) => [table, rows.filter((r) => r.clerk_user_id === B)])
    );
    const victimRowsBefore = Object.fromEntries(
      Object.entries(JSON.parse(before)).map(([table, rows]) => [table, rows.filter((r) => r.clerk_user_id === B)])
    );
    expect(victimRowsNow).toEqual(victimRowsBefore);
  });

  // Several GETs answer signed-out callers with a harmless default ([] /
  // { plan: "free" } / { signedIn: false }) rather than 401 - and the proxy
  // also guards /api/dashboard and /api/wishlist. The security property is:
  // no victim data out, and no writes at all, without a session.
  it("signed-out callers get no data and cause no writes on any user-scoped route", async () => {
    clerk.signOut();
    for (const [name, load] of Object.entries(ROUTES)) {
      const mod = await load();
      for (const method of HTTP_METHODS.filter((m) => typeof mod[m] === "function")) {
        db.calls.length = 0;
        const res = await mod[method](makeRequest(`/x${HOSTILE_QUERY}`, { method, ...(method === "GET" ? {} : { body: HOSTILE_BODY }) }), {
          params: Promise.resolve({}),
        });
        expect(JSON.stringify(await readJson(res)), `${method} ${name}`).not.toContain(MARK);
        expect(db.calls.filter((c) => c.op !== "select"), `${method} ${name} wrote while signed out`).toEqual([]);
        if (method !== "GET") expect(res.status, `${method} ${name}`).toBe(401);
      }
    }
  });
});
