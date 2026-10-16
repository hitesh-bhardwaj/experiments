import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { getRole } from "@/lib/admin";
import { ACTIVE_PRO_STATUSES } from "@/lib/subscription";
import { isValidTier } from "@/lib/plans";
import { fetchAllRows, supabase } from "@/lib/supabase";

// Admin totals read whole tables - every row, not the first 1000
export { fetchAllRows };

// Shared data rules for every admin route, so each number on the admin pages is
// counted the same way everywhere.

// ---------------------------------------------------------------------------
// Internal accounts
// ---------------------------------------------------------------------------

// Our own team: kept out of the customer numbers, shown on their own with the
// Customers / Internal switch. An account is internal when its email is on one
// of these domains or listed below, it has an admin role, or a super admin set
// publicMetadata.internal = true on it in Clerk.
export const INTERNAL_EMAIL_DOMAINS = ["weareenigma.com"];
// Team members' personal accounts used for testing
export const INTERNAL_EMAILS = ["harshgoyalrss7@gmail.com"];

export function isInternalUser(user) {
  if (!user) return false;
  if (user.publicMetadata?.internal === true || getRole(user)) return true;
  return (user.emailAddresses || []).some(({ emailAddress = "" }) => {
    const email = emailAddress.toLowerCase();
    return INTERNAL_EMAILS.includes(email) || INTERNAL_EMAIL_DOMAINS.includes(email.split("@")[1]);
  });
}

// "customers" (the default), "internal" or "all", from ?audience=
export const AUDIENCES = ["customers", "internal", "all"];
export function parseAudience(searchParams) {
  const value = searchParams.get("audience");
  return AUDIENCES.includes(value) ? value : "customers";
}

// Every Clerk user, once a minute at most - the user base is small enough to
// hold, and it's the real list of accounts (subscriptions keeps rows for
// deleted accounts).
const USERS_TTL_MS = 60_000;
let usersCache = null;

export async function getAllClerkUsers() {
  if (usersCache && Date.now() - usersCache.at < USERS_TTL_MS) return usersCache.users;
  const clerk = await clerkClient();
  const users = [];
  for (let offset = 0; ; offset += 500) {
    const { data } = await clerk.users.getUserList({ limit: 500, offset, orderBy: "-created_at" });
    users.push(...data);
    if (data.length < 500) break;
  }
  usersCache = { at: Date.now(), users };
  return users;
}

/**
 * Who a request counts. `includes(clerkUserId)` decides a row: rows with no
 * signed-in user (anonymous installs, views) are customers; rows from a
 * deleted account are customers too (they're no one on the team).
 */
export async function getAudience(audience) {
  const users = await getAllClerkUsers();
  const internalIds = new Set(users.filter(isInternalUser).map((user) => user.id));

  const includes = (clerkUserId) => {
    if (audience === "all") return true;
    const internal = Boolean(clerkUserId) && internalIds.has(clerkUserId);
    return audience === "internal" ? internal : !internal;
  };

  return {
    audience,
    internalIds: [...internalIds],
    users: users.filter((user) => includes(user.id)),
    includes,
    // install_events / install_unlocks / template_views key people as "user:<id>"
    includesIdentity: (identityKey) =>
      includes(identityKey?.startsWith("user:") ? identityKey.slice(5) : null),
  };
}

// The same audience as a Supabase filter, for a list paged in the database.
// Rows with no user (anonymous installs) are customers.
export function filterToAudience(query, { audience, internalIds }, column = "clerk_user_id") {
  if (audience === "all") return query;
  // No internal accounts: customers is everyone, internal is no one
  if (!internalIds.length) return audience === "internal" ? query.in(column, ["-"]) : query;
  if (audience === "internal") return query.in(column, internalIds);
  const list = `(${internalIds.map((id) => `"${id}"`).join(",")})`;
  return query.or(`${column}.is.null,${column}.not.in.${list}`);
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

// What a subscriptions row means right now: "pro" | "pro_plus" | "free".
// Pro only while the subscription is live and its paid (or granted) period
// hasn't ended - an admin grant that ran out is still plan "pro" in the row
// until something marks it, but it gives no access (see getUserPlanInfo).
// Rows from before Pro+ existed have no tier and count as Pro+.
export function currentPlanOf(row) {
  if (row?.plan !== "pro" || !ACTIVE_PRO_STATUSES.includes(row.status)) return "free";
  if (row.current_period_end && new Date(row.current_period_end).getTime() <= Date.now()) return "free";
  return isValidTier(row.tier) ? row.tier : "pro_plus";
}

export const PLAN_LABELS = { free: "Free", pro: "Pro", pro_plus: "Pro+" };

// ---------------------------------------------------------------------------
// The admin user list
// ---------------------------------------------------------------------------

const SUBSCRIPTION_COLUMNS =
  "clerk_user_id, plan, tier, status, billing_interval, current_period_end, razorpay_customer_id, razorpay_subscription_id, created_at";

/**
 * Every account in an audience, with its subscriptions row and current plan,
 * filtered - the one list behind the Users table, its CSV export and its KPIs.
 * Built from Clerk (the real accounts), newest first.
 *   search  - name, email or username contains it
 *   plan    - "pro_plus" | "pro" | "free" (current plan) | "paid" (either paid plan) | "all"
 *   role    - "admin" | "super_admin" | "user" | "all"
 *   startISO / endISO - joined in this window
 */
export async function getAdminUserList({ audience, search = "", plan = "all", role = "all", startISO, endISO }) {
  const [{ users }, subscriptionRows] = await Promise.all([
    getAudience(audience),
    fetchAllRows(() => supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS)),
  ]);
  const subById = new Map(subscriptionRows.map((row) => [row.clerk_user_id, row]));
  const needle = search.trim().toLowerCase();
  const start = startISO ? new Date(startISO).getTime() : null;
  const end = endISO ? new Date(endISO).getTime() : null;

  return users
    .map((clerkUser) => {
      const sub = subById.get(clerkUser.id) || null;
      return { clerkUser, sub, currentPlan: currentPlanOf(sub), role: getRole(clerkUser) || "user" };
    })
    .filter(({ clerkUser, currentPlan, role: userRole }) => {
      if (start !== null && clerkUser.createdAt < start) return false;
      if (end !== null && clerkUser.createdAt >= end) return false;
      if (plan === "paid" && currentPlan === "free") return false;
      if (plan !== "all" && plan !== "paid" && currentPlan !== plan) return false;
      if (role !== "all" && userRole !== role) return false;
      if (!needle) return true;
      const haystack = [
        clerkUser.firstName,
        clerkUser.lastName,
        clerkUser.username,
        ...(clerkUser.emailAddresses || []).map((e) => e.emailAddress),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
}

// ---------------------------------------------------------------------------
// Installs
// ---------------------------------------------------------------------------

// The one definition every admin (and dashboard) number uses: an install is one effect
// taken by one account on one UTC day - a row in install_unlocks, which is also what the
// daily limit counts - tagged with where it happened: "web" (copied on the website),
// "cli" or "mcp". Taking the same effect again that day isn't another install.
// Admins are never metered, so their installs have no ledger row; they're read from
// install_events (plan "admin") and counted the same way: once per effect per day.
export const INSTALL_SOURCES = ["web", "cli", "mcp"];

/**
 * Every install in [startISO, endISO) for an audience (or one account, `clerkUserId`,
 * filtered in the database), as
 * { clerkUserId, identityKey, effectSlug, source, day: "YYYY-MM-DD", at: ISO }, newest
 * first. Either bound may be null (open).
 */
export async function fetchInstalls({ startISO = null, endISO = null, audience, clerkUserId } = {}) {
  const startDay = startISO ? startISO.slice(0, 10) : null;
  const endDay = endISO ? endISO.slice(0, 10) : null;

  const [unlockRows, adminRows] = await Promise.all([
    fetchAllRows(() => {
      let q = supabase.from("install_unlocks").select("clerk_user_id, identity_key, effect_slug, source, usage_date, first_unlocked_at");
      if (clerkUserId) q = q.eq("clerk_user_id", clerkUserId);
      if (startDay) q = q.gte("usage_date", startDay);
      if (endDay) q = q.lt("usage_date", endDay);
      return q;
    }),
    fetchAllRows(() => {
      let q = supabase
        .from("install_events")
        .select("clerk_user_id, identity_key, effect_slug, source, occurred_at")
        .eq("plan", "admin")
        .eq("decision", "allowed");
      if (clerkUserId) q = q.eq("clerk_user_id", clerkUserId);
      if (startISO) q = q.gte("occurred_at", startISO);
      if (endISO) q = q.lt("occurred_at", endISO);
      return q;
    }),
  ]);

  const installs = unlockRows.map((row) => ({
    clerkUserId: row.clerk_user_id,
    identityKey: row.identity_key,
    effectSlug: row.effect_slug,
    source: row.source || "web",
    day: String(row.usage_date).slice(0, 10),
    at: row.first_unlocked_at || `${String(row.usage_date).slice(0, 10)}T00:00:00.000Z`,
  }));

  // Admin installs: the first of each (account, effect, day), oldest first
  const seen = new Set();
  for (const row of [...adminRows].sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)))) {
    const day = String(row.occurred_at).slice(0, 10);
    const key = `${row.clerk_user_id}|${row.effect_slug}|${day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    installs.push({ clerkUserId: row.clerk_user_id, identityKey: row.identity_key, effectSlug: row.effect_slug, source: row.source || "web", day, at: row.occurred_at });
  }

  const mine = audience ? installs.filter((row) => audience.includes(row.clerkUserId)) : installs;
  return mine.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
