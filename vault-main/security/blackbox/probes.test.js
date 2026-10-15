import { describe, it, expect, vi } from "vitest";
import { getProEffectSlugs } from "../helpers/route-harness.js";

// Black-box probes against a running Vault, as an outside attacker would
// see it: unauthenticated, or with a Free account's CLI token. Everything
// here is a read or a request the server must reject - no state changes.
//
//   VAULT_TEST_URL=http://localhost:3000 npm run test:security:blackbox
//
// Optional:
//   VAULT_TEST_FREE_TOKEN  hpx_ token of a synthetic *Free* account
//   VAULT_TEST_PRO_SLUG    a Pro effect slug (defaults to the first in public/r/index.json)
//
// Use local dev or staging only. Skipped entirely when VAULT_TEST_URL is unset.

const BASE = process.env.VAULT_TEST_URL;
// `next dev` compiles each route on first hit - give probes room so a slow
// compile never masquerades as a pass/fail (especially for it.fails).
vi.setConfig({ testTimeout: 90_000 });
const FREE_TOKEN = process.env.VAULT_TEST_FREE_TOKEN;
const PRO_SLUG = process.env.VAULT_TEST_PRO_SLUG || getProEffectSlugs()[0];

const req = (path, init = {}) => fetch(new URL(path, BASE), { redirect: "manual", ...init });
const bodyOf = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};
const hasSource = (body) => /"content"\s*:\s*"/.test(typeof body === "string" ? body : JSON.stringify(body));

describe.skipIf(!BASE)(`black-box probes against ${BASE}`, () => {
  describe("Pro asset authorization", () => {
    for (const path of [`/api/cli/effects/${PRO_SLUG}`, `/api/effects/${PRO_SLUG}`]) {
      it(`anonymous GET ${path} is refused with no source`, async () => {
        const res = await req(path);
        expect([401, 403]).toContain(res.status);
        expect(hasSource(await bodyOf(res))).toBe(false);
      });

      it.skipIf(!FREE_TOKEN)(`Free token GET ${path} is refused with no source`, async () => {
        const res = await req(path, { headers: { authorization: `Bearer ${FREE_TOKEN}` } });
        expect(res.status).toBe(403);
        expect(hasSource(await bodyOf(res))).toBe(false);
      });
    }

    it(`static /r/${PRO_SLUG}.json is served without file content`, async () => {
      const res = await req(`/r/${PRO_SLUG}.json`);
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.tier).toBe("pro");
      expect(hasSource(body)).toBe(false);
    });

    it("public listing endpoints carry no source", async () => {
      for (const path of ["/api/effects/list", "/api/effects/search-index", "/r/index.json"]) {
        const res = await req(path);
        expect(hasSource(await bodyOf(res)), path).toBe(false);
      }
    });

    it("anonymous 'Get code' is refused", async () => {
      const res = await req(`/api/effects/${PRO_SLUG}/copy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ option: "tsx" }),
      });
      expect([401, 403, 404]).toContain(res.status);
      expect(hasSource(await bodyOf(res))).toBe(false);
    });

    it("anonymous template download is refused", async () => {
      const res = await req("/api/templates/lumera/download");
      expect([401, 403, 404]).toContain(res.status);
      expect(res.headers.get("content-type") || "").not.toMatch(/zip/);
    });
  });

  describe("registry path traversal (M5)", () => {
    // Confirmed against local dev on 2026-10-14: each of these returns
    // vault-main/package.json shaped as a "free effect" (200). effect-slugs.js
    // runs decodeURIComponent on whatever Next hands it, so both single and
    // double encoding reach path.join() as "../../package".
    for (const slug of ["..%252F..%252Fpackage", "%252e%252e%252f%252e%252e%252fpackage", "..%2F..%2Fpackage"]) {
      it(`[M5] GET /api/cli/effects/${slug} does not resolve outside the registry`, async () => {
        const res = await req(`/api/cli/effects/${slug}`);
        const body = await bodyOf(res);
        expect(res.status, JSON.stringify(body).slice(0, 200)).toBe(404);
        expect(JSON.stringify(body)).not.toMatch(/"@hyperiux\/docs"|next build/);
      });
    }

    it("backslash-encoded traversal does not resolve (POSIX hosts treat \\ as a filename char)", async () => {
      const res = await req("/api/cli/effects/..%255C..%255Cpackage");
      expect(res.status).toBe(404);
    });
  });

  describe("CLI token endpoints", () => {
    it("validate rejects forged tokens", async () => {
      for (const token of [`hpx_${"0".repeat(64)}`, "hpx_", "not-a-token", ""]) {
        const res = await req("/api/cli/validate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        expect([400, 401]).toContain(res.status);
      }
    });

    it("token issue and revoke need a session", async () => {
      for (const path of ["/api/cli/token", "/api/cli/revoke"]) {
        const res = await req(path, { method: "POST" });
        expect([401, 403, 404, 307, 308], path).toContain(res.status);
        expect(JSON.stringify(await bodyOf(res))).not.toMatch(/hpx_[0-9a-f]{64}/);
      }
    });
  });

  describe("billing", () => {
    it("the Razorpay webhook rejects an unsigned event", async () => {
      const res = await req("/api/razorpay/webhooks", {
        method: "POST",
        headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64) },
        body: JSON.stringify({ event: "subscription.charged", payload: {} }),
      });
      expect([400, 500]).toContain(res.status);
    });

    it("checkout and verify need a session", async () => {
      for (const path of ["/api/razorpay/create-subscription", "/api/razorpay/create-order", "/api/razorpay/verify-payment"]) {
        const res = await req(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        expect(res.status, path).not.toBe(200);
      }
    });
  });

  describe("admin and account APIs", () => {
    it("every admin API refuses an anonymous caller", async () => {
      for (const path of [
        "/api/admin/users",
        "/api/admin/users/export",
        "/api/admin/emails",
        "/api/admin/invoices",
        "/api/admin/revenue/overview",
        "/api/admin/activity/overview",
        "/api/admin/installs",
      ]) {
        const res = await req(path);
        expect([401, 403, 404], `${path} -> ${res.status}`).toContain(res.status);
      }
    });

    it("dashboard APIs don't return data to an anonymous caller", async () => {
      for (const path of ["/api/dashboard", "/api/dashboard/invoices", "/api/dashboard/usage"]) {
        const res = await req(path);
        expect(res.status, path).not.toBe(200);
      }
    });
  });

  describe("SSRF / proxies", () => {
    it("media proxy refuses non-allowlisted hosts", async () => {
      for (const url of ["https://example.com/a.mp4", "http://169.254.169.254/latest/meta-data/", "file:///etc/passwd"]) {
        const res = await req(`/api/media-proxy?url=${encodeURIComponent(url)}`);
        expect(res.status, url).toBe(400);
      }
    });

    it("[M2] the image optimizer refuses arbitrary remote hosts", async () => {
      const res = await req(`/_next/image?url=${encodeURIComponent("https://example.com/favicon.ico")}&w=64&q=75`);
      expect(res.status).toBe(400);
    });
  });

  describe("response headers (M2)", () => {
    const headersOf = async (path) => (await req(path)).headers;

    it("[M2] pages can't be framed by other origins", async () => {
      const h = await headersOf("/effects");
      const csp = h.get("content-security-policy") || "";
      expect(/frame-ancestors/.test(csp) || /deny|sameorigin/i.test(h.get("x-frame-options") || "")).toBe(true);
    });

    it("[M2] nosniff and a referrer policy are set", async () => {
      const h = await headersOf("/");
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("referrer-policy")).toBeTruthy();
    });

    // Next sends X-Powered-By: Next.js unless poweredByHeader: false.
    it("[L13] no framework version banner", async () => {
      const h = await headersOf("/");
      expect(h.get("x-powered-by")).toBeNull();
    });
  });
});
