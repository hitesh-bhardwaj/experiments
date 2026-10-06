"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useUser } from "@clerk/nextjs";

// Razorpay Standard Checkout button. Two modes:
//   <RazorpayCheckoutButton amount={1} />                        one-time order (testing)
//   <RazorpayCheckoutButton amount={29} templateSlug="elenavoss" />  one-time template purchase
//   <RazorpayCheckoutButton plan="monthly" />                    subscription (monthly|yearly|founding)
export default function RazorpayCheckoutButton({
  amount,
  plan,
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
      const endpoint = plan
        ? "/api/razorpay/create-subscription"
        : "/api/razorpay/create-order";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          plan
            ? { plan, currency, idempotencyKey: crypto.randomUUID() }
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
        ...(plan
          ? { subscription_id: data.subscriptionId }
          : {
              order_id: data.orderId,
              amount: data.amount,
              currency: data.currency,
            }),
        name: "Hyperiux Vault",
        description: plan ? `Vault Pro (${plan})` : "Test payment",
        prefill: {
          name: user?.fullName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
        },
        handler: async function handleCheckoutSuccess(response) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyJson = await verifyRes.json();

            if (!verifyRes.ok || !verifyJson.verified) {
              throw new Error(verifyJson.error || "Payment could not be verified");
            }

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
        strategy="lazyOnload"
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
