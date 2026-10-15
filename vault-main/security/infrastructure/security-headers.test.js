import { describe, it, expect, vi } from "vitest";

// Response hardening, checked at the source (next.config.mjs headers() and
// the media proxy) so it runs in CI without a server. The live equivalent
// is in security/blackbox/probes.test.js. Report: M2, L4.

const { default: nextConfig } = await import("../../next.config.mjs");

async function headersFor(pathname) {
  const rules = (await nextConfig.headers?.()) || [];
  const out = {};
  for (const rule of rules) {
    // Only the catch-all and exact sources matter for these checks.
    const pattern = new RegExp("^" + rule.source.replace(/:path\*/g, ".*").replace(/:\w+/g, "[^/]+") + "$");
    if (!pattern.test(pathname)) continue;
    for (const { key, value } of rule.headers) out[key.toLowerCase()] = value;
  }
  return out;
}

describe("global response headers", () => {
  it("a CSP is set on every path (control)", async () => {
    expect((await headersFor("/effects"))["content-security-policy"]).toBeTruthy();
  });

  it("frame-src stays an explicit allowlist", async () => {
    const csp = (await headersFor("/"))["content-security-policy"];
    expect(csp).toMatch(/frame-src\s+'self'/);
    expect(csp).not.toMatch(/frame-src[^;]*\*(\s|;|$)/);
  });

  it.fails("[M2] clickjacking protection: CSP frame-ancestors or X-Frame-Options", async () => {
    const h = await headersFor("/dashboard/settings");
    const csp = h["content-security-policy"] || "";
    expect(/frame-ancestors\s+('none'|'self')/.test(csp) || /^(deny|sameorigin)$/i.test(h["x-frame-options"] || "")).toBe(true);
  });

  it.fails("[M2] HSTS with a long max-age", async () => {
    const hsts = (await headersFor("/"))["strict-transport-security"] || "";
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1] || 0);
    expect(maxAge).toBeGreaterThanOrEqual(15552000); // 180 days
  });

  it.fails("[M2] X-Content-Type-Options: nosniff", async () => {
    expect((await headersFor("/api/media-proxy"))["x-content-type-options"]).toBe("nosniff");
  });

  it.fails("[M2] a Referrer-Policy that doesn't leak full URLs cross-origin", async () => {
    expect((await headersFor("/"))["referrer-policy"] || "").toMatch(/^(strict-origin-when-cross-origin|strict-origin|same-origin|no-referrer)$/);
  });

  it.fails("[M2] CSP restricts object-src and base-uri", async () => {
    const csp = (await headersFor("/"))["content-security-policy"] || "";
    expect(csp).toMatch(/object-src\s+'none'/);
    expect(csp).toMatch(/base-uri\s+('self'|'none')/);
  });
});

describe("image optimizer", () => {
  // remotePatterns hostname "**" makes /_next/image a fetch-anything proxy:
  // bandwidth/cost abuse and a limited SSRF from Vercel's network.
  it.fails("[M2] next/image only fetches from an explicit host allowlist", () => {
    const patterns = nextConfig.images?.remotePatterns || [];
    expect(patterns.some((p) => p.hostname === "**" || p.hostname === "*")).toBe(false);
  });
});

const { GET } = await import("@/app/api/media-proxy/route.js");

describe("media proxy", () => {
  function stubUpstream(contentType, body = "x") {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(body, { status: 200, headers: { "content-type": contentType } }))
    );
  }
  const proxy = (url) => GET(new Request(`http://localhost/api/media-proxy?url=${encodeURIComponent(url)}`));
  const ALLOWED = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/videos/a.mp4";

  it("refuses hosts outside the allowlist, http, and lookalike hosts (SSRF)", async () => {
    stubUpstream("video/mp4");
    for (const url of [
      "https://evil.example/a.mp4",
      "http://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/a.mp4",
      "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev.evil.example/a.mp4",
      "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev@evil.example/a.mp4",
      "https://169.254.169.254/latest/meta-data/",
      "file:///etc/passwd",
    ]) {
      expect((await proxy(url)).status, url).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("control: allowlisted media is proxied", async () => {
    stubUpstream("video/mp4");
    expect((await proxy(ALLOWED)).status).toBe(200);
  });

  // The upstream content-type is passed straight through with ACAO "*"
  // and no nosniff. An .html/.svg object in the bucket would render as a
  // document on vault.hyperiux.com (stored XSS on the app origin).
  it.fails("[M2] never serves active content (html/svg/xml) from the app origin", async () => {
    for (const type of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/xml"]) {
      stubUpstream(type, "<script>alert(1)</script>");
      const res = await proxy(ALLOWED);
      const served = res.headers.get("content-type") || "";
      const sandboxed = /sandbox/.test(res.headers.get("content-security-policy") || "") || /attachment/.test(res.headers.get("content-disposition") || "");
      expect(/html|svg|xml/.test(served) && !sandboxed, `${type} served as ${served}`).toBe(false);
    }
  });
});
