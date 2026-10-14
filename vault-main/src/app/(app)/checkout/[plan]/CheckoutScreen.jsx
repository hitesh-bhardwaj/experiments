"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import PlanCheckoutButton from "@/components/Payments/PlanCheckoutButton";
import { clearPendingCheckout, savePendingCheckout } from "@/lib/pendingCheckout";
import { FOCUS_RING_CLASS } from "@/components/auth/vault-door/constants";
import { PLANS, formatPrice, getCreditsPerYear, getMonthlyEquivalent, getPrice } from "@/lib/plans";

// Opens Razorpay for one plan as soon as Clerk confirms the visitor is
// signed in; sends them to sign-in (and back here) if not. The plan summary
// and button stay on screen for anyone who closes the Razorpay window.
export default function CheckoutScreen({ tier, interval, currency }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const planKey = `${tier}.${interval}`;
  const plan = PLANS[tier];

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      clearPendingCheckout();
      return;
    }
    // Remembered too, for sign-up routes that drop redirect_url
    savePendingCheckout(planKey);
    router.replace(`/sign-in?redirect_url=${encodeURIComponent(`/checkout/${planKey}`)}`);
  }, [isLoaded, isSignedIn, planKey, router]);

  const price = getPrice(tier, interval, currency);
  const credits = getCreditsPerYear(tier, interval);
  const gst = currency === "INR" ? " + GST" : "";

  return (
    <main id="checkout" className="flex min-h-svh w-full items-center justify-center bg-background px-[6vw] py-[7%] text-foreground max-md:px-[7vw]">
      <section className="flex w-[34vw] flex-col gap-6 border border-foreground/15 bg-dark-card p-[2.4vw] max-lg:w-[70vw] max-lg:p-[4vw] max-md:w-full max-md:p-[7vw]">
        <div className="flex items-center justify-between gap-4">
          {/* Same back control as the sign-in steps (vault-door/StepTrack.jsx) */}
          <Link
            href="/"
            aria-label="Back to home"
            className={`group -ml-[0.4vw] grid cursor-pointer place-items-center p-[0.4vw] text-white/80 transition-colors duration-300 hover:text-primary max-lg:-ml-1.5 max-lg:p-1.5 ${FOCUS_RING_CLASS}`}
          >
            <span
              aria-hidden="true"
              className="size-[1vw] -scale-x-100 bg-current transition-transform duration-300 [mask-image:url(/icons/arrow-icon-final.svg)] mask-contain mask-center mask-no-repeat group-hover:-translate-x-1 max-lg:size-4"
            />
          </Link>
          <p className="type-label text-foreground/50">Checkout</p>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="type-h2">
            {plan.name} {interval === "yearly" ? "yearly" : "quarterly"}
          </h1>
          <p className="type-body text-foreground/70">
            {formatPrice(price, currency)} {interval === "yearly" ? "a year" : "every 3 months"}
            {gst} · {formatPrice(getMonthlyEquivalent(tier, interval, currency), currency)}/mo
          </p>
        </div>

        <ul className="flex flex-col gap-2 border-t border-foreground/10 pt-5 type-small text-foreground/80">
          <li>{tier === "pro_plus" ? "Every component and the full template catalogue" : "Every component in the vault"}</li>
          <li>{plan.installsPerDay} installs a day across copy, CLI and MCP</li>
          <li>
            {credits === 0
              ? "Template credits come with yearly billing"
              : tier === "pro_plus" && interval === "quarterly"
                ? "1 template credit every quarter"
                : `${credits} template credits a year`}
          </li>
        </ul>

        <div className="flex flex-col gap-3">
          {isLoaded && isSignedIn ? (
            <PlanCheckoutButton
              tier={tier}
              interval={interval}
              currency={currency}
              text={`Pay for ${plan.name}`}
              successHref={`/effects?upgraded=${planKey}`}
              autoOpen
              className="w-full justify-center"
            />
          ) : (
            <p aria-live="polite" className="type-small text-foreground/60">
              {isLoaded ? "Taking you to sign in…" : "Opening secure checkout…"}
            </p>
          )}
          <Link href="/pricing#plans" className="type-small w-fit text-foreground/60 underline underline-offset-2 hover:text-foreground">
            See all plans
          </Link>
        </div>
      </section>
    </main>
  );
}
