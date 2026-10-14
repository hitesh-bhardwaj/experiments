import "server-only";
import Razorpay from "razorpay";

export const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : new Proxy(
        {},
        {
          get() {
            throw new Error("Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET");
          },
        }
      );

// Razorpay answers 429 "Too many requests" in bursts (test mode especially).
// Retries a read a couple of times with a short backoff, so a payment the
// buyer already made isn't lost to a momentary rate limit. Only for idempotent
// calls (fetches) - never wrap a create/cancel in this.
export async function withRazorpayRetry(call, { attempts = 3, delayMs = 600 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      const status = error?.statusCode;
      const retryable = status === 429 || status >= 500;
      if (!retryable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}
