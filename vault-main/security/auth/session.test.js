import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Session boundary: which paths the proxy (this Next version's middleware)
// forces through Clerk's auth.protect(), and where the post-sign-in
// redirect is allowed to send a freshly authenticated session.
// Reports: M1 (open redirect).

const protectCalls = [];
let sessionUserId = null;

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: sessionUserId })),
  clerkMiddleware: (handler) => async (request) => {
    const authFn = async () => ({ userId: sessionUserId });
    authFn.protect = vi.fn(async () => {
      protectCalls.push(request.nextUrl.pathname);
    });
    return handler(authFn, request);
  },
  createRouteMatcher: (patterns) => (request) =>
    patterns.some((pattern) => new RegExp(`^${pattern}$`).test(request.nextUrl.pathname)),
}));

const redirect = vi.fn((url) => {
  throw Object.assign(new Error("NEXT_REDIRECT"), { url });
});
vi.mock("next/navigation", () => ({ redirect: (url) => redirect(url), notFound: vi.fn() }));

const { default: proxy } = await import("@/proxy.js");
const { default: SignInPage } = await import("@/app/(app)/(auth)/sign-in/[[...sign-in]]/page.js");
const { default: SignUpPage } = await import("@/app/(app)/(auth)/sign-up/[[...sign-up]]/page.js");

async function runProxy(pathname, { cookies = "" } = {}) {
  protectCalls.length = 0;
  const request = new NextRequest(new URL(pathname, "https://vault.hyperiux.com"), {
    headers: { host: "vault.hyperiux.com", ...(cookies ? { cookie: cookies } : {}) },
  });
  await proxy(request);
  return protectCalls.includes(new URL(pathname, "https://x").pathname);
}

describe("proxy: routes that must require a Clerk session", () => {
  beforeEach(() => {
    sessionUserId = null;
  });

  const MUST_PROTECT = [
    "/dashboard",
    "/dashboard/admin",
    "/dashboard/admin/emails",
    "/dashboard/settings",
    "/api/dashboard",
    "/api/dashboard/invoices",
    "/api/dashboard/usage",
    "/api/wishlist",
    "/api/wishlist/list",
    "/api/razorpay/create-order",
    "/api/razorpay/create-subscription",
    "/api/razorpay/verify-payment",
  ];

  for (const pathname of MUST_PROTECT) {
    it(`protects ${pathname}`, async () => {
      expect(await runProxy(pathname)).toBe(true);
    });
  }

  it("still protects when a stale __client_uat cookie triggers the cookie-cleaning path", async () => {
    expect(await runProxy("/api/dashboard", { cookies: "__client_uat=12345" })).toBe(true);
  });

  it("the dev dashboard-preview cookie is ignored outside `next dev`", async () => {
    expect(process.env.NODE_ENV).not.toBe("development");
    expect(await runProxy("/dashboard", { cookies: "vault-dev-preview=1" })).toBe(true);
  });

  it("case/trailing-slash variants of a protected API path are still protected", async () => {
    // Next routes are case-sensitive, so /API/... would 404 rather than
    // reach a handler; trailing slashes are normalised by Next before the
    // proxy runs. Only check the variants that could actually reach code.
    expect(await runProxy("/api/dashboard/")).toBe(true);
    expect(await runProxy("/dashboard/admin/")).toBe(true);
  });

  it("the Razorpay webhook is deliberately left to its own signature check", async () => {
    expect(await runProxy("/api/razorpay/webhooks")).toBe(false);
  });

  it("www. requests redirect to the apex on the same scheme, without reflecting arbitrary hosts", async () => {
    const request = new NextRequest("https://www.vault.hyperiux.com/effects", {
      headers: { host: "www.vault.hyperiux.com" },
    });
    const res = await proxy(request);
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")).host).toBe("vault.hyperiux.com");
  });
});

describe("post-sign-in redirect target", () => {
  const SAFE_FALLBACK = "/effects";
  const OFFSITE = [
    "//evil.example",
    "https://evil.example",
    "http:evil.example",
    "javascript:alert(1)",
    "evil.example",
  ];
  // Browsers normalise "\" to "/" in the authority, so these are
  // protocol-relative URLs to evil.example even though they start with a
  // single "/" and pass the current `startsWith("/") && !startsWith("//")`.
  const BACKSLASH_BYPASS = ["/\\evil.example", "/\\/evil.example", "/\t/evil.example"];

  async function landing(Page, target) {
    sessionUserId = "user_1";
    redirect.mockClear();
    await Page({ searchParams: Promise.resolve({ redirect_url: target }) }).catch(() => {});
    return redirect.mock.calls[0]?.[0];
  }

  for (const [name, Page] of [
    ["sign-in", SignInPage],
    ["sign-up", SignUpPage],
  ]) {
    it(`${name}: same-app paths are honoured (control)`, async () => {
      expect(await landing(Page, "/pricing?checkout=pro")).toBe("/pricing?checkout=pro");
    });

    it(`${name}: obvious off-site targets fall back to ${SAFE_FALLBACK}`, async () => {
      for (const target of OFFSITE) {
        expect(await landing(Page, target), target).toBe(SAFE_FALLBACK);
      }
    });

    it.fails(`[M1] ${name}: backslash / control-char variants can't redirect off-site`, async () => {
      for (const target of BACKSLASH_BYPASS) {
        const landed = await landing(Page, target);
        // Resolve exactly like a browser would against the app origin.
        const resolved = new URL(landed, "https://vault.hyperiux.com");
        expect(resolved.host, `${JSON.stringify(target)} -> ${resolved.href}`).toBe("vault.hyperiux.com");
      }
    });
  }
});
