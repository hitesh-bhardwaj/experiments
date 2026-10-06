import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/dashboard(.*)",
  "/api/wishlist(.*)",
  // Not /api/razorpay/webhooks - Razorpay's server sends those with no Clerk
  // session (auth.protect() would silently drop every delivery, as happened
  // with Stripe webhooks before). That route authenticates itself via the
  // X-Razorpay-Signature header instead.
  "/api/razorpay/create-order(.*)",
  "/api/razorpay/create-subscription(.*)",
  "/api/razorpay/verify-payment(.*)",
]);

// Marketing pages render with no ClerkProvider and no Clerk hooks (see the
// (marketing) route group), so there is nothing on these routes for Clerk
// middleware to protect or hydrate against. Skipping clerkMiddleware here
// avoids its session-verification work (and the stale-UAT handshake risk
// below) on every visit to the pages that actually need to be fast.
const isMarketingRoute = createRouteMatcher([
  "/",
  "/demo(.*)",
]);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

// Strip stale __client_uat cookies before Clerk processes the request.
// When the site ran with dev Clerk keys, browsers received a __client_uat
// cookie issued by the dev instance. After switching to production keys,
// Clerk middleware sees that UAT, can't match it to the production instance,
// and injects a cross-instance handshake into the RSC payload - redirecting
// even non-authenticated visitors to adequate-shad-61.clerk.accounts.dev.
// Removing the orphaned UAT from the request before Clerk runs prevents this.
export default async function middleware(request) {
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const url = new URL(request.url);
    url.host = host.replace(/^www\./, "");
    return NextResponse.redirect(url.toString(), 301);
  }

  if (isMarketingRoute(request)) {
    return NextResponse.next();
  }

  const clientUat = request.cookies.get("__client_uat")?.value;
  const session = request.cookies.get("__session")?.value;

  if (clientUat && clientUat !== "0" && !session) {
    const newHeaders = new Headers(request.headers);
    const cleaned = (newHeaders.get("cookie") || "")
      .split(";")
      .map((c) => c.trim())
      .filter((c) => !c.startsWith("__client_uat="))
      .join("; ");
    cleaned
      ? newHeaders.set("cookie", cleaned)
      : newHeaders.delete("cookie");

    const cleanRequest = new NextRequest(request.url, {
      method: request.method,
      headers: newHeaders,
    });

    const response = await withClerk(cleanRequest);
    // Also tell the browser to zero out the stale cookie
    const res = response ?? NextResponse.next();
    res.cookies.set("__client_uat", "0", {
      path: "/",
      maxAge: 0,
      secure: true,
      sameSite: "strict",
    });
    return res;
  }

  return withClerk(request);
}

export const config = {
  matcher: [
    // Skip all internal paths and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
