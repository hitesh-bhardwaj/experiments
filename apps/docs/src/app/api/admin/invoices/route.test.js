import { describe, it, expect, vi, beforeEach } from "vitest";

let isSuperAdminResult;
let pageRows;
let pageCount;
let pageError;
let realRows;
let statsError;
let clerkUsers;
let eqCalls;

vi.mock("@/lib/admin", () => ({
  assertSuperAdmin: vi.fn(() => Promise.resolve(isSuperAdminResult)),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { getUserList: vi.fn(async () => ({ data: clerkUsers })) },
  })),
}));

// Two .from("invoices") queries run per request (the paginated page query,
// and the always-real-only stats query) sharing this same builder shape -
// record every .eq() call rather than the last one, since Promise.all runs
// them concurrently and only the page query's filter is meant to vary.
function makePageQuery() {
  const query = {
    eq: vi.fn((...args) => {
      eqCalls.push(args);
      return query;
    }),
    order: vi.fn(() => query),
    range: vi.fn(() => Promise.resolve({ data: pageRows, error: pageError, count: pageCount })),
    then: (resolve) => resolve({ data: realRows, error: statsError }),
  };
  return query;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => makePageQuery()),
    })),
  },
}));

const { GET } = await import("./route.js");

function makeRequest(params = "") {
  return new Request(`http://localhost/api/admin/invoices${params}`);
}

function makeInvoiceRow(overrides = {}) {
  return {
    id: 1,
    clerk_user_id: "user_a",
    razorpay_payment_id: "pay_123",
    amount: 199900,
    currency: "INR",
    status: "paid",
    billing_interval: "yearly",
    plan_label: "Vault Pro",
    invoice_url: "https://razorpay.example/receipt",
    is_test: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("admin/invoices route", () => {
  beforeEach(() => {
    isSuperAdminResult = false;
    pageRows = [];
    pageCount = 0;
    pageError = null;
    realRows = [];
    statsError = null;
    clerkUsers = [];
    eqCalls = [];
  });

  it("403s for a non-super-admin (regular admin included)", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("500s when the query errors, without throwing", async () => {
    isSuperAdminResult = true;
    pageError = new Error("connection reset");

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("resolves each invoice's user via Clerk and shapes the response", async () => {
    isSuperAdminResult = true;
    pageRows = [makeInvoiceRow()];
    pageCount = 1;
    realRows = [{ amount: 199900 }];
    clerkUsers = [
      { id: "user_a", fullName: "Ada Lovelace", emailAddresses: [{ emailAddress: "ada@example.com" }], imageUrl: "https://img/a" },
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.invoices).toHaveLength(1);
    expect(body.invoices[0]).toMatchObject({
      userId: "user_a",
      userName: "Ada Lovelace",
      userEmail: "ada@example.com",
      amount: 199900,
      isTest: false,
      paymentId: "pay_123",
    });
  });

  it("falls back to email when Clerk has no name on file, and to nothing when the user can't be resolved at all", async () => {
    isSuperAdminResult = true;
    pageRows = [
      makeInvoiceRow({ id: 1, clerk_user_id: "user_b" }),
      makeInvoiceRow({ id: 2, clerk_user_id: "user_deleted" }),
    ];
    pageCount = 2;
    clerkUsers = [
      { id: "user_b", fullName: null, firstName: null, emailAddresses: [{ emailAddress: "bea@example.com" }], imageUrl: null },
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    const userB = body.invoices.find((inv) => inv.userId === "user_b");
    const deletedUser = body.invoices.find((inv) => inv.userId === "user_deleted");

    expect(userB).toMatchObject({ userName: null, userEmail: "bea@example.com" });
    expect(deletedUser).toMatchObject({ userName: null, userEmail: null });
  });

  it("stats reflect only real (non-test) invoices, grouped by currency, regardless of the page", async () => {
    isSuperAdminResult = true;
    pageRows = [makeInvoiceRow({ is_test: true })];
    pageCount = 1;
    realRows = [{ amount: 199900, currency: "INR" }, { amount: 1799000, currency: "INR" }];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats).toEqual({
      totalInvoices: 2,
      revenueByCurrency: [{ currency: "INR", amount: 1998900 }],
    });
  });

  it("always filters both the page and stats queries to real invoices via .eq(is_test, false), regardless of query params", async () => {
    isSuperAdminResult = true;

    // There's no test/real toggle - every real invoice is what this table is
    // meant to show, so both the page query and the always-real-only stats
    // query filter is_test=false unconditionally, even with a stray/legacy
    // `test` param on the request.
    await GET(makeRequest("?test=real"));
    expect(eqCalls).toEqual([["is_test", false], ["is_test", false]]);

    eqCalls = [];
    await GET(makeRequest("?test=test"));
    expect(eqCalls).toEqual([["is_test", false], ["is_test", false]]);
  });
});
