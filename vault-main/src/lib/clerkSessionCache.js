import { useEffect, useState } from "react";

// Clerk sets a plain, non-HttpOnly "__client_uat" cookie holding the unix
// timestamp of the last session update, and resets it to "0" on sign-out -
// a synchronous, browser-cache-only signal for "was this browser last known
// to be signed in," readable before any ClerkProvider/session fetch runs.
// Same cookie the __client_uat handling in app/layout.js and proxy.js
// already reads server-side; this is the client-side read of it.
//
// Meant for components rendered outside a live Clerk tree (marketing pages
// with no ClerkProvider - see Navbar.jsx) that still want to avoid
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

const SESSION_CHANGED_EVENT = "vault:session-changed";

// Called right after this page signs someone in (or finds them already signed
// in), so cookie-based headers swap Sign In for the avatar without a reload.
export function notifyClerkSessionChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_CHANGED_EVENT));
}

// hasCachedClerkSession(), kept current: re-read after a sign-in on this page,
// when the tab regains focus (signed in or out in another tab), and when the
// browser restores the page from its back/forward cache (back from /sign-in).
export function useCachedClerkSession({ skip = false } = {}) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (skip) return undefined;
    const read = () => setSignedIn(hasCachedClerkSession());
    const onVisible = () => document.visibilityState === "visible" && read();
    read();
    window.addEventListener(SESSION_CHANGED_EVENT, read);
    window.addEventListener("focus", read);
    window.addEventListener("pageshow", read);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(SESSION_CHANGED_EVENT, read);
      window.removeEventListener("focus", read);
      window.removeEventListener("pageshow", read);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [skip]);

  return signedIn;
}
