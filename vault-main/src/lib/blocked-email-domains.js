import "server-only";
import DISPOSABLE_DOMAINS from "disposable-email-domains";

// Server-only on purpose: the old local blacklist JSON was imported by the
// client zod schema, shipping ~200KB in the landing-page bundle. The check
// only means anything server-side anyway (client validation is bypassable).
//
// The old vendored JSON was actually a FREE-PROVIDER list - it rejected
// gmail/yahoo/outlook/proton/gmx leads with a "work or personal email"
// message. disposable-email-domains is the canonical curated disposable-only
// list (personal providers are explicitly out of scope for it), updated via
// normal dependency bumps.
const BLOCKED_SET = new Set(DISPOSABLE_DOMAINS);

export function isBlockedEmailDomain(email) {
  const domain = String(email).split("@")[1]?.toLowerCase();
  return Boolean(domain && BLOCKED_SET.has(domain));
}
