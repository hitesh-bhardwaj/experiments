// Emails that carry a one-time sign-in or reset code. The code must never be
// readable from the sent_emails log: anyone who can open the admin email log
// could start a sign-in for any address, read the code there and sign in as
// that user (security audit H1). Add new code-bearing email types here.
export const ONE_TIME_CODE_EMAIL_TYPES = new Set([
  "verification_code",
  "reset_password_code",
  "password_reset_otp",
  "magic_link",
]);

export const REDACTED_BODY_NOTE = "Hidden: this email contained a one-time code.";

// Codes are 4-8 digits (Clerk and our reset OTP both send 6)
const CODE_PATTERN = /\d{4,8}/g;

export function isOneTimeCodeEmail(emailType) {
  return ONE_TIME_CODE_EMAIL_TYPES.has(emailType);
}

export function redactOneTimeCodes(text) {
  return typeof text === "string" ? text.replace(CODE_PATTERN, "••••••") : text;
}

/**
 * A sent_emails row safe to show in the admin log. Code-bearing emails keep
 * their subject (with the code masked) but lose their body, since the code
 * can sit anywhere in the HTML. Other rows pass through unchanged.
 */
export function redactEmailLogRow(row) {
  if (!row || !isOneTimeCodeEmail(row.email_type)) return row;

  return {
    ...row,
    subject: redactOneTimeCodes(row.subject),
    ...("html_content" in row ? { html_content: null } : {}),
    ...("text_content" in row ? { text_content: REDACTED_BODY_NOTE } : {}),
  };
}
