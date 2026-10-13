"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { readPendingCheckout } from "@/lib/pendingCheckout";

// A visitor who clicked a plan while signed out is sent back to it once
// they're signed in, wherever sign-in or sign-up left them (some routes, such
// as Clerk's /signup/continue for new Google accounts, ignore redirect_url).
// /checkout/<plan> then opens Razorpay and clears it.
export default function PendingCheckoutResume() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    // Already there, or mid sign-in / sign-up
    if (/^\/(checkout|sign-in|sign-up|signup|sso-callback)/.test(pathname)) return;
    const plan = readPendingCheckout();
    if (plan) router.replace(`/checkout/${plan}`);
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
