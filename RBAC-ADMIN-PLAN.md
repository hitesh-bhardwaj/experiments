# RBAC for admin: Super Admin + Admin tiers

## Context

Today `isAdminUser()` in `apps/docs/src/lib/admin.js` is a flat boolean: any Clerk user with `publicMetadata.role === "admin"` (or matching `ADMIN_EMAIL`) gets identical, full access to every admin page and API route - user management, plan overrides, billing details, activity analytics, email logs, waitlist invites. There's no dedicated `users`/`roles` table; role lives entirely in Clerk's `publicMetadata`.

Goal: grow the team to 1 super admin + 2-3 regular admins, with a real capability split - not just role-management access.

**Decisions locked in:**
- **Super admin**: sees billing & revenue, can upgrade/downgrade users' plans, can grant/revoke admin & super-admin roles, and otherwise has full access - the superset of everything.
- **Admin**: can invite users off the waitlist, can view analytics, can view basic user details - but has **no authority to change a user's plan or role**, and **cannot see billing/previous-billing data** (Razorpay IDs, invoice history, subscription status, renewal dates).
- Email log access wasn't called out either way - this plan keeps it available to both tiers (it's operational/transactional log data, not billing or plan-control). Flag this if you want it super-admin-only too.
- `ADMIN_EMAIL` continues to seed the initial super admin automatically. The super admin then promotes the 2-3 others by hand.

## Permission matrix

| Capability | Super Admin | Admin |
|---|---|---|
| View user list - name, email, joined date, plan tier (Free/Pro) | Yes | Yes |
| View billing details - subscription status, renewal date, Razorpay customer/subscription IDs, invoice history | Yes | **No** |
| View aggregate billing & revenue (total revenue, MRR, Pro subscriber count) | Yes | **No** |
| Upgrade / downgrade a user's plan | Yes | **No** |
| View activity & analytics dashboards | Yes | Yes |
| View email send log | Yes | Yes *(not explicitly specified - see note above)* |
| Invite users off the waitlist | Yes | Yes |
| Grant / revoke admin or super-admin role | Yes | **No** |

## Design

**Role source stays Clerk `publicMetadata.role`**, a 3-value enum: `"super_admin"`, `"admin"`, or unset. No new table for roles themselves.

**Billing/revenue data already exists** - Supabase `subscriptions` (status, billing_interval, current_period_end, razorpay_customer_id, razorpay_subscription_id) and `invoices` (amount, currency, status, plan_label, is_test, created_at), both keyed by `clerk_user_id`. Same tables already power the user's own `/dashboard/invoicing` page (`apps/docs/src/app/api/dashboard/invoices/route.js`) - the admin "billing & revenue" view reuses this data rather than inventing new schema.

### 1. `apps/docs/src/lib/admin.js` - core role logic

```js
export const ROLES = { SUPER_ADMIN: "super_admin", ADMIN: "admin" };

export function getRole(user) {
  if (!user) return null;
  const metaRole = user.publicMetadata?.role;
  if (metaRole === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
  if (metaRole === ROLES.ADMIN) return ROLES.ADMIN;

  // Bootstrap fallback: only applies when metadata hasn't already set an
  // explicit role, so a super admin can later demote the ADMIN_EMAIL
  // account by giving it a metadata role of its own.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.emailAddresses?.[0]?.emailAddress === adminEmail) {
    return ROLES.SUPER_ADMIN;
  }
  return null;
}

export function isAdminUser(user) { return getRole(user) !== null; }
export function isSuperAdminUser(user) { return getRole(user) === ROLES.SUPER_ADMIN; }

export async function requireAdmin() { /* unchanged shape, uses isAdminUser - both tiers pass */ }
export async function assertAdmin() { /* unchanged shape, uses isAdminUser - both tiers pass */ }

// New - gates role management, plan changes, and billing/revenue.
export async function requireSuperAdmin() { /* currentUser() + isSuperAdminUser */ }
export async function assertSuperAdmin() { /* auth()+clerkClient() + isSuperAdminUser */ }
```

`assertAdmin()`/`requireAdmin()` keep passing for *either* tier, so routes that stay shared (activity, emails, waitlist invite, `dashboard/admin/layout.js`) need **no changes**.

### 2. Role management - super-admin only (unchanged from prior plan)

- **`apps/docs/src/app/api/admin/users/update-role/route.js`** (new, POST) - gated `assertSuperAdmin()`. Body `{ clerkUserId, role }`. Self-demotion guard: reject if `clerkUserId` is the requester's own ID.
- **`apps/docs/src/app/api/admin/me/route.js`** (new, GET) - returns `{ role }` for the current viewer, since the client can't compute the `ADMIN_EMAIL` fallback itself.
- **`apps/docs/src/lib/useAdminRole.js`** (new hook) - wraps `/api/admin/me`, returns `{ role, isAdmin, isSuperAdmin }`. Used by `DashboardShell.jsx` and the admin Users page.

### 3. Plan control + billing visibility - now super-admin only (new in this revision)

- **`apps/docs/src/app/api/admin/users/update-plan/route.js`**: change gate from `assertAdmin()` to `assertSuperAdmin()`. This is the "no authority to upgrade/downgrade" enforcement for regular admins.
- **`apps/docs/src/app/api/admin/users/route.js`** (GET, list users): still callable by both tiers (needed for "user details" access), but the response is now shaped by the *caller's* role:
  - Always included: `id, email, name, imageUrl, joinedAt, plan (free/pro), role (super_admin/admin/null)`.
  - Only included when caller `isSuperAdmin`: `status, billingInterval, planValidUntil, razorpayCustomerId, razorpaySubscriptionId`.
  - This is a server-side redaction (not just hidden in the UI), so a regular admin can't read billing data by calling the API directly.

### 4. Billing & Revenue view - new, super-admin only

- **`apps/docs/src/app/api/admin/revenue/overview/route.js`** (new, GET) - gated `assertSuperAdmin()`. Queries `invoices` (excluding `is_test`, filtered to paid/captured status) and `subscriptions` to return: total revenue, current-month revenue, active Pro subscriber count, and an estimated MRR (active yearly/monthly subscriptions normalized to monthly value).
- UI: a small stat-card row ("Total Revenue", "This Month", "Active Pro", "Est. MRR") added at the top of `apps/docs/src/app/(app)/dashboard/admin/page.js`, rendered only when `isSuperAdmin` - reuses the existing stat-card visual pattern already on that page (the "X users · Y Pro · Z Free" line).
- The existing per-user **Valid Until** and **Razorpay** table columns, plus the **Upgrade/Downgrade** action button, are now rendered only for `isSuperAdmin` viewers (backed by #3's server-side redaction, so this is UI-level hiding on top of an already-enforced boundary, not the only line of defense).

### 5. Admin (non-super) view of the Users page

- Sees: User, Joined, Plan (Free/Pro badge), Role badge - read-only, no billing columns, no action buttons.
- Keeps the existing **Invite** button and **Email Log** link (both still `assertAdmin()`-gated, unchanged).
- `dashboard/admin/activity/*` pages/routes: unchanged, still `assertAdmin()` - analytics stays available to both tiers per your spec.

### 6. `DashboardShell.jsx`

- Line 35's `user?.publicMetadata?.role === "admin"` check is replaced with the `useAdminRole()` hook so both tiers (and the `ADMIN_EMAIL` bootstrap account) correctly see the admin nav tabs.

## File change summary

| File | Change |
|---|---|
| `src/lib/admin.js` | Add `ROLES`, `getRole`, `isSuperAdminUser`, `requireSuperAdmin`, `assertSuperAdmin` |
| `src/lib/useAdminRole.js` | New - client hook for viewer's role |
| `src/app/api/admin/me/route.js` | New - returns viewer's role |
| `src/app/api/admin/users/update-role/route.js` | New - super-admin-only role grant/revoke, self-demotion guard |
| `src/app/api/admin/revenue/overview/route.js` | New - super-admin-only revenue/billing aggregate |
| `src/app/api/admin/users/route.js` | Add `role` field; redact billing fields unless caller is super admin |
| `src/app/api/admin/users/update-plan/route.js` | Gate changed: `assertAdmin` → `assertSuperAdmin` |
| `src/app/(app)/dashboard/admin/page.js` | Role column + super-admin-only role controls; revenue stat cards; billing columns/actions hidden for admins |
| `src/components/Dashboard/DashboardShell.jsx` | Use `useAdminRole()` instead of the direct `publicMetadata` check |
| `src/app/(app)/dashboard/admin/layout.js`, `activity/*`, `emails/*`, `waitlist/invite/*` | No changes - stay on `assertAdmin()`/`requireAdmin()` |

## Rollout (operational, not code)

1. Ship the change - the existing `ADMIN_EMAIL` account automatically becomes `super_admin` via the fallback in `getRole()`.
2. That super admin opens `/dashboard/admin`, uses the new per-row "Make Admin" action to promote the 2-3 other people.
3. Optional, for resilience: promote one trusted second person to `super_admin` too, so role management/billing access isn't stranded on a single account.

## Verification (once implemented)

- `pnpm --filter @hyperiux/docs lint` and a local `next dev --webpack` run.
- As super admin: confirm revenue stat cards render, Valid Until/Razorpay columns and Upgrade/Downgrade buttons are visible and functional, and role controls work (including the self-demotion block).
- As a promoted `admin`: confirm the Users table shows no billing columns/actions, `/api/admin/users` response has no billing fields, a direct POST to `update-plan` and `update-role` both 403, but Activity, Email Log, and Invite all still work.
- Confirm `DashboardShell` shows admin nav tabs correctly for both tiers and hides them for non-admins.

---

## Role KRAs (Key Result Areas)

### Super Admin
- **Revenue & billing ownership** - monitors the billing/revenue dashboard (total revenue, MRR, active Pro count) and per-user billing records (subscription status, renewal dates, Razorpay IDs); the single source of truth for "what are we actually earning."
- **Plan lifecycle authority** - sole role that can upgrade or downgrade a user's plan (comp Pro access, revoke access, handle billing exceptions).
- **Admin governance** - grants, promotes, or revokes admin/super-admin access for the rest of the team; accountable for who holds elevated access at any time.
- **Full operational oversight** - inherits every admin capability (analytics, user details, waitlist invites, email log) plus the above, and is the escalation point for anything outside a regular admin's authority.

### Admin
- **User support & visibility** - looks up user details (name, email, plan tier, join date) to answer support questions, without exposure to billing/payment data.
- **Onboarding** - invites users off the waitlist.
- **Product monitoring** - watches activity/analytics dashboards for usage trends or anomalies and flags issues upward.
- **Explicitly out of scope** - cannot change a user's plan, cannot view billing/invoice history or revenue figures, cannot grant/revoke admin access; these are escalated to a super admin.
