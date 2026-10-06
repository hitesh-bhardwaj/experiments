// Clerk sets a plain, non-HttpOnly "__client_uat" cookie holding the unix
// timestamp of the last session update, and resets it to "0" on sign-out -
// a synchronous, browser-cache-only signal for "was this browser last known
// to be signed in," readable before any ClerkProvider/session fetch runs.
// Same cookie the __client_uat handling in app/layout.js and proxy.js
// already reads server-side; this is the client-side read of it.
//
// Meant for components rendered outside a live Clerk tree (marketing pages
// with no ClerkProvider - see NavbarV3.jsx) that still want to avoid
// showing a "Sign In" prompt to a browser that's actually signed in
// elsewhere on the site. It is a cache, not a source of truth: a stale or
// spoofed cookie can only ever hide a sign-in prompt it shouldn't, never
// grant access to anything - real auth still gates every protected route
// and API server-side.
export function hasCachedClerkSession() {
  if (typeof document === "undefined") return false;

  const match = document.cookie.match(/(?:^|; )__client_uat=([^;]*)/);
  if (!match) return false;

  const value = match[1];
  return value !== "" && value !== "0";
}
