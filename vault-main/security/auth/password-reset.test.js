import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-app password reset (api/user/send-reset-otp + verify-reset-otp). Both
// need a Clerk session, so the threat is escalation: someone holding a
// hijacked session (stolen cookie, unlocked laptop) turns it into a
// permanent account takeover by setting a new password without knowing
// the old one. The OTP is the only thing standing in the way. Report: M3.

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/route-harness.js")).clerkModule);
const sentEmails = [];
vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async (email) => {
    sentEmails.push(email);
    return { success: true };
  }),
}));
vi.mock("@/components/WebsiteComps/emailTemplate/PasswordResetOtpEmail", () => ({
  PasswordResetOtpEmail: (props) => ({ props }),
}));

const { clerk, makeUser, makeRequest } = await import("../helpers/route-harness.js");
const { POST: sendOtp } = await import("@/app/api/user/send-reset-otp/route.js");
const { POST: verifyOtp } = await import("@/app/api/user/verify-reset-otp/route.js");

const lastOtp = () => sentEmails.at(-1)?.react?.props?.otp;
const attempt = (otp, newPassword = "N3w-passw0rd!") =>
  verifyOtp(makeRequest("/api/user/verify-reset-otp", { method: "POST", body: { otp, newPassword } }));

beforeEach(() => {
  sentEmails.length = 0;
  clerk.reset({ user_1: makeUser("user_1"), user_2: makeUser("user_2") });
  process.env.CLERK_SECRET_KEY ||= "sk_test_dummy";
});
afterEach(() => vi.restoreAllMocks());

describe("reset OTP basics", () => {
  it("both endpoints require a session", async () => {
    expect((await sendOtp()).status).toBe(401);
    expect((await attempt("123456")).status).toBe(401);
  });

  it("the OTP is stored hashed, never in plaintext metadata", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    const stored = clerk.users.user_1.privateMetadata.passwordResetOtp;
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(clerk.users.user_1)).not.toContain(`"${lastOtp()}"`);
  });

  it("a correct OTP sets the password once and is then consumed", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    const otp = lastOtp();
    expect((await attempt(otp)).status).toBe(200);
    expect((await attempt(otp)).status).toBe(400);
  });

  it("an expired OTP is refused and cleared", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    clerk.users.user_1.privateMetadata.passwordResetOtp.expiresAt = Date.now() - 1;
    expect((await attempt(lastOtp())).status).toBe(400);
    expect(clerk.users.user_1.privateMetadata.passwordResetOtp).toBeNull();
  });

  it("user 2 can't use an OTP issued to user 1", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    const otp = lastOtp();
    clerk.signIn("user_2");
    expect((await attempt(otp)).status).toBe(400);
  });
});

describe("[M3] OTP hardening gaps", () => {
  it.fails("[M3] the OTP is generated with a CSPRNG, not Math.random()", async () => {
    const spy = vi.spyOn(Math, "random");
    clerk.signIn("user_1");
    await sendOtp();
    expect(spy).not.toHaveBeenCalled();
  });

  // No attempt counter: a wrong guess leaves the stored hash in place, so a
  // hijacked session can try all 900k codes within the 10-minute window.
  it.fails("[M3] the OTP is burned after 5 wrong guesses", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    const otp = lastOtp();
    const wrong = otp === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++) await attempt(wrong);
    expect((await attempt(otp)).status).not.toBe(200);
  });

  it.fails("[M3] requesting codes is rate-limited (no unlimited resend)", async () => {
    clerk.signIn("user_1");
    const statuses = [];
    for (let i = 0; i < 10; i++) statuses.push((await sendOtp()).status);
    expect(statuses).toContain(429);
  });

  it.fails("[M3] a successful reset revokes the account's other sessions", async () => {
    clerk.signIn("user_1");
    await sendOtp();
    await attempt(lastOtp());
    // Either explicit session revocation or Clerk's
    // updateUser({ signOutOfOtherSessions: true }) counts.
    const signedOut = clerk.users.user_1.signOutOfOtherSessions === true;
    expect(clerk.revokedSessions.length > 0 || signedOut).toBe(true);
  });
});
