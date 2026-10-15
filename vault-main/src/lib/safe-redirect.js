// Where to send someone after sign-in or sign-up. The target comes from the URL
// (?redirect_url=), so anyone can craft it: only paths on this site are allowed,
// anything else falls back.
//
// A plain startsWith("/") && !startsWith("//") check isn't enough. Browsers treat
// "\" like "/" and drop tabs and newlines, so "/\evil.com" and "/\t/evil.com" both
// land on evil.com (security audit M1). Those characters are refused outright, and
// what's left is resolved the way a browser would and must stay on this site.

const ORIGIN = "https://vault.invalid";

export function getSafeRedirectPath(value, fallback) {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;

  let url;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return fallback;
  }

  if (url.origin !== ORIGIN) return fallback;
  return url.pathname + url.search + url.hash;
}
