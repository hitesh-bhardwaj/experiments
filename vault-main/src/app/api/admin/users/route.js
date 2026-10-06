import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getRole, isSuperAdminUser } from "@/lib/admin";
import { resolveDateBounds } from "@/lib/admin-activity";

const DEFAULT_LIMIT = 10;
// Clerk's own /users list endpoint caps `limit` per request at 500 - also
// used as the batch size when resolving a page of clerk_user_ids from
// Supabase back into full Clerk profiles.
const MAX_LIMIT = 500;

const SUBSCRIPTION_COLUMNS =
  "clerk_user_id, plan, status, billing_interval, current_period_end, razorpay_customer_id, razorpay_subscription_id, created_at";

// "Most Copies"/"Most Installs"/"Most Saves" sort by a count that lives in a
// different table than `subscriptions`, and role lives only in Clerk
// metadata, not in Supabase at all - none of these can be pushed into a
// Supabase `.order()`/`.eq()`. Whenever any is active, this bounds how many
// matching rows get pulled into JS to sort/filter by hand. Acceptable at
// this product's current scale; a real SQL-side aggregate (or mirroring
// role into Supabase) would be needed past this many matching users.
const BROAD_FETCH_CAP = 2000;
const SORT_OPTIONS = new Set(["copies", "installs", "saves"]);
const ROLE_OPTIONS = new Set(["admin", "super_admin", "user"]);

function countByUser(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.clerk_user_id, (counts.get(row.clerk_user_id) || 0) + 1);
  }
  return counts;
}

// Lifetime copy/install/save totals for exactly this page's users - all-
// time, matching the same numbers already shown on the per-user Activity
// Detail page, not scoped to the table's own joined-date filter (that
// filter is about who's in the list, not how much of the site's history
// counts).
// "Copies" means the website's copy button specifically (source='web'),
// same convention as everywhere else "copies" is used (Overview's Total
// Copies, the per-user page, "Top users by copies"). "Installs" is
// unscoped by source (web/CLI/MCP combined) - same as the per-user page's
// "Installed Effects" and the Overview's "Top installed effects" - so it's
// always >= copies, since every web copy is itself an install_unlocks row.
async function countsForIds(ids) {
  if (!ids.length) {
    return { copiesById: new Map(), installsById: new Map(), savesById: new Map() };
  }

  const [{ data: copyRows }, { data: installRows }, { data: saveRows }] = await Promise.all([
    supabase.from("install_unlocks").select("clerk_user_id").eq("source", "web").in("clerk_user_id", ids),
    supabase.from("install_unlocks").select("clerk_user_id").in("clerk_user_id", ids),
    supabase.from("wishlisted_effects").select("clerk_user_id").in("clerk_user_id", ids),
  ]);

  return {
    copiesById: countByUser(copyRows || []),
    installsById: countByUser(installRows || []),
    savesById: countByUser(saveRows || []),
  };
}

// Clerk's getUserList caps `userId` filters at its own `limit` ceiling
// (MAX_LIMIT) per call - chunks larger id lists into parallel calls and
// merges the results, so callers never have to think about that ceiling.
async function getClerkUsersByIds(clerk, ids) {
  if (!ids.length) return [];

  const chunks = [];
  for (let i = 0; i < ids.length; i += MAX_LIMIT) {
    chunks.push(ids.slice(i, i + MAX_LIMIT));
  }

  const results = await Promise.all(
    chunks.map((chunk) => clerk.users.getUserList({ userId: chunk, limit: chunk.length }))
  );

  return results.flatMap((r) => r.data || []);
}

function roleFilterMatches(clerkUser, roleFilter) {
  const role = getRole(clerkUser) || "user";
  return role === roleFilter;
}

function shapeUser(clerkUser, sub, viewerIsSuperAdmin, copiesById, installsById, savesById) {
  const role = getRole(clerkUser);

  const base = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
    name: clerkUser.fullName || clerkUser.firstName || null,
    imageUrl: clerkUser.imageUrl || null,
    joinedAt: clerkUser.createdAt || sub?.created_at || null,
    plan: sub?.plan || "free",
    role,
    isAdmin: role !== null,
    copiesCount: copiesById.get(clerkUser.id) || 0,
    installsCount: installsById.get(clerkUser.id) || 0,
    savesCount: savesById.get(clerkUser.id) || 0,
  };

  // Billing/payment detail is super-admin only - a regular admin gets user
  // identity + plan tier but no subscription status, renewal date, or
  // Razorpay IDs, enforced here rather than only hidden in the UI.
  if (!viewerIsSuperAdmin) return base;

  return {
    ...base,
    status: sub?.status || "inactive",
    billingInterval: sub?.billing_interval || null,
    planValidUntil: sub?.current_period_end || null,
    razorpayCustomerId: sub?.razorpay_customer_id || null,
    razorpaySubscriptionId: sub?.razorpay_subscription_id || null,
  };
}

function fallbackClerkUser(clerkUserId) {
  return {
    id: clerkUserId,
    emailAddresses: [],
    fullName: null,
    firstName: null,
    imageUrl: null,
    createdAt: null,
    publicMetadata: {},
  };
}

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clerk = await clerkClient();
  const viewer = await clerk.users.getUser(userId);
  if (getRole(viewer) === null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const viewerIsSuperAdmin = isSuperAdminUser(viewer);

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();
    const planFilter = searchParams.get("plan") || "all";
    const rawRole = searchParams.get("role") || "all";
    const roleFilter = ROLE_OPTIONS.has(rawRole) ? rawRole : "all";
    const joinedRange = searchParams.get("joined") || "all";
    const joinedFrom = searchParams.get("joinedFrom");
    const joinedTo = searchParams.get("joinedTo");
    const rawSort = searchParams.get("sort") || "newest";
    const sortBy = SORT_OPTIONS.has(rawSort) ? rawSort : "newest";
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    const { startISO, endISO } = resolveDateBounds({
      range: joinedRange,
      from: joinedFrom,
      to: joinedTo,
    });

    // Text search has to run against Clerk - name/email live there, not in
    // Supabase. Clerk's own `query` param searches its FULL user base
    // (first name, last name, email, username, phone, web3 wallet) with
    // real pagination and an accurate totalCount, unlike fetching a bounded
    // window of subscriptions and filtering client-side afterward (the old
    // bug: search only ever looked at the most recently created rows, so
    // anyone outside that window was invisible - not "no results", just
    // silently never checked).
    if (search) {
      const clerkParams = { query: search, limit, offset, orderBy: "-created_at" };
      if (startISO) clerkParams.createdAtAfter = new Date(startISO).getTime();
      if (endISO) clerkParams.createdAtBefore = new Date(endISO).getTime();

      const { data: clerkUsers, totalCount } = await clerk.users.getUserList(clerkParams);
      const ids = clerkUsers.map((u) => u.id);

      const [{ data: subRows }, { copiesById, installsById, savesById }] = await Promise.all([
        ids.length
          ? supabase.from("subscriptions").select(SUBSCRIPTION_COLUMNS).in("clerk_user_id", ids)
          : Promise.resolve({ data: [] }),
        countsForIds(ids),
      ]);
      const subMap = Object.fromEntries((subRows || []).map((s) => [s.clerk_user_id, s]));

      let users = clerkUsers.map((u) =>
        shapeUser(u, subMap[u.id], viewerIsSuperAdmin, copiesById, installsById, savesById)
      );

      // Plan and role can't be pushed into Clerk's query (plan lives only
      // in Supabase; Clerk's List Users endpoint has no "filter by
      // metadata value" param) - applied as a post-filter on this page
      // when combined with search, which can return fewer than `limit`
      // rows on that page. Search alone, and either filter alone, are both
      // fully accurate; this is a narrow, documented tradeoff for the rarer
      // combination of search plus one of these filters at once.
      if (planFilter !== "all") {
        users = users.filter((u) => u.plan === planFilter);
      }
      if (roleFilter !== "all") {
        users = users.filter((u) => (u.role || "user") === roleFilter);
      }

      return NextResponse.json({ users, total: totalCount });
    }

    // No search text. Role lives only in Clerk, and "Most Copies"/"Most
    // Installs"/"Most Saves" sort by a count that lives outside
    // `subscriptions` entirely - none of these can be expressed as a
    // Supabase `.eq()`/`.order()`. Whenever either is active, pull every
    // matching subscription row up to the fetch cap, resolve all of their
    // Clerk profiles up front, filter/sort in JS, then paginate the result.
    // Otherwise (the common case - no role filter, default sort) stay on
    // cheap direct DB pagination.
    const needsBroadFetch = sortBy !== "newest" || roleFilter !== "all";

    if (needsBroadFetch) {
      let broadQuery = supabase
        .from("subscriptions")
        .select(SUBSCRIPTION_COLUMNS)
        .order("created_at", { ascending: false })
        .range(0, BROAD_FETCH_CAP - 1);

      if (planFilter !== "all") broadQuery = broadQuery.eq("plan", planFilter);
      if (startISO) broadQuery = broadQuery.gte("created_at", startISO);
      if (endISO) broadQuery = broadQuery.lt("created_at", endISO);

      const { data: allSubs, error: broadError } = await broadQuery;

      if (broadError) {
        console.error("ADMIN_USERS_SUPABASE_ERROR:", broadError);
        return NextResponse.json({ error: broadError.message }, { status: 500 });
      }

      const allIds = (allSubs || []).map((s) => s.clerk_user_id).filter(Boolean);
      const allClerkUsers = await getClerkUsersByIds(clerk, allIds);
      const clerkMap = Object.fromEntries(allClerkUsers.map((u) => [u.id, u]));

      let combined = (allSubs || []).map((sub) => ({
        sub,
        clerkUser: clerkMap[sub.clerk_user_id] || fallbackClerkUser(sub.clerk_user_id),
      }));

      if (roleFilter !== "all") {
        combined = combined.filter(({ clerkUser }) => roleFilterMatches(clerkUser, roleFilter));
      }

      // True total among the fetched candidates - if a filter's real match
      // count extends past BROAD_FETCH_CAP, this (like the cap itself)
      // undercounts at the tail rather than ever miscounting the visible
      // page.
      const totalCount = combined.length;

      if (sortBy !== "newest") {
        const ids = combined.map((c) => c.sub.clerk_user_id).filter(Boolean);
        const { copiesById, installsById, savesById } = await countsForIds(ids);
        const countMap =
          sortBy === "copies" ? copiesById : sortBy === "installs" ? installsById : savesById;

        combined.sort(
          (a, b) => (countMap.get(b.sub.clerk_user_id) || 0) - (countMap.get(a.sub.clerk_user_id) || 0)
        );
      }

      const pageCombined = combined.slice(offset, offset + limit);
      const pageIds = pageCombined.map((c) => c.sub.clerk_user_id).filter(Boolean);
      const { copiesById, installsById, savesById } = await countsForIds(pageIds);

      const users = pageCombined.map(({ sub, clerkUser }) =>
        shapeUser(clerkUser, sub, viewerIsSuperAdmin, copiesById, installsById, savesById)
      );

      return NextResponse.json({ users, total: totalCount });
    }

    // No search text, no role filter, default sort - Supabase is the real
    // source of truth for the full user list (every signup gets a row via
    // the Clerk user.created webhook, see api/webhooks/clerk/route.js), so
    // paginate and count directly against it instead of ever bounding to a
    // fixed recent window.
    let query = supabase
      .from("subscriptions")
      .select(SUBSCRIPTION_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (planFilter !== "all") query = query.eq("plan", planFilter);
    if (startISO) query = query.gte("created_at", startISO);
    if (endISO) query = query.lt("created_at", endISO);

    const { data: subscriptions, count, error } = await query;

    if (error) {
      console.error("ADMIN_USERS_SUPABASE_ERROR:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const clerkUserIds = (subscriptions || []).map((s) => s.clerk_user_id).filter(Boolean);

    const [clerkUsers, { copiesById, installsById, savesById }] = await Promise.all([
      getClerkUsersByIds(clerk, clerkUserIds),
      countsForIds(clerkUserIds),
    ]);

    const clerkMap = Object.fromEntries(clerkUsers.map((u) => [u.id, u]));

    const users = (subscriptions || []).map((sub) => {
      // A subscriptions row with no matching Clerk profile (deleted
      // account, or a lookup hiccup) still renders as a row instead of
      // crashing the whole page.
      const clerkUser = clerkMap[sub.clerk_user_id] || fallbackClerkUser(sub.clerk_user_id);

      return shapeUser(clerkUser, sub, viewerIsSuperAdmin, copiesById, installsById, savesById);
    });

    return NextResponse.json({ users, total: count || 0 });
  } catch (error) {
    console.error("ADMIN_USERS_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
