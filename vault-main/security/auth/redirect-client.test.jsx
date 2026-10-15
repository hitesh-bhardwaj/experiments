import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "@/components/auth/AuthFormPrimitives";

// Client-side twin of the sign-in/sign-up page check (see session.test.js):
// vault-door passes this result to router.push() after authentication.
// Report: M1.

const resolve = (value) => new URL(value, "https://vault.hyperiux.com");

describe("getSafeRedirectUrl", () => {
  it("keeps same-app relative paths (control)", () => {
    expect(getSafeRedirectUrl("/templates/lumera?buy=1", "/effects")).toBe("/templates/lumera?buy=1");
  });

  it("rejects non-strings, absolute and protocol-relative URLs", () => {
    for (const value of [undefined, null, 42, "https://evil.example", "//evil.example", "javascript:alert(1)"]) {
      expect(getSafeRedirectUrl(value, "/effects"), String(value)).toBe("/effects");
    }
  });

  it("[M1] rejects backslash variants that browsers treat as protocol-relative", () => {
    for (const value of ["/\\evil.example", "/\\/evil.example", "/\t/evil.example"]) {
      const result = getSafeRedirectUrl(value, "/effects");
      expect(resolve(result).host, JSON.stringify(value)).toBe("vault.hyperiux.com");
    }
  });
});
