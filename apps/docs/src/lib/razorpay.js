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
