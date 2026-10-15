import { beforeEach, describe, expect, it, vi } from "vitest";

// The sent_emails log must never hold a usable one-time code: any admin can
// read it (/dashboard/admin/emails), so a stored code is an account takeover.
// The admin route's read-side masking is covered in admin-idor.test.js.
// Reports: H1.

vi.mock("@/lib/supabase", async () => ({ supabase: (await import("../helpers/route-harness.js")).db }));
const send = vi.fn(async () => ({ error: null }));
vi.mock("resend", () => ({ Resend: class { emails = { send: (...args) => send(...args) }; } }));

process.env.RESEND_API_KEY = "re_test_key";

const { db } = await import("../helpers/route-harness.js");
const { sendEmail } = await import("@/lib/resend");

const OTP = "482913";
const loggedRow = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0)); // the log insert isn't awaited
  return db.rows("sent_emails")[0];
};

beforeEach(() => {
  send.mockClear();
  db.reset({ sent_emails: [] });
});

describe("sent_emails log", () => {
  for (const emailType of ["verification_code", "reset_password_code", "password_reset_otp"]) {
    it(`[H1] delivers a ${emailType} email with its code but logs it without one`, async () => {
      await sendEmail({
        to: "victim@example.test",
        subject: `${OTP} is your code`,
        html: `<p>Your code is <b>${OTP}</b></p>`,
        text: `Your code is ${OTP}`,
        emailType,
      });

      expect(send.mock.calls[0][0].subject).toContain(OTP);
      const row = await loggedRow();
      expect(row.email_type).toBe(emailType);
      expect(JSON.stringify(row)).not.toContain(OTP);
    });
  }

  it("still logs ordinary emails in full", async () => {
    await sendEmail({
      to: "user@example.test",
      subject: "Welcome to Vault 2026",
      html: "<p>Order 123456 confirmed</p>",
      emailType: "welcome",
    });

    const row = await loggedRow();
    expect(row.subject).toBe("Welcome to Vault 2026");
    expect(row.html_content).toBe("<p>Order 123456 confirmed</p>");
  });
});
