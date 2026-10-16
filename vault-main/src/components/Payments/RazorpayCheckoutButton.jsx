"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useUser } from "@clerk/nextjs";

// Razorpay Standard Checkout button. Two modes:
//   <RazorpayCheckoutButton amount={1} />                        one-time order (testing)
//   <RazorpayCheckoutButton amount={29} templateSlug="elenavoss" />  one-time template purchase
//   <RazorpayCheckoutButton tier="pro_plus" interval="yearly" currency="INR" />  subscription
export default function RazorpayCheckoutButton({
  amount,
  tier,
  interval,
  templateSlug,
  currency = "USD",
  className = "",
  onSuccess,
  onError,
  children = "Pay with Razorpay",
  autoOpen = false,
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState(null);
  const autoOpenedRef = useRef(false);

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      const isSubscription = Boolean(tier);
      const endpoint = isSubscription
        ? "/api/razorpay/create-subscription"
        : "/api/razorpay/create-order";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSubscription
            ? { tier, interval, currency, idempotencyKey: crypto.randomUUID() }
            : { amount, currency, templateSlug }
        ),
      });
      const data = await res.json();

      if (!res.ok) {
        const checkoutError = new Error(data.error || "Could not start checkout");
        checkoutError.reason = data.reason || null;
        throw checkoutError;
      }

      const razorpay = new window.Razorpay({
        key: data.keyId,
        ...(isSubscription
          ? { subscription_id: data.subscriptionId }
          : {
              order_id: data.orderId,
              amount: data.amount,
              currency: data.currency,
            }),
        name: "Hyperiux Vault",
        description: isSubscription
          ? `Vault ${tier === "pro_plus" ? "Pro+" : "Pro"} (${interval})`
          : "Test payment",
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        handler: async function handleCheckoutSuccess(response) {
          try {
            // The money has moved by now: a dropped connection or a server error is
            // retried (verifying twice is safe) before anything is called a failure
            const verify = () =>
              fetch("/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
            let verifyRes = null;
            for (const wait of [0, 1500, 3000]) {
              if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
              verifyRes = await verify().catch(() => null);
              if (verifyRes && verifyRes.status < 500) break;
            }
            const verifyJson = verifyRes ? await verifyRes.json().catch(() => ({})) : {};

            if (!verifyRes || !verifyRes.ok || !verifyJson.verified) {
              throw new Error(
                verifyJson.error ||
                  "We couldn’t confirm your payment yet. If you were charged, your plan will switch on within a few minutes - contact support if it doesn’t."
              );
            }

            // `pending`: paid and confirmed, the plan is still being switched on (the
            // payment webhook finishes it) - still a successful payment
            onSuccess?.({ ...response, ...verifyJson, founding: data.founding === true });
          } catch (err) {
            setError(err.message);
            onError?.(err);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.on("payment.failed", (response) => {
        const message = response.error?.description || "Payment failed";
        setError(message);
        onError?.(new Error(message));
        setLoading(false);
      });

      razorpay.open();
    } catch (err) {
      setError(err.message);
      onError?.(err);
      setLoading(false);
    }
  }

  // Another button on the page may have loaded the script already
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.Razorpay) setScriptReady(true);
  }, []);

  // Resumes a purchase that started while the visitor was signed out - once
  // sign-in redirects them back here with autoOpen set, this opens the
  // Razorpay checkout itself instead of waiting for a second click on the
  // button. Only ever fires once per mount (autoOpenedRef), and only once
  // Razorpay's own script has loaded (handlePay needs window.Razorpay).
  useEffect(() => {
    if (!autoOpen || !scriptReady || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    handlePay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, scriptReady]);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        // Straight away when checkout opens by itself; lazyOnload waits for
        // the browser to go idle, which an animated page may not do for a while
        strategy={autoOpen ? "afterInteractive" : "lazyOnload"}
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !scriptReady}
        className={className}
      >
        {loading ? "Processing…" : children}
      </button>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
    </>
  );
}
