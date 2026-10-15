// Shared harness for the security suite. Route handlers are imported and
// called directly (same as src/app/api/cli/token/route.test.js and
// src/app/api/effect-delivery-contract.test.js), with Clerk and Supabase
// swapped for the in-memory fakes below so each test can seed exactly the
// account state an attacker would be working against.
//
// Wire them up per test file (vi.mock is hoisted, so it has to live there):
//
//   vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
//   vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { vi } from "vitest";

export const VAULT_ROOT = path.resolve(import.meta.dirname, "../..");
export const REPO_ROOT = path.resolve(VAULT_ROOT, "..");

// ---------------------------------------------------------------------------
// Supabase: minimal in-memory query builder covering the chain shapes the
// routes actually use (select/eq/in/order/range/maybeSingle, update/upsert/
// insert/delete). Every call is recorded so tests can assert on *what was
// asked for* (e.g. which clerk_user_id a query was scoped to), not just
// what came back.
// ---------------------------------------------------------------------------

function createQuery(store, table, calls) {
  const state = { table, op: "select", columns: "*", filters: [], payload: null, options: null, single: null };
  calls.push(state);

  const rows = () => (store.tables[table] ||= []);
  const matches = (row) =>
    state.filters.every(([kind, col, val]) => {
      if (kind === "eq") return row[col] === val;
      if (kind === "neq") return row[col] !== val;
      if (kind === "in") return val.includes(row[col]);
      if (kind === "is") return (row[col] ?? null) === val;
      return true;
    });

  function project(row) {
    if (!row || state.columns === "*" || !state.columns) return row ? { ...row } : row;
    const out = {};
    for (const col of state.columns.split(",").map((c) => c.trim()).filter(Boolean)) {
      out[col] = row[col] ?? null;
    }
    return out;
  }

  function execute() {
    if (store.nextError) {
      const error = store.nextError;
      store.nextError = null;
      return { data: null, error, count: null };
    }

    if (state.op === "insert" || state.op === "upsert") {
      const incoming = Array.isArray(state.payload) ? state.payload : [state.payload];
      const conflictCols = (state.options?.onConflict || "").split(",").map((c) => c.trim()).filter(Boolean);
      for (const record of incoming) {
        const existing = conflictCols.length
          ? rows().find((row) => conflictCols.every((col) => row[col] === record[col]))
          : null;
        if (existing) {
          if (state.op === "upsert" && !state.options?.ignoreDuplicates) Object.assign(existing, record);
        } else {
          rows().push({ ...record });
        }
      }
      return { data: incoming, error: null, count: incoming.length };
    }

    if (state.op === "update") {
      const hit = rows().filter(matches);
      for (const row of hit) Object.assign(row, state.payload);
      return { data: hit.map(project), error: null, count: hit.length };
    }

    if (state.op === "delete") {
      const keep = rows().filter((row) => !matches(row));
      const removed = rows().length - keep.length;
      store.tables[table] = keep;
      return { data: null, error: null, count: removed };
    }

    const hit = rows().filter(matches).map(project);
    if (state.single) {
      if (state.single === "single" && hit.length !== 1) {
        return { data: null, error: { message: "expected one row" }, count: hit.length };
      }
      return { data: hit[0] ?? null, error: null, count: hit.length };
    }
    return { data: hit, error: null, count: hit.length };
  }

  const builder = {
    select(columns = "*", options) {
      if (state.op === "select") state.columns = columns;
      state.options = { ...state.options, ...options };
      return builder;
    },
    insert(payload, options) {
      Object.assign(state, { op: "insert", payload, options });
      return builder;
    },
    upsert(payload, options) {
      Object.assign(state, { op: "upsert", payload, options });
      return builder;
    },
    update(payload) {
      Object.assign(state, { op: "update", payload });
      return builder;
    },
    delete() {
      state.op = "delete";
      return builder;
    },
    eq(col, val) {
      state.filters.push(["eq", col, val]);
      return builder;
    },
    neq(col, val) {
      state.filters.push(["neq", col, val]);
      return builder;
    },
    in(col, val) {
      state.filters.push(["in", col, val]);
      return builder;
    },
    is(col, val) {
      state.filters.push(["is", col, val]);
      return builder;
    },
    // Filters/modifiers the fake doesn't need to honour for these tests.
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    ilike: () => builder,
    or: () => builder,
    not: () => builder,
    order: () => builder,
    range: () => builder,
    limit: () => builder,
    maybeSingle() {
      state.single = "maybe";
      return builder;
    },
    single() {
      state.single = "single";
      return builder;
    },
    then(resolve, reject) {
      try {
        return Promise.resolve(execute()).then(resolve, reject);
      } catch (error) {
        return Promise.reject(error).then(resolve, reject);
      }
    },
  };

  return builder;
}

export const db = {
  store: { tables: {}, nextError: null },
  calls: [],
  rpcCalls: [],
  rpcResults: {},
  reset(seed = {}) {
    this.store.tables = structuredClone(seed);
    this.store.nextError = null;
    this.calls.length = 0;
    this.rpcCalls.length = 0;
    this.rpcResults = {};
  },
  rows(table) {
    return this.store.tables[table] || [];
  },
  failNext(error = { message: "simulated supabase failure" }) {
    this.store.nextError = error;
  },
  from(table) {
    return createQuery(db.store, table, db.calls);
  },
  async rpc(name, args) {
    db.rpcCalls.push({ name, args });
    const result = db.rpcResults[name];
    return typeof result === "function" ? result(args) : result ?? { data: null, error: null };
  },
  // Every filter value a query on `table` was scoped by, for `column`.
  filterValues(table, column) {
    return this.calls
      .filter((call) => call.table === table)
      .flatMap((call) => call.filters.filter(([, col]) => col === column).map(([, , val]) => val));
  },
};

// ---------------------------------------------------------------------------
// Clerk: auth() reads the "signed-in" user; clerkClient().users reads/writes
// the fake user directory. Tests set the session with signIn()/signOut().
// ---------------------------------------------------------------------------

export const clerk = {
  sessionUserId: null,
  users: {},
  invitations: [],
  revokedSessions: [],
  reset(users = {}) {
    this.sessionUserId = null;
    this.users = structuredClone(users);
    this.invitations = [];
    this.revokedSessions = [];
  },
  signIn(userId) {
    this.sessionUserId = userId;
  },
  signOut() {
    this.sessionUserId = null;
  },
};

export function makeUser(id, { email = `${id}@example.test`, role, plan, privateMetadata = {} } = {}) {
  return {
    id,
    firstName: id,
    fullName: id,
    primaryEmailAddressId: `email_${id}`,
    emailAddresses: [{ id: `email_${id}`, emailAddress: email, verification: { status: "verified" } }],
    publicMetadata: { ...(role ? { role } : {}), ...(plan ? { plan } : {}) },
    privateMetadata,
    unsafeMetadata: {},
  };
}

const clerkUsersApi = {
  getUser: vi.fn(async (userId) => {
    const user = clerk.users[userId];
    if (!user) throw Object.assign(new Error("not found"), { status: 404 });
    return structuredClone(user);
  }),
  updateUser: vi.fn(async (userId, patch) => {
    const user = clerk.users[userId];
    if (!user) throw Object.assign(new Error("not found"), { status: 404 });
    const { password, ...rest } = patch;
    Object.assign(user, rest);
    if (password) user.__password = password;
    return structuredClone(user);
  }),
  updateUserMetadata: vi.fn(async (userId, patch) => {
    const user = clerk.users[userId];
    Object.assign(user.publicMetadata, patch.publicMetadata || {});
    Object.assign(user.privateMetadata, patch.privateMetadata || {});
    return structuredClone(user);
  }),
  getUserList: vi.fn(async () => ({ data: Object.values(clerk.users).map((u) => structuredClone(u)), totalCount: Object.keys(clerk.users).length })),
  verifyPassword: vi.fn(async () => ({ verified: false })),
};

export const clerkModule = {
  auth: vi.fn(async () => ({ userId: clerk.sessionUserId, sessionId: clerk.sessionUserId ? `sess_${clerk.sessionUserId}` : null })),
  currentUser: vi.fn(async () => (clerk.sessionUserId ? structuredClone(clerk.users[clerk.sessionUserId]) : null)),
  clerkClient: vi.fn(async () => ({
    users: clerkUsersApi,
    sessions: {
      getSessionList: vi.fn(async ({ userId } = {}) => ({ data: userId ? [{ id: `sess_${userId}_other`, userId }] : [] })),
      revokeSession: vi.fn(async (sessionId) => {
        clerk.revokedSessions.push(sessionId);
        return {};
      }),
    },
    invitations: {
      getInvitationList: vi.fn(async () => ({ data: [] })),
      createInvitation: vi.fn(async (invite) => {
        clerk.invitations.push(invite);
        return { id: `inv_${clerk.invitations.length}` };
      }),
    },
  })),
  clerkMiddleware: (handler) => handler,
  createRouteMatcher: (patterns) => (request) => {
    const pathname = new URL(request.url ?? request.nextUrl).pathname;
    return patterns.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));
  },
};

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export function makeRequest(url = "http://localhost/x", { method = "GET", headers = {}, body } = {}) {
  const init = { method, headers: { ...headers } };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    if (!Object.keys(init.headers).some((h) => h.toLowerCase() === "content-type")) {
      init.headers["content-type"] = "application/json";
    }
  }
  return new Request(new URL(url, "http://localhost"), init);
}

export function routeParams(params) {
  return { params: Promise.resolve(params) };
}

export function signRazorpay(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Filesystem scanning helpers for the static checks.
// ---------------------------------------------------------------------------

export function walk(dir, { include = () => true, skip = ["node_modules", ".next", ".git"] } = {}) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, { include, skip }));
    else if (include(full)) out.push(full);
  }
  return out;
}

// Each exported HTTP method of a route module.
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Pro-effect slug fixtures, read from the real registry so the suite keeps
// pace as effects are added (fails loudly if the registry layout moves).
export function getProEffectSlugs() {
  const indexPath = path.join(VAULT_ROOT, "public/r/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  return (index.items || []).filter((item) => item.tier === "pro").map((item) => item.name);
}
