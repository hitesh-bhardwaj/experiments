# Dashboard v2 – implementation tracker

The user and admin dashboards at `/dashboard/{username}/…`, rebuilt from two design mockups (user "Your account" and "Admin" HTML pages; removed from the repo once built – they held real customer data).
Rules: STYLE_GUIDE.md type scale, square corners, tokens; nav stays as our tab row (no mockup sidebar); our avatar + ProfileDropdown instead of the mockup's avatar.

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | User dashboard lives at `/dashboard/{username}/…` (was the Clerk ID at first, see iteration 1.3) (overview, saved, templates, usage, invoicing, settings) | Requested |
| D2 | Admin view lives at `/dashboard/{username}/admin/…` (activity, users, invoicing) | Route not specified; keeps one shell and lets the toggle be a link |
| D3 | Old URLs (`/dashboard`, `/dashboard/saved`, `/dashboard/admin/…`) redirect in `proxy.js` to the signed-in user's own path | Bookmarks, emails, Razorpay `successHref` keep working |
| D4 | `[userId]` layout redirects to your own ID if the URL has someone else's | A URL can't open another user's dashboard |
| D5 | User / Admin toggle sits at the end of the tab row, admins only; its state is the URL (`/admin` or not) | Requested; no client state to drift |

## Iteration 1 – break the ice (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Move mockups out of `public/` to `design/dashboard-v2/` (gitignored); later deleted | done | Real emails + payment IDs in the admin mockup |
| Screenshot mockups for reference | done | scratchpad `mk-*.png` |
| Routes: pages moved under `dashboard/[userId]/`; old admin root → `admin/users`; `admin/page.js` → Activity | done | `git mv`, history kept |
| Legacy + wrong-ID redirects | done | `src/proxy.js` (`dashboardRedirect`), verified `/dashboard`, `/dashboard/saved`, `/dashboard/admin` |
| Hard gate: URL ID must be yours | done | `dashboard/[userId]/layout.js`; admin gate in `[userId]/admin/layout.js` |
| Route helper + context | done | `components/Dashboard/dashboardRoutes.js`, `DashboardContext.jsx` (`useDashboard().path()`, `DashboardHeroAside`) |
| Shell: breadcrumb, Browse Effects + our ProfileDropdown, per-tab header with right slot, tab row, User/Admin switch | done | `DashboardShell.jsx`; dropdown data via new `layout/useAccountSummary.js` (shared with VaultHeader) |
| ProfileDropdown + in-page links use user-scoped paths | done | ProfileDropDown, admin users/emails/activity/invoicing, user invoicing |
| Overview in new design | done | `[userId]/page.js`: today ring, plan card w/ term bar, credits coins, 3 stats + sparklines, token card, recent activity, recently saved |
| `/api/dashboard` additions | done | todayCount, recentActivity, recentlySaved, 30-day series, creditsPerYear. **Installed now = CLI+MCP only** (was web+CLI+MCP), matches mockup + admin split |
| Saved effects with EffectCard | done | tier / category / sort filters, count in header |
| My templates with TemplateCard | done | credits in header + banner, Yours + Saved grids; `lib/template-shots.js` shared with `/templates` |
| Shared UI | done | `DashboardUI.jsx` (CARD, SourceChip, Segmented, CardLink), `Sparkline.jsx`, `RingMeter.jsx` |
| Removed duplicate in-page h1s | done | usage, invoicing, admin activity/users/invoicing |
| Fixed wrong copy | done | CliTokenManager said Pro = 10/day (Pro is 5, Pro+ 10) |
| Dev preview `admin` mode | done | cookie `vault-dev-preview=admin`, preview URL `/dashboard/preview` |
| Verify | done | lint clean, 316 tests pass, Playwright 1440 + 390 (user + admin) |

## Iteration 1.1 – overview feedback (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Full site VaultHeader on the dashboard (as other vault pages), `pt-32` hero | done | `DashboardShell.jsx` |
| Removed the Browse Effects button + duplicate profile dropdown from the dashboard row | done | VaultHeader already has the profile |
| View as User / Admin → the sliding toggle (`DarkSegment`), moved out of TemplatesListing into a shared component | done | `components/ui/DarkSegment.jsx` |
| Admins / super admins: no Today ring, no plan card, no template credits card | done | `isAdmin` now in DashboardContext |
| Template credit coins square (overview + My templates) | done | |
| Stat cards: trend lines removed | done | `Sparkline.jsx` deleted; `series` dropped from `/api/dashboard` |
| Token generated → centred dialog "Copy this token now. It won't be shown again." with Copy | done | `CliTokenManager.jsx`, shared `Modal` |
| Recently saved: list, image left, name / category · saved ago / tier right (5 rows) | done | `recentlySaved` now has `savedAt` |
| Dashboard fills the workspace's `min-h-[200vh]` (no dark band under a short sheet) | done | |
| Verify | done | lint clean, tests pass, Playwright 1440 + 390, token dialog via mocked API |
| View as toggle at the standard button size (41px, same text as the tabs) | done | `DarkSegment` gets a `buttonSize` option; templates hero unchanged |
| Recently saved: no Free tag, small Pro tag on the image, `border-white/20` around the image, at most 4 | done | API + preview sample trimmed to 4 |
| Token dialog: button removed (token + Copy only) | done | |
| Route shape | done | **Username instead of ID**: `/dashboard/{username}/{tab}` (`dashboardUsername` in `lib/user-slug.js`: Clerk username → full name → email local part, slugified; tab names get `-user`). Folder `[userId]` → `[username]`. Layout redirects any other name to yours; proxy maps old ID-less URLs (one Clerk lookup, only on those) |

## Iteration 1.3 – filters, usernames (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Token dialog: token wraps (no scroll), white | done | `CliTokenManager.jsx` |
| "Using an AI editor? Connect Vault over MCP with the same token." under the example, MCP → `/docs/mcp` | done | |
| Shared light slider + column icons out of EffectsListing | done | `components/ui/SlidingSegment.jsx` (`SlidingSegment`, `COLUMN_ITEMS`) |
| Shared light chip styles + template catalogues | done | `templates/tokens.js` (`LIGHT_CHIP*`, `CATALOGUES`) |
| Date range picker: light tone, placeholder, clear (×) | done | `components/admin/DateRangeCalendarPicker.jsx`; admin pages unchanged (dark default) |
| Saved effects: All/Free/Pro slider, sort in FilterMenu (Recently saved / Oldest / A–Z / Z–A), Date saved range, 2/3 columns, category chips with counts | done | `[username]/saved/page.js`; old `Segmented` removed |
| My templates: industry chips, catalogue FilterMenu (Selected / Pro+ Only), "Date bought or saved" range | done | `MyTemplates.jsx`; saved dates from `/api/wishlist-templates` |
| Verify | done | lint clean, 316 tests, Playwright (filters, date panel, 2 cols, token dialog), redirects via curl |

## Iteration 1.4 – links, date presets, grid motion (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Dashboard links = the FAQ "View More" LinkButton (underline + rolling label) with a sideways arrow; no shimmer | done | `CardLink` in `DashboardUI.jsx`; LinkButton gets opt-in `arrowRight` + `colorClassName` (defaults unchanged) |
| MCP + "Upgrade to Pro" links orange with the link animation | done | `CardLink tone="accent"` in `CliTokenManager.jsx` |
| Date filter = dropdown of All time / Today / Last 7 / 30 / 90 days / Custom range (calendar only for custom), like admin Activity | done | `DateRangeFilter` + `resolveDateRange` in `DashboardUI.jsx`; Saved + My templates |
| Grid re-flow animates like /effects (motion `layout`, 0.5s) | done | `CARD_LAYOUT_TRANSITION` now exported once from `EffectCard.jsx` (effects + templates listings import it); Saved + My templates cards wrapped in `motion.div` |
| Verify | done | lint, 316 tests, Playwright (links, date menu, custom calendar, sampled card glide 483→353px over ~0.4s) |

## Iteration 2 – Usage, Invoicing, Settings (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| All user tabs on the light sheet | done | `dashboardRoutes.js` (`light: true`) |
| `/api/dashboard/usage`: `events` (every unlock with time, newest first, max 500) + `daily` (30 UTC days by source) | done | `copiedEffects` kept for compatibility |
| Usage: dark Today meter (ring, x / limit, reset time, upsell link), Last 30 days stacked bars (web/CLI/MCP, dashed daily limit), history table (search, source slider, date dropdown, 8 a page, Copy command) | done | `[username]/usage/page.js`, `components/Dashboard/UsageBars.jsx`; Copy command claims through the cards' `copyInstall` (counts like every other copy) |
| `/api/dashboard/invoices` returns `tier` | done | comment about is_test corrected |
| Invoicing: dark current-plan card (status, renews, cycle, last payment, payment), next-plan upsell (Pro for free, Pro+ for Pro, none for Pro+) with real prices/limits from `plans.js`, one Receipts list (subscriptions + templates) | done | `[username]/invoicing/page.js`; unused PDF receipt helper removed (`jspdf` now unused – remove from package.json?) |
| Settings: sticky section list; Profile (photo upload/remove, names, email), Password (change + emailed code reset), Sign-in methods (email/password + linked Google/GitHub from Clerk) | done | all existing handlers kept; restyled with `SubmitButton`, `FIELD`, `PasswordField` |
| Not built (no backend yet): email preferences, download my data, delete account, connect/disconnect providers, cancel subscription | skipped | need APIs + product decisions |
| Shared UI | done | `DashboardUI.jsx`: `SubmitButton`, `FIELD`/`FIELD_LABEL`, `DetailRows`, `Pager` |
| Dev preview | done | `sampleUsage`, `sampleInvoices`, `samplePreviewUser` |
| Verify | done | lint, 478 tests, Playwright 1440 (+390) |

## Iteration 2.1 – feedback (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Token example: npm / pnpm / yarn / bun switch (site-wide choice from `lib/package-manager`, shared with code blocks) + Copy with the code-block animation | done | `ExampleCommand` in `CliTokenManager.jsx` |
| Overview: Saved + one **Installations** card with Web / CLI / MCP; admins get a dark **Daily usage: Unlimited** card | done | `/api/dashboard` now returns `cliCount` + `mcpCount` (`installedCount` removed) |
| Usage: no Today card for admins (chart full width) | done | loading state assumes a limit, so the card doesn't pop in |
| Usage chart accuracy: built from the same events as the table, in **local** days (was UTC – evening installs in India landed on the previous day vs the table); dates under their own bars; busiest-day value on the scale | done | `daily` removed from `/api/dashboard/usage` |
| Usage table: Copy uses `CopyButtonContent` (code-block icon + label flip) | done | |
| Settings: Upload = orange button with upload icon; Remove = outlined button with bin icon | done | `ACTION_PRIMARY` / `ACTION_LINE` in `DashboardUI.jsx` |
| Settings: Sign-in methods removed; **Email** (Product updates toggle – real, Resend audience; Account & billing always on) and **Privacy & data** (Download my data – JSON download; Delete account – request to the team, confirmed in a dialog) | done | new APIs: `/api/user/email-preferences` (GET/POST), `/api/user/export` (GET), `/api/user/delete-request` (POST; emails `RESEND_FROM_EMAIL` + confirmation to the user; no automatic deletion yet) |
| Fix: hydration error "div inside p" from `LinkButton` inside sentences | done | LinkButton's inner divs → spans with the same display classes |
| Verify | done | lint, 478 tests, Playwright (overview pro/admin, pm switch, admin usage, settings), console clean |

## Iteration 2.2 – feedback + admin start (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| **Admin installs were never recorded** (admins skip the limit claim, so no ledger row and no event) → admin usage graph/table and overview counts were empty | fixed | `lib/install-limit.js` now logs an `install_events` row for admins (plan `admin`, reason `admin`; still no claim/limit). `/api/dashboard` + `/api/dashboard/usage` read those for admins. History starts now. `/api/admin/installs` limit analysis excludes plan `admin`. Test updated |
| `/api/dashboard/usage` simplified | done | returns `events` (+ count); unused `copiedEffects` removed |
| Usage chart readable: number scale + gridlines, dates centred under their own bar (fewer, evenly spaced; every other one on phones), red dashed daily-limit line, hover/focus tooltip (date, total, web/CLI/MCP) | done | `UsageBars.jsx` rewritten |
| Usage chart follows the date filter (default last 30 days; custom up to 180 days); filter moved to the top, drives chart + table; Today and chart cards 50/50 | done | |
| Overview: admin order Daily usage → Installations → Saved (users keep Saved first); every stat card label top / number middle / caption bottom (justify-between) | done | |
| Skeletons: whole cards while loading (Overview, Usage, Invoicing) | done | no inline text skeletons left there |
| Saved: 2/3 grid follows the sidebar like /effects (3 closes it, opening it drops to 2); count removed from hero; categories → dropdown beside the sort menu | done | new shared `hooks/useGridColumns.js` (EffectsListing uses it too) |
| My templates: credits removed from hero; industries → dropdown beside the catalogue menu; "Yours" heading removed | done | banner kept |
| Invoicing: upgrade button orange, width fit | done | |
| **Admin Activity redesigned** (light sheet): hero time-window slider (7/30/90/All), KPIs (signups, copies, CLI+MCP, saves, template views, revenue – super admins only), installs & copies by day (same chart), by source, plans, today, top effects (copied/installed/saved), top users (installs/copies → per-user page), templates (views, sales, conversion), recent installs & copies (search, source, pages) | done | `/api/admin/installs` adds `sourceTrend`; `/api/admin/activity/overview` adds `templateStats` (paid, non-credit sales per template). Removed now-unused `InstallActivityTab.js`, `TemplateRankSlider.jsx`, `DonutChart.jsx` |
| Verify | done | lint, 478 tests, Playwright (user pages, admin activity 1440 + 390), console clean |

## Iteration 2.3 – filters, overview, copy sources (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Dropdown filters: no counts; trigger has a fixed width and the open panel matches it (also the fixed mobile panel) | done | `FilterMenu` opt-in `widthClassName`; `FILTER_WIDTH` in `DashboardUI.jsx`; used by date, categories, industries, owned/saved |
| My templates: separate **Owned / Saved** filter (was folded into the date label); date filter now just "Date" | done | |
| "14 of 14 saved" / "2 of 2 templates": shown count big and dark | done | `FilteredCount` |
| Settings: "Download my data" removed (and `/api/user/export`); only Delete account under Privacy & data | done | |
| Overview (everyone): today's usage moved out of the hero into a dark **Daily usage** card → row is Daily usage · Installations · Saved (same as admin); plan + credits 50/50 | done | |
| **Copying a CLI command counts as a CLI install** (was always "web") | done | `/api/copy-usage` POST takes `source` (web/cli/mcp); effect cards, preview drawer, dashboard Usage table (`copyInstall` → cli); Get Code menu CLI/MCP options (cli/mcp); effect-page code blocks containing `hyperiux add` (cli) |
| Admin usage still empty for an admin account | explained | read-only DB check: **0** admin-logged events – the fix in 2.2 isn't deployed; the live site still runs the old code. Shows from the first copy after deploy |
| Verify | done | lint, 478 tests, Playwright (overview, templates + saved menus, settings) |

## Iteration 3 – templates merged, admin side completed (done 2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Filter labels: descenders (g, y) no longer clipped | done | `FilterMenu` fixed-width label gets a normal line height |
| My templates: owned + saved in **one grid**; the filter decides (All templates / Owned = can download / Saved = liked); date = when it became yours or when saved | done | `MyTemplates.jsx` (same for admins' user view) |
| **Admin Users** in the new design: header actions (Export CSV, Email log, Invite), 4 KPIs, search + plan / role / sort dropdowns + Joined date filter, light table (avatar, role tag, plan badge, Web / CLI / MCP, saves, valid until + payment ID + Manage for super admins), per-page + pager | done | Invite + Manage dialogs and every fetch / export / update kept as they were |
| **Admin Invoicing** in the new design: KPIs (subscription revenue per currency, subscriptions, template revenue, template sales), Ledger with Subscriptions / Templates switch, template filter, Paid date filter, receipts (Razorpay invoice or payment) | done | rewritten; `TemplatePurchasesPanel` folded in |
| **Per-user page** (`admin/activity/{user}`) in the new design: profile card + back + date filter, KPIs incl. lifetime spend per currency and last sign-in, installs & copies by day (shared chart), effects (Saved / Copied / Installed), purchased templates (site TemplateCard), one Payments list | done | |
| Removed, now unused | done | `TemplatePurchasesPanel`, `DashboardSkeleton`, `BarRankChart`, `LineTrendChart`, `ChartTheme`, `EffectRankSlider`, admin `StatCard`, old `components/ui/TemplateCard`. **`recharts` and `jspdf` are now unused dependencies** |
| Dev preview samples | done | `sampleAdminUsers`, `sampleAdminInvoicing`, `sampleAdminUser` |
| Verify | done | lint, 478 tests, Playwright (users, invoicing, per-user page, templates) |

## Iteration 3.1 – listing gaps, grid timing, sidebar plan card (2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Saved + My templates grids use exactly the listings' spacing and widths | done | shared `EFFECT_GRID`, `EFFECT_GRID_COLS`, `TEMPLATE_GRID`, `TEMPLATE_CARD_WIDTH` in `templates/tokens.js` (listings import them too) |
| Grid switch speed | measured | Playwright timings: 2→3 settles ~0.73s on both /effects and Saved (both close the sidebar first, cards grow then shrink); 3→2 ~0.5s on both. Same hook + same motion transition now |
| Sidebar plan card on dashboard pages: plan · cycle, days left, period progress bar, next step (Pro → Upgrade to Pro+, Free → Upgrade to Pro, Pro+ → Manage billing); none for admins; only while the sidebar is open, pinned at its foot | done | `layout/SidebarPlanCard.jsx`, `Sidebar.jsx`; `/api/user/plan?detail=1` (old callers unchanged). Disk full (150 MB free) – browser couldn't run |

## Iteration 3.2 – polish (2026-10-15)
| Step | Status | Files / notes |
|---|---|---|
| Link arrow in the text colour (the resting arrow was the 60%-opacity copy) | done | `LinkButton` arrowRight |
| Sidebar plan card in the site's language: dark card, plan + orange cycle, big days-left number, bar, site Button (outline for Pro+ "Manage billing") | done | `SidebarPlanCard.jsx` |
| Sidebar card: always mounted (data loads once, no wait on open); fades out in ~0.1s on close, fades in ~0.2s after the sidebar opens; content keeps the open width | done | measured with Playwright |
| No hover or movement sounds on the dashboard's light sheet | done | `data-sound-hover="off"` added next to `data-sound-flow="off"` |
| Settings: Email block removed (and `/api/user/email-preferences`, unused `Toggle`) | done | |
| Storage: npm cache (32 GB) + old Chromium 1187 cleared → 36 GB free; dev server needed a restart after the disk-full | done | |

## Iteration 4+ (next)
- Admin Email log page still has the old dark styling (reached from Users → Email log)
- Invoicing: "needs review" flags, GST columns + CA export, one merged ledger (needs a server-side merged query)
- Admin data layer: Postgres aggregates (selects of all rows hit PostgREST's 1000-row cap as data grows); previous-period deltas on KPIs
- Decide: what happens on a deletion request (manual vs automatic delete, retention), then automate if wanted; cancel-subscription flow
- Owned template cards: hide price for owned, show "Purchased · $39 / Redeemed with a credit"
- Remove unused deps `recharts`, `jspdf` (package.json)
- Check the profile dropdown and real data while signed in (needs a real session: Vercel preview or prod; Clerk live keys block localhost)
- Deploy: admin install recording (2.2) only shows on the live site after deploy

## Log
- 2026-10-15 – mockups moved; tracker created.
- 2026-10-15 – mockups deleted; tracker moved to `DASHBOARD_TRACKER.md`.
- 2026-10-15 – iteration 1 built and verified (see table).
- 2026-10-15 – iteration 1.1 overview feedback applied.
- 2026-10-15 – iteration 1.2: toggle size, recently saved tags/border/4 rows, dialog CTA removed.
- 2026-10-15 – iteration 1.3: usernames in URLs, listing-style filters on Saved + My templates, token dialog text, MCP line.
- 2026-10-15 – iteration 1.4: View More-style links (no shimmer), orange inline links, preset date dropdown, grid layout animation.
- 2026-10-15 – iteration 2: Usage, Invoicing, Settings in the new design.
- 2026-10-15 – iteration 3: templates in one grid, admin Users / Invoicing / per-user page redesigned, unused admin components removed.
- 2026-10-15 – iteration 2.3: matched-width filters, owned/saved filter, big counts, overview daily-usage card, CLI copies = CLI installs.
- 2026-10-15 – iteration 2.2: admin usage recording fix, readable chart + filter, overview/saved/templates/invoicing feedback, admin Activity redesign.
- 2026-10-15 – iteration 2.1: pm switch, installations card, admin unlimited block, local-day chart, copy animation, settings email + privacy.
