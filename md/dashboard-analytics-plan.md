# Dashboard analytics - what exists, what to build next

*Planning memo - hyperiux-pro-components / apps/docs - draft, not yet started*

A working plan for adding activity graphs and charts to the admin and user dashboards, grounded in the tables and rows that actually exist in Supabase today. Nothing here is built yet - this is the proposal to react to before anything gets scoped.

**At a glance:** 33 users on file · 4 tables in production · no charts anywhere yet

---

## 1. Admin dashboard - what's there today

Two pages, both list-and-manage screens. No summary view, no charts, nothing that answers "how's the business doing" at a glance.

- **`/dashboard/admin`** - User table with search, plan filter, 10/page pagination. Upgrade/downgrade toggle writes to Supabase and Clerk's `publicMetadata` in one call. Invite-by-email modal (creates a real Clerk invitation).
- **`/dashboard/admin/emails`** - Sent-email log with type/status filters, 10/page pagination, HTML preview modal. Waitlist-invite rows now show Clerk's live invitation status (pending/accepted/revoked), not just delivery success.

## 2. User dashboard - what's there today

Three pages. The overview already has stat cards and a vault-access panel - no charts, but the bones for some are there.

- **`/dashboard`** - Stat cards: saved count, joined date, plan, effects access (X of Y), plan validity. Vault-access panel with billing cycle + renewal date for Pro. CLI token manager below.
- **`/dashboard/saved`** - Flat list of wishlisted effects. No grouping, sorting, or breakdown by category.
- **`/dashboard/settings`** - Profile fields, password change/reset flow, CLI token controls.
- **Copy limit (new)** - 3/day free, 10/day Pro, tracked in `copy_usage`. Built this session, not yet surfaced as a stat anywhere in the UI.

## 3. What data actually exists

Every chart idea below is checked against this list. Four Supabase tables, nothing else - no events table, no view counts, no payment history. Pulled live just now, so these are real current numbers, not placeholders.

| Table | Rows | Key fields | Notable |
|---|---|---|---|
| `subscriptions` | 33 | clerk_user_id, plan, status, billing_interval, created_at | 18 pro / 15 free · 12 monthly / 4 yearly · 1 cancelled |
| `wishlisted_effects` | 31 | clerk_user_id, effect_slug, category | 11 distinct categories saved into |
| `sent_emails` | 193 | email_type, status, recipient_email, sent_at | 22 distinct types (several are dev "temp_*_test" noise) |
| `copy_usage` | 5 | clerk_user_id, usage_date, copy_count | New this session - too young to chart a trend yet |

## 4. Vercel Analytics - what it can and can't give us

`@vercel/analytics` and `@vercel/speed-insights` are already installed and mounted in the root layout - pageviews and web vitals are being collected right now.

> **The catch:** Vercel doesn't expose that data through a queryable API on standard plans - it only lives in Vercel's own dashboard UI. There's no way to pull it into a chart on `/dashboard/admin` without an Enterprise data-export agreement.
>
> **Recommendation:** keep it exactly as-is for traffic/performance monitoring, viewed directly on vercel.com. For anything we want charted inside our own admin dashboard - effect views, copy events, signup funnels - we need first-party tracking into Supabase, which is what most of the "needs tracking" items below are proposing.

## 5. Proposed - admin dashboard

Ordered roughly by effort. Each item is tagged by whether the data already exists, needs a new table, or needs new tracking added to the app first.

| Idea | Status | What it shows | Source |
|---|---|---|---|
| Plan split | 🟢 have data | Free vs. Pro donut on a new admin overview page (replacing the user list as landing screen); billing-interval breakdown as a secondary stat | `subscriptions.plan`, `.status` |
| Signups over time | 🟢 have data | Daily signup count, line/area chart with 7d/30d/all toggle | `subscriptions.created_at` |
| Email deliverability | 🟢 have data | Success/fail split per email type - spot a spike in failed password-reset or verification emails without filtering the log by hand | `sent_emails.email_type`, `.status` |
| Invitation funnel | 🟢 have data | Sent → pending → accepted → revoked/expired. The Clerk-sync work from this session already computes this per-row; this just aggregates it | `sent_emails` (waitlist_invite) + live Clerk invitation status |
| Top saved effects | 🟢 have data | Which effects/categories get wishlisted most - a real signal for what to feature or expand, no new tracking needed | `wishlisted_effects.category`, `.effect_slug` |
| Copy-limit pressure | 🟢 have data | Share of free/Pro users actually hitting their daily cap - answers "are 3/day and 10/day right" instead of guessing | `copy_usage.copy_count` (only 5 rows now, more meaningful in a week or two) |
| CLI adoption | 🟢 have data | Count of users with an active CLI token + "last used" recency histogram | `subscriptions.cli_token_hash`, `.cli_token_last_used_at` |
| Revenue / MRR | 🟡 needs table | Cumulative revenue and MRR-over-time. Razorpay has this, but nothing lands in Supabase over time - the webhook only ever writes *current* subscription state | new `payments` table, written from the existing Razorpay webhook handler |
| Admin activity log | 🟡 needs table | Who upgraded/downgraded/invited whom, and when. A plan change today just overwrites the row with no history | new `admin_activity_log` table, written from update-plan and invite routes |
| Effect engagement | 🔴 needs tracking | Most-viewed effects, view-to-copy conversion, drop-off between preview and install. The biggest gap - nothing today records that an effect page was even opened | new `effect_events` table + a fire-and-forget beacon on the detail page |

## 6. Proposed - user dashboard

Smaller in scope - this is one person's own activity, not aggregate stats, so most of it is a single stat or a small chart rather than a full page.

| Idea | Status | What it shows | Source |
|---|---|---|---|
| Today's copy usage | 🟢 have data | "2 of 3 copies used today" as a small ring on the overview page, next to the existing stat cards - surfaces the limit feature proactively instead of only reactively at the wall | `copy_usage` (already queried client-side by `useCopyLimit`) |
| Saved effects by category | 🟢 have data | Donut on `/dashboard/saved` above the flat list, so someone with 20+ saved effects can see their own pattern at a glance | `wishlisted_effects.category`, scoped to the signed-in user |
| Billing history | 🟡 needs table | Past invoices/receipts list on Settings. Same gap as the admin revenue chart - needs the `payments` table first, then this is just a filtered view of it | same `payments` table proposed for admin |
| Personal activity trend | 🔴 needs tracking | "Effects you viewed this week" - a light, single-user version of the admin engagement chart | `effect_events`, filtered by `clerk_user_id` |

## 7. Charting library

Nothing's installed yet. Every chart in the app today is hand-rolled Tailwind/SVG, not a component library - the choice should fit that, not fight it.

- **Recharts - recommended.** Composable React components, renders to SVG so it themes with plain CSS variables - drops straight into the existing dark-mode Tailwind setup. Small enough footprint for a handful of dashboard charts.
- **Tremor - considered, passed.** Faster to a finished-looking dashboard, but it's a full pre-styled component kit with its own design opinions - fighting it to match Hyperiux's existing look would cost more than it saves.
- **visx - considered, passed.** Airbnb's low-level primitives - full control, but every chart here (donut, sparkline, funnel, gauge) is standard enough that it's more code for no real design upside over Recharts.

## 8. Suggested build order

Grouped by what they depend on, not by which dashboard they're in - phase 1 ships without touching the schema at all.

**Phase 1 - chart what already exists** *(no new tables)*
- Admin overview page: plan split, signups line, email deliverability, invitation funnel, top saved effects
- User overview: today's copy-usage ring
- User `/dashboard/saved`: category donut
- Install Recharts, build 3–4 reusable chart primitives styled to match the app

**Phase 2 - first-party event tracking** *(one new table)*
- `effect_events` table + beacon on the effect detail page (view, copy, install-command-copy)
- Admin: effect engagement / most-viewed chart
- User: personal activity trend

**Phase 3 - money and accountability** *(two new tables)*
- `payments` table, written from the existing Razorpay webhook
- Admin: revenue/MRR chart. User: billing history
- `admin_activity_log` table, written from update-plan and invite routes

## 9. Before this gets finalized

1. Revenue is already visible in Razorpay's own dashboard - is an in-app MRR chart actually worth the new table, or is phase 3's revenue piece skippable?
2. Effect-view tracking (phase 2) is the biggest net-new investment here - worth doing now, or worth waiting until there's more traffic for it to say something meaningful?
3. Should the admin overview replace the user list as the default landing page at `/dashboard/admin`, or sit alongside it as a new tab?
4. Any metric missing from this list that matters more than what's here?
