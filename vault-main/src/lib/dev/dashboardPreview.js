// Development-only dashboard preview. Clerk can't sign in on localhost (production keys),
// so the dashboard can't be seen while working on it. In `next dev` only, a
// `vault-dev-preview` cookie lets /dashboard pages through the proxy without a session
// (src/proxy.js) and swaps their API data for the samples below. Production builds never
// take this path: every check is behind NODE_ENV === "development".
//
//   document.cookie = "vault-dev-preview=pro"   // or "free"; clear it to turn it off

export const DASHBOARD_PREVIEW_COOKIE = "vault-dev-preview";

// "pro" | "free" when the preview is on, else null
export function getDashboardPreview() {
  if (process.env.NODE_ENV !== "development" || typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${DASHBOARD_PREVIEW_COOKIE}=`))
    ?.split("=")[1];
  return value === "free" ? "free" : value ? "pro" : null;
}

// Same shape as GET /api/dashboard
export function sampleDashboard(plan = "pro") {
  const pro = plan === "pro";
  return {
    plan: pro ? "pro" : "free",
    tier: pro ? "pro" : null,
    joinedAt: "2026-03-14T10:00:00.000Z",
    planValidUntil: pro ? "2027-03-14T10:00:00.000Z" : null,
    billingInterval: pro ? "yearly" : null,
    subscriptionStatus: pro ? "active" : null,
    manageSubscriptionUrl: pro ? "https://example.com/manage" : null,
    dailyInstallLimit: pro ? 5 : 3,
    templateCredits: pro ? 2 : 0,
    totalEffects: 150,
    totalFreeEffects: 53,
    totalEffectsAccess: pro ? 150 : 53,
    savedCount: 12,
    copiedCount: 34,
    installedCount: 21,
  };
}
