import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// Admin surface. /api/admin/* is not in proxy.js's protected matcher, so
// every handler has to authorize itself - this sweeps every exported method
// of every admin route file (discovered from disk, so new routes are
// covered automatically) as anonymous / Free / regular-admin callers.
// Reports: H1, L1, M9.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/razorpay", () => ({
  razorpay: { subscriptions: { fetch: vi.fn(), cancel: vi.fn() } },
  withRazorpayRetry: (call) => call(),
}));

const { db, clerk, makeUser, makeRequest, readJson, walk, VAULT_ROOT, HTTP_METHODS } = await import(
  "../helpers/route-harness.js"
);
const { getRole } = await import("@/lib/admin");

const ADMIN_DIR = path.join(VAULT_ROOT, "src/app/api/admin");
const ROUTE_FILES = walk(ADMIN_DIR, { include: (f) => /[\\/]route\.js$/.test(f) });
const MARK = "ADMIN_ONLY_MARKER";
const OTP = "482913";

// Routes a regular admin must not reach (billing, revenue, role/plan changes).
const SUPER_ADMIN_ONLY = [
  "invoices",
  "template-purchases",
  "users/update-plan",
  "users/update-role",
];

const routeName = (file) => path.relative(ADMIN_DIR, path.dirname(file)).split(path.sep).join("/");
const paramsFor = (name) => (name.includes("[userSlug]") ? { userSlug: "victim" } : {});

function seed() {
  clerk.reset({
    user_free: makeUser("user_free"),
    user_admin: makeUser("user_admin", { role: "admin" }),
    user_super: makeUser("user_super", { role: "super_admin" }),
    victim: makeUser("victim", { email: `victim@${MARK.toLowerCase()}.test` }),
  });
  db.reset({
    subscriptions: [
      { clerk_user_id: "victim", plan: "pro", status: "active", cli_token_hash: `hash_${MARK}`, razorpay_subscription_id: `sub_${MARK}` },
      { clerk_user_id: "user_free", plan: "free", status: "inactive" },
    ],
    invoices: [{ clerk_user_id: "victim", razorpay_payment_id: `pay_${MARK}`, amount: 17900, currency: "USD", is_test: false }],
    template_purchases: [{ clerk_user_id: "victim", template_slug: "lumera", amount: 39, razorpay_payment_id: `pay_${MARK}` }],
    sent_emails: [
      {
        id: "em_1",
        recipient_email: "victim@example.test",
        subject: `${OTP} is your verification code`,
        email_type: "verification_code",
        html_content: `<p>Your code is <b>${OTP}</b></p>`,
        status: "delivered",
        sent_at: new Date().toISOString(),
      },
      {
        id: "em_2",
        recipient_email: "victim@example.test",
        subject: "Your password reset code - Hyperiux Vault",
        email_type: "password_reset_otp",
        html_content: `<p>Reset code: ${OTP}</p>`,
        status: "delivered",
        sent_at: new Date().toISOString(),
      },
    ],
  });
}

async function call(file, method, { body } = {}) {
  const mod = await import(/* @vite-ignore */ file);
  const name = routeName(file);
  return mod[method](
    makeRequest(`/api/admin/${name}?id=em_1&userId=victim`, {
      method,
      ...(method === "GET" ? {} : { body: body ?? { userId: "victim", clerkUserId: "victim", role: "super_admin", plan: "pro", email: "x@example.test" } }),
    }),
    { params: Promise.resolve(paramsFor(name)) }
  );
}

async function methodsOf(file) {
  const mod = await import(/* @vite-ignore */ file);
  return HTTP_METHODS.filter((m) => typeof mod[m] === "function");
}

describe("admin routes refuse non-admins", () => {
  beforeEach(seed);

  it("found the admin routes on disk", () => {
    expect(ROUTE_FILES.length).toBeGreaterThanOrEqual(14);
  });

  for (const file of ROUTE_FILES) {
    const name = routeName(file);
    if (name === "me") continue; // returns the caller's own role; covered below

    it(`${name}: anonymous and Free callers are refused with no data and no writes`, async () => {
      for (const who of [null, "user_free"]) {
        who ? clerk.signIn(who) : clerk.signOut();
        for (const method of await methodsOf(file)) {
          db.calls.length = 0;
          const res = await call(file, method);
          expect([401, 403], `${who ?? "anon"} ${method} ${name} -> ${res.status}`).toContain(res.status);
          expect(JSON.stringify(await readJson(res))).not.toContain(MARK);
          expect(db.calls.filter((c) => c.op !== "select"), `${method} ${name} wrote`).toEqual([]);
        }
      }
      expect(clerk.users.user_free.publicMetadata.role).toBeUndefined();
      expect(clerk.users.victim.publicMetadata.role).toBeUndefined();
    });
  }

  it("/api/admin/me only ever describes the caller", async () => {
    const file = ROUTE_FILES.find((f) => routeName(f) === "me");
    clerk.signIn("user_free");
    const body = JSON.stringify(await readJson(await call(file, "GET")));
    expect(body).not.toMatch(/super_admin|"admin"/);
    expect(body).not.toContain(MARK);
  });
});

describe("regular admins can't reach super-admin powers", () => {
  beforeEach(seed);

  for (const name of SUPER_ADMIN_ONLY) {
    it(`${name}: regular admin is refused`, async () => {
      const file = ROUTE_FILES.find((f) => routeName(f) === name);
      expect(file, `${name} route missing`).toBeTruthy();
      clerk.signIn("user_admin");
      for (const method of await methodsOf(file)) {
        db.calls.length = 0;
        const res = await call(file, method);
        expect(res.status, `${method} ${name}`).toBe(403);
        expect(JSON.stringify(await readJson(res))).not.toContain(MARK);
        expect(db.calls.filter((c) => c.op !== "select")).toEqual([]);
      }
    });
  }

  it("a regular admin can't promote themselves or anyone else", async () => {
    const file = ROUTE_FILES.find((f) => routeName(f) === "users/update-role");
    clerk.signIn("user_admin");
    for (const body of [
      { userId: "user_admin", role: "super_admin" },
      { clerkUserId: "user_admin", role: "super_admin" },
      { userId: "user_free", role: "admin" },
    ]) {
      await call(file, "POST", { body });
    }
    expect(clerk.users.user_admin.publicMetadata.role).toBe("admin");
    expect(clerk.users.user_free.publicMetadata.role).toBeUndefined();
  });

  it("users/export hides billing columns from a regular admin", async () => {
    const file = ROUTE_FILES.find((f) => routeName(f) === "users/export");
    clerk.signIn("user_admin");
    const res = await call(file, "GET");
    expect(JSON.stringify(await readJson(res))).not.toContain(`sub_${MARK}`);
  });
});

describe("role resolution", () => {
  it("only publicMetadata (server-writable) grants a role - never unsafeMetadata", () => {
    const user = makeUser("u");
    user.unsafeMetadata = { role: "super_admin" };
    expect(getRole(user)).toBeNull();
  });

  // getRole matches ADMIN_EMAIL against emailAddresses[0] with no check
  // that it's the primary, verified address. Clerk lets users add extra
  // (unverified) addresses; whichever ends up first in the array decides.
  it.fails("[M9] ADMIN_EMAIL only grants super_admin on the verified primary address", () => {
    process.env.ADMIN_EMAIL = "owner@hyperiux.test";
    try {
      const attacker = makeUser("attacker", { email: "attacker@example.test" });
      attacker.emailAddresses.unshift({ id: "email_extra", emailAddress: "owner@hyperiux.test", verification: { status: "unverified" } });
      expect(getRole(attacker)).toBeNull();
    } finally {
      delete process.env.ADMIN_EMAIL;
    }
  });
});

describe("admin data exposure", () => {
  beforeEach(seed);
  const file = () => ROUTE_FILES.find((f) => routeName(f) === "emails");

  // sent_emails logs every Clerk sign-in / sign-up / reset code (code in
  // the subject) and the in-app reset OTP (in html_content). Any regular
  // admin can read them and sign in as any user - including super admins.
  it("[H1] a regular admin can't read one-time codes from the email log (list view)", async () => {
    clerk.signIn("user_admin");
    const res = await call(file(), "GET");
    expect(res.status).toBe(200);
    const listOnly = await readJson(res);
    delete listOnly.html_content;
    expect(JSON.stringify(listOnly)).not.toContain(OTP);
  });

  it("[H1] a regular admin can't read one-time codes from the email log (?id= preview)", async () => {
    clerk.signIn("user_admin");
    const mod = await import(/* @vite-ignore */ file());
    for (const id of ["em_1", "em_2"]) {
      const res = await mod.GET(makeRequest(`/api/admin/emails?id=${id}`), { params: Promise.resolve({}) });
      expect(JSON.stringify(await readJson(res)), id).not.toContain(OTP);
    }
  });

  it.fails("[L1] the per-user activity view doesn't return the CLI token hash", async () => {
    clerk.signIn("user_admin");
    const activity = ROUTE_FILES.find((f) => routeName(f) === "activity/[userSlug]");
    const res = await call(activity, "GET");
    expect(res.status).toBe(200);
    expect(JSON.stringify(await readJson(res))).not.toContain(`hash_${MARK}`);
  });
});
