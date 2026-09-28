import { describe, it, expect, vi, beforeEach } from "vitest";

// The aggregation logic itself (countBy, topSlugCounts, topUserCounts) was
// verified against real seeded Supabase data during development - this test
// covers the route's auth gate, date-range wiring, and response shape,
// which a real-data check doesn't exercise on its own.
//
// The route reads two tables: install_unlocks (totals, trend, source
// breakdown, both leaderboards - the guaranteed-complete ledger) and
// install_events (allowed/already-unlocked/denied counts, enforced,
// plan breakdown - the only place a denied attempt or a plan is recorded).

let isAdminResult;
let unlockRows;
let unlocksError;
let eventRows;
let eventsError;
let installsTodayCount;
let installsTodayError;
let clerkUsers;

vi.mock("@/lib/admin", () => ({
  assertAdmin: vi.fn(() => Promise.resolve(isAdminResult)),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(async () => ({
    users: { getUserList: vi.fn(async () => ({ data: clerkUsers })) },
  })),
}));

vi.mock("@/lib/registry", () => ({
  getEffectMetadata: vi.fn((slug) => ({ title: `Title for ${slug}` })),
}));

vi.mock("@/lib/sanity", () => ({
  getAllSanityEffectEntries: vi.fn(() => Promise.resolve([])),
  buildEffectsFromSanity: vi.fn(() => []),
}));

// Every list query (install_unlocks' main select, install_events' select)
// shares the same chainable-and-thenable shape, so it resolves correctly no
// matter which methods get called or in what order.
function makeListQuery(getResult) {
  const query = {
    order: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    then: (resolve) => resolve(getResult()),
  };
  return query;
}

function makeTodayCountQuery() {
  const query = {
    eq: vi.fn(() => query),
    then: (resolve) => resolve({ count: installsTodayCount, error: installsTodayError }),
  };
  return query;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn((columns, opts) => {
        if (opts && opts.count === "exact" && opts.head === true) {
          return makeTodayCountQuery();
        }
        if (table === "install_unlocks") {
          return makeListQuery(() => ({ data: unlockRows, error: unlocksError }));
        }
        return makeListQuery(() => ({ data: eventRows, error: eventsError }));
      }),
    })),
  },
}));

const { GET } = await import("./route.js");

function makeRequest(params = "") {
  return new Request(`http://localhost/api/admin/installs${params}`);
}

function makeEvent(overrides = {}) {
  return {
    occurred_at: new Date().toISOString(),
    identity_key: "user:test",
    clerk_user_id: "test",
    device_id: null,
    ip_hash: null,
    effect_slug: "dotted-grid",
    effect_tier: "free",
    source: "web",
    plan: "free",
    decision: "allowed",
    reason: "allowed",
    enforced: false,
    would_have_denied: false,
    ...overrides,
  };
}

function makeUnlock(overrides = {}) {
  return {
    usage_date: new Date().toISOString().slice(0, 10),
    identity_key: "user:test",
    clerk_user_id: "test",
    effect_slug: "dotted-grid",
    source: "web",
    ...overrides,
  };
}

describe("admin/installs route", () => {
  beforeEach(() => {
    isAdminResult = false;
    unlockRows = [];
    unlocksError = null;
    eventRows = [];
    eventsError = null;
    installsTodayCount = 0;
    installsTodayError = null;
    clerkUsers = [];
  });

  it("403s for a non-admin", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("500s when a query errors, without throwing", async () => {
    isAdminResult = true;
    unlocksError = new Error("connection reset");

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it("returns zeroed stats with no rows, not an error", async () => {
    isAdminResult = true;

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stats.totalInstalls).toBe(0);
    expect(body.stats.installsToday).toBe(0);
  });

  // totalInstalls (like Copies everywhere else it's shown) reads
  // install_unlocks - the guaranteed-complete ledger - not install_events,
  // which can silently lose a row (see lib/install-limit.js's retry).
  it("counts totalInstalls from install_unlocks, independent of install_events", async () => {
    isAdminResult = true;
    unlockRows = [makeUnlock({ effect_slug: "a" }), makeUnlock({ effect_slug: "b" })];
    // Deliberately fewer event rows than unlock rows - simulates the
    // install_events write-gap this split was built to be immune to.
    eventRows = [makeEvent({ effect_slug: "a" })];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.totalInstalls).toBe(2);
  });

  it("computes allowed/already-unlocked/denied counts from install_events", async () => {
    isAdminResult = true;
    eventRows = [
      makeEvent({ decision: "allowed" }),
      makeEvent({ decision: "already-unlocked" }),
      makeEvent({
        identity_key: "device:ci-runner",
        device_id: "ci-runner",
        source: "cli",
        plan: "anonymous",
        decision: "denied",
        would_have_denied: true,
        effect_slug: "a",
      }),
      makeEvent({
        identity_key: "device:ci-runner",
        device_id: "ci-runner",
        source: "cli",
        plan: "anonymous",
        decision: "denied",
        would_have_denied: true,
        effect_slug: "b",
      }),
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.allowedCount).toBe(1);
    expect(body.stats.alreadyUnlockedCount).toBe(1);
    expect(body.stats.deniedCount).toBe(2);
  });

  it("ranks users by successful copies (install_unlocks, source=web), resolving name (or falling back to email), and excludes anonymous rows", async () => {
    isAdminResult = true;
    unlockRows = [
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "x" }),
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "y" }),
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "z", source: "cli" }), // not web, excluded from topUsers
      makeUnlock({ clerk_user_id: "user_b", effect_slug: "x" }),
      // Anonymous - no clerk_user_id, must never appear in topUsers.
      makeUnlock({ clerk_user_id: null, identity_key: "device:anon", effect_slug: "x" }),
    ];
    clerkUsers = [
      { id: "user_a", fullName: "Ada Lovelace", emailAddresses: [{ emailAddress: "ada@example.com" }], imageUrl: "https://img/a" },
      // user_b has no name set on their Clerk profile - email is the fallback.
      { id: "user_b", fullName: null, firstName: null, emailAddresses: [{ emailAddress: "bea@example.com" }], imageUrl: null },
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.topUsers).toEqual([
      { clerkUserId: "user_a", name: "Ada Lovelace", email: "ada@example.com", imageUrl: "https://img/a", count: 2 },
      { clerkUserId: "user_b", name: null, email: "bea@example.com", imageUrl: null, count: 1 },
    ]);
  });

  it("ranks topInstallers across all sources, unlike topUsers", async () => {
    isAdminResult = true;
    unlockRows = [
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "x", source: "web" }),
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "y", source: "cli" }),
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "z", source: "mcp" }),
    ];
    clerkUsers = [
      { id: "user_a", fullName: "Ada Lovelace", emailAddresses: [{ emailAddress: "ada@example.com" }], imageUrl: "https://img/a" },
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.topInstallers).toEqual([
      { clerkUserId: "user_a", name: "Ada Lovelace", email: "ada@example.com", imageUrl: "https://img/a", count: 3 },
    ]);
    // Only the one web-source row counts toward "copies".
    expect(body.topUsers).toEqual([
      { clerkUserId: "user_a", name: "Ada Lovelace", email: "ada@example.com", imageUrl: "https://img/a", count: 1 },
    ]);
  });

  it("drops a user from the leaderboard entirely once their Clerk account is deleted", async () => {
    isAdminResult = true;
    unlockRows = [
      makeUnlock({ clerk_user_id: "user_a", effect_slug: "x" }),
      // user_deleted has real historical unlocks, but no Clerk account left
      // to open a profile for - the leaderboard has nothing to link to.
      makeUnlock({ clerk_user_id: "user_deleted", effect_slug: "y" }),
    ];
    clerkUsers = [
      { id: "user_a", fullName: "Ada Lovelace", emailAddresses: [{ emailAddress: "ada@example.com" }], imageUrl: "https://img/a" },
    ];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.topUsers).toEqual([
      { clerkUserId: "user_a", name: "Ada Lovelace", email: "ada@example.com", imageUrl: "https://img/a", count: 1 },
    ]);
  });

  it("reports enforced: true if any event in the window was enforced", async () => {
    isAdminResult = true;
    eventRows = [makeEvent({ enforced: false }), makeEvent({ enforced: true })];

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.enforced).toBe(true);
  });

  it("reports the always-today count (install_unlocks) independently of the selected range", async () => {
    isAdminResult = true;
    installsTodayCount = 7;

    const res = await GET(makeRequest("?range=90d"));
    const body = await res.json();

    expect(body.stats.installsToday).toBe(7);
  });
});
