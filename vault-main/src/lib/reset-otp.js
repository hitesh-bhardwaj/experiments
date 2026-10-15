import "server-only";
import crypto from "crypto";

// The in-app password reset code (api/user/send-reset-otp + verify-reset-otp).
// Both routes need a session, so the code is what stops a hijacked session
// (stolen cookie, unlocked laptop) from setting a new password and keeping the
// account (security audit M3).

export const OTP_EXPIRY_MS = 10 * 60 * 1000;
// Wrong guesses before the code is destroyed and a new one has to be requested
export const MAX_ATTEMPTS = 5;
// Between code requests, and how many an hour
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(otp, userId) {
  return crypto
    .createHash("sha256")
    .update(`${otp}:${userId}:${process.env.CLERK_SECRET_KEY}`)
    .digest("hex");
}

// Constant-time, so response timing doesn't leak how close a guess was
export function otpMatches(otp, userId, storedHash) {
  const given = Buffer.from(hashOtp(otp, userId), "hex");
  const stored = Buffer.from(String(storedHash || ""), "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

// Send times from the last hour (kept in privateMetadata.passwordResetSends),
// and how long until another code may be sent - 0 when it may go now.
export function sendWindow(sends, now = Date.now()) {
  const recent = (Array.isArray(sends) ? sends : []).filter((at) => now - at < HOUR_MS);
  const cooldown = recent.length ? RESEND_COOLDOWN_MS - (now - Math.max(...recent)) : 0;
  const capped = recent.length >= MAX_SENDS_PER_HOUR ? HOUR_MS - (now - Math.min(...recent)) : 0;
  return { recent, waitMs: Math.max(0, cooldown, capped) };
}
