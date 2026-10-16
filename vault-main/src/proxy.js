import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { DEV_PREVIEW_USERNAME } from "@/lib/dev/dashboardPreview";
import { dashboardUsername } from "@/lib/user-slug";
import { ACCOUNT_DELETED_COOKIE } from "@/lib/account-deleted";
import registryIndex from "../public/r/index.json";
import { getEffectSlugAliases } from "@/lib/effect-slugs";

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

// `next dev` only: the dashboard preview cookie (lib/dev/dashboardPreview.js) lets
// /dashboard pages render without a session, with sample data. Never in production.
const isDevDashboardPreview = (request) =>
  process.env.NODE_ENV === "development" &&
  request.nextUrl.pathname.startsWith("/dashboard") &&
  Boolean(request.cookies.get("vault-dev-preview")?.value);

// Dashboard URLs carry the account's username (/dashboard/{username}/{tab}, see
// lib/user-slug). The old name-less ones (bookmarks, emails, checkout's successHref) go
// to the same tab under the signed-in account's name; the old admin root was User
// Management, now admin/users. A wrong name is the [username] layout's job.
const LEGACY_DASHBOARD = /^\/dashboard(?:\/(saved|templates|usage|invoicing|settings|admin)(\/.*)?)?\/?$/;

function legacyDashboardPath(pathname, username) {
  const legacy = pathname.match(LEGACY_DASHBOARD);
  if (!legacy) return null;
  const [, tab, rest = ""] = legacy;
  const sub = !tab ? "" : tab === "admin" && !rest ? "/admin/users" : `/${tab}${rest}`;
  return `/dashboard/${username}${sub}`;
}

const withClerk = clerkMiddleware(async (auth, request) => {
  const preview = isDevDashboardPreview(request);
  if (isProtectedRoute(request) && !preview) {
    // Signed out: a dashboard page goes to the Vault's own sign-in page (not Clerk's
    // hosted one), which comes back here once signed in; an API answers 401.
    const { userId } = await auth();
    if (!userId) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Just deleted this browser's account: back to the effects, not the sign-in page
      if (request.cookies.get(ACCOUNT_DELETED_COOKIE)?.value === "1") {
        return NextResponse.redirect(new URL("/effects", request.url));
      }
      const signIn = new URL("/sign-in", request.url);
      signIn.searchParams.set("redirect_url", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(signIn);
    }
  }

  if (LEGACY_DASHBOARD.test(request.nextUrl.pathname)) {
    // Only these old URLs need the name, so only they pay for the user lookup
    let username = preview ? DEV_PREVIEW_USERNAME : null;
    if (!username) {
      const { userId } = await auth();
      if (userId) username = dashboardUsername(await (await clerkClient()).users.getUser(userId));
    }
    if (username) {
      const url = request.nextUrl.clone();
      url.pathname = legacyDashboardPath(request.nextUrl.pathname, username);
      return NextResponse.redirect(url);
    }
  }
});

// Effect detail pages stream behind loading.js, so the 200 header is already sent by
// the time the page's notFound() runs (a "soft 404"). Unknown effects are caught here,
// before rendering, and rewritten to a path no route matches, so the site's 404 page is
// served with a real 404 status. Only the effect slug is checked: a known effect under
// the wrong category still reaches the page, which redirects it to the right one.
const EFFECT_DETAIL_PATH = /^\/effects\/[^/]+\/([^/]+)\/?$/;
const knownEffectSlugs = new Set((registryIndex.items || registryIndex).map((effect) => effect.name));

const isUnknownEffect = (pathname) => {
  const match = pathname.match(EFFECT_DETAIL_PATH);
  if (!match) return false;
  return !getEffectSlugAliases(match[1]).some((slug) => knownEffectSlugs.has(slug));
};

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

  if (isUnknownEffect(request.nextUrl.pathname)) {
    return NextResponse.rewrite(new URL("/_effect-not-found", request.url));
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
