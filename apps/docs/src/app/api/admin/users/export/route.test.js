import { describe, it, expect, vi, beforeEach } from "vitest";

let viewerRole;
let subscriptionRows;
let subscriptionError;
let clerkUsersById;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user_viewer" })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUser: vi.fn(async () => ({
        id: "user_viewer",
        publicMetadata: { role: viewerRole },
        emailAddresses: [],
      })),
      getUserList: vi.fn(async ({ userId, query }) => {
        if (query) return { data: [], totalCount: 0 };
        const data = (userId || []).map((id) => clerkUsersById[id]).filter(Boolean);
        return { data, totalCount: data.length };
      }),
    },
  })),
}));

function makeSubscriptionQuery() {
  const query = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => Promise.resolve({ data: subscriptionRows, error: subscriptionError })),
  };
  return query;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => makeSubscriptionQuery()),
    })),
  },
}));

const { GET } = await import("./route.js");

function makeRequest(params = "") {
  return new Request(`http://localhost/api/admin/users/export${params}`);
}

describe("admin/users/export route", () => {
  beforeEach(() => {
    viewerRole = "super_admin";
    subscriptionRows = [];
    subscriptionError = null;
    clerkUsersById = {};
  });

  it("403s for a signed-in non-admin", async () => {
    viewerRole = null;
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns a CSV with the super-admin column set and correct rows", async () => {
    subscriptionRows = [
      {
        clerk_user_id: "user_a",
        plan: "pro",
        status: "active",
        billing_interval: "yearly",
        current_period_end: "2027-01-01T00:00:00.000Z",
        razorpay_customer_id: "cust_123",
        razorpay_subscription_id: "sub_123",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    clerkUsersById = {
      user_a: {
        id: "user_a",
        fullName: "Ada Lovelace",
        emailAddresses: [{ emailAddress: "ada@example.com" }],
        createdAt: "2026-01-01T00:00:00.000Z",
        publicMetadata: {},
      },
    };

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");

    const csv = await res.text();
    const lines = csv.trim().split("\r\n");

    expect(lines[0]).toBe(
      "Name,Email,Joined At,Plan,Role,Status,Billing Interval,Plan Valid Until,Razorpay Customer ID,Razorpay Subscription ID,Clerk User ID"
    );
    expect(lines[1]).toBe(
      "Ada Lovelace,ada@example.com,2026-01-01T00:00:00.000Z,pro,none,active,yearly,2027-01-01T00:00:00.000Z,cust_123,sub_123,user_a"
    );
  });

  it("returns just the header row when there are no matching users", async () => {
    subscriptionRows = [];
    const res = await GET(makeRequest());
    const csv = await res.text();
    expect(csv.trim().split("\r\n")).toHaveLength(1);
  });

  it("uses the restricted column set for a regular (non-super) admin", async () => {
    viewerRole = "admin";
    subscriptionRows = [
      {
        clerk_user_id: "user_a",
        plan: "free",
        status: "inactive",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    clerkUsersById = {
      user_a: {
        id: "user_a",
        fullName: "Ada Lovelace",
        emailAddresses: [{ emailAddress: "ada@example.com" }],
        createdAt: "2026-01-01T00:00:00.000Z",
        publicMetadata: {},
      },
    };

    const res = await GET(makeRequest());
    const csv = await res.text();
    const lines = csv.trim().split("\r\n");

    expect(lines[0]).toBe("Name,Email,Joined At,Plan,Role");
    expect(lines[1]).toBe("Ada Lovelace,ada@example.com,2026-01-01T00:00:00.000Z,free,none");
  });

  it("500s when the Supabase query errors, without throwing", async () => {
    subscriptionError = new Error("connection reset");
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });
});
