import { describe, it, expect, vi, beforeEach } from "vitest";

// Unauthenticated write surfaces and quota controls - the things a bot hits
// first. Not data theft, but sender-reputation damage (branded email sent
// to arbitrary addresses), list pollution, and quota bypass.
// Reports: M4, M6.

const contactsCreate = vi.fn(async () => ({ error: null }));
vi.mock("resend", () => ({
  Resend: class {
    contacts = { create: (...a) => contactsCreate(...a) };
    emails = { send: vi.fn(async () => ({ data: { id: "x" }, error: null })) };
  },
}));
const sendEmail = vi.fn(async () => ({ success: true }));
vi.mock("@/lib/resend", () => ({ sendEmail: (...a) => sendEmail(...a) }));
let humanOk = true;
vi.mock("@/lib/turnstile", () => ({ clientIp: () => null, verifyTurnstile: vi.fn(async () => ({ success: humanOk })) }));
vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));

process.env.RESEND_AUDIENCE_ID = "aud_test";
process.env.RESEND_COMMUNITY_SEGMENT_ID = "seg_community_test";

const { db, makeRequest } = await import("../helpers/route-harness.js");
const { POST: newsletter } = await import("@/app/api/newsletter/route.js");
const { POST: waitlist } = await import("@/app/api/community/waitlist/route.js");
const { POST: customAnimation } = await import("@/app/api/custom-animation-form/route.js");
const { getInstallLimitDecision } = await import("@/lib/install-limit");

beforeEach(() => {
  contactsCreate.mockClear();
  sendEmail.mockClear();
  humanOk = true;
  db.reset({});
});

const post = (handler, body, headers = {}) =>
  handler(makeRequest("/x", { method: "POST", body, headers: { "x-forwarded-for": "203.0.113.7", ...headers } }));

describe("public list sign-ups", () => {
  it("malformed emails are rejected (control)", async () => {
    expect((await post(newsletter, { email: "not-an-email" })).status).toBe(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  // No bot-check token is required or checked: a script can enrol any
  // number of third-party addresses into the Resend audience.
  it.fails("[M4] newsletter requires a bot check before adding a contact", async () => {
    const res = await post(newsletter, { email: "victim@example.test" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  it.fails("[M4] community waitlist requires a bot check before adding a contact", async () => {
    const res = await post(waitlist, { email: "victim@example.test", stack: "nextjs" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(contactsCreate).not.toHaveBeenCalled();
  });

  it.fails("[M4] repeated sign-ups from one client are rate-limited", async () => {
    const statuses = [];
    for (let i = 0; i < 30; i++) statuses.push((await post(newsletter, { email: `v${i}@example.test` })).status);
    expect(statuses).toContain(429);
  });
});

describe("contact forms that email the submitter", () => {
  const valid = (overrides = {}) => ({
    name: "Ada",
    email: "ada@hyperiux-test.dev",
    number: "+91 98765 43210",
    message: "Hello there, I'd like a custom animation.",
    turnstileToken: "tok",
    ...overrides,
  });

  it("a valid submission is accepted and emails team + submitter (control)", async () => {
    const res = await post(customAnimation, valid());
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("a failed Turnstile check sends nothing (control)", async () => {
    humanOk = false;
    const res = await post(customAnimation, valid());
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  // `name` is unbounded and lands in the team subject line and in the
  // confirmation email sent to the *submitter-supplied* address - a ready
  // made branded-spam relay once the bot check is solved (cheaply, at scale).
  it.fails("[M4] the name field is length-bounded before it reaches an email subject", async () => {
    const res = await post(customAnimation, valid({ name: "Win a prize at https://evil.example ".repeat(200) }));
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it.fails("[M4] the same client can't trigger unlimited confirmation emails", async () => {
    const statuses = [];
    for (let i = 0; i < 20; i++) statuses.push((await post(customAnimation, valid({ email: `t${i}@hyperiux-test.dev` }))).status);
    expect(statuses).toContain(429);
  });
});

describe("install quota", () => {
  const anon = (extra = {}) => ({
    effectSlug: "cards-runway",
    effectTier: "free",
    source: "cli",
    deviceId: "device-1",
    ip: "203.0.113.7",
    ...extra,
  });

  // `?dependency=1` is a client-controlled query flag; it skips the quota
  // *and* the ledger entirely. Today enforcement is in shadow mode
  // (INSTALL_LIMIT_ENFORCE unset), so this is latent - it becomes a full
  // quota bypass the day enforcement is switched on.
  it.fails("[M6] a client-set dependency flag can't skip quota accounting for a top-level install", async () => {
    const decision = await getInstallLimitDecision(anon({ isDependency: true }));
    expect(decision.reason).not.toBe("dependency");
  });
});
